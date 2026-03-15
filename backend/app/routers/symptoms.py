import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.symptom_profile import SymptomProfile
from app.schemas.symptom import (
    SymptomCreate,
    SymptomOut,
    SymptomProfilePublic,
    SymptomUpdate,
    SymptomUpdateResponse,
    GroupMatchOut,
    GroupChoiceRequest,
)
from app.services.embedding_service import generate_embedding
from app.services.matching_service import (
    find_matching_group,
    add_user_to_group,
    find_top_matches,
    assign_user_to_group,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/symptoms", tags=["Symptoms"])


def _ensure_uuid(value):
    """Konwertuje string na UUID - obsługuje też już istniejące UUID."""
    if isinstance(value, str):
        return UUID(value)
    return value


@router.post(
    "/",
    response_model=SymptomOut,
    status_code=status.HTTP_201_CREATED,
    summary="Zapisz opis objawów i dopasuj do grupy"
)
def create_symptom_profile(
    data: SymptomCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(SymptomProfile).filter(
        SymptomProfile.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Masz już profil objawów. Możesz go zaktualizować przez PUT /symptoms/me"
        )

    logger.info(f"Generuję embedding dla user {current_user.id}")

    embedding = generate_embedding(data.description)

    match = find_matching_group(db, embedding, current_user.id)
    group_id = _ensure_uuid(match["group_id"])

    profile = SymptomProfile(
        user_id=current_user.id,
        description=data.description,
        embedding=embedding,
        group_id=group_id,
        match_score=match["score"]
    )
    db.add(profile)

    add_user_to_group(db, current_user.id, match["group_id"])

    db.commit()
    db.refresh(profile)

    logger.info(
        f"Profil zapisany. User {current_user.id} → "
        f"grupa {match['group_id']} (score={match['score']:.4f})"
    )

    return SymptomOut(
        id=profile.id,
        user_id=profile.user_id,
        description=profile.description,
        group_id=profile.group_id,
        match_score=profile.match_score,
        created_at=profile.created_at,
        match=match
    )


@router.get(
    "/me",
    response_model=SymptomProfilePublic,
    summary="Mój profil objawów"
)
def get_my_symptom_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(SymptomProfile).filter(
        SymptomProfile.user_id == current_user.id
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nie masz jeszcze profilu objawów"
        )
    return profile


@router.put(
    "/me",
    response_model=SymptomOut,
    summary="Zaktualizuj opis objawów"
)
def update_symptom_profile(
    data: SymptomCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(SymptomProfile).filter(
        SymptomProfile.user_id == current_user.id
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nie masz jeszcze profilu. Użyj POST /symptoms/"
        )

    embedding = generate_embedding(data.description)
    match = find_matching_group(db, embedding, current_user.id)
    group_id = _ensure_uuid(match["group_id"])

    profile.description = data.description
    profile.embedding   = embedding
    profile.group_id    = group_id
    profile.match_score = match["score"]

    add_user_to_group(db, current_user.id, match["group_id"])

    db.commit()
    db.refresh(profile)

    return SymptomOut(
        id=profile.id,
        user_id=profile.user_id,
        description=profile.description,
        group_id=profile.group_id,
        match_score=profile.match_score,
        created_at=profile.created_at,
        match=match
    )


@router.patch(
    "/me",
    response_model=SymptomUpdateResponse,
    summary="Zaktualizuj opis objawów i przelicz dopasowania"
)
def update_symptoms_patch(
    data: SymptomUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Aktualizuje opis objawów i embedding. Nie zmienia grupy.
    Zwraca nowe TOP 3 dopasowań do wyboru przez użytkownika.
    """
    profile = db.query(SymptomProfile).filter(
        SymptomProfile.user_id == current_user.id
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brak profilu objawów — wypełnij formularz najpierw"
        )

    new_embedding = generate_embedding(data.description)
    profile.description = data.description
    profile.embedding = new_embedding
    db.commit()
    db.refresh(profile)

    embedding_list = (
        new_embedding.tolist()
        if hasattr(new_embedding, "tolist")
        else list(new_embedding)
    )
    matches = find_top_matches(
        db=db,
        embedding=embedding_list,
        exclude_user_id=str(current_user.id)
    )

    return SymptomUpdateResponse(
        profile_id=str(profile.id),
        description=profile.description,
        matches=[
            GroupMatchOut(
                group_id=m.group_id,
                name=m.name,
                accent_color=m.accent_color,
                score_pct=m.score_pct,
                member_count=m.member_count,
                avg_match_score=m.avg_match_score,
                keywords=m.keywords,
                age_range=m.age_range,
                symptom_category=m.symptom_category,
                admin_note=m.admin_note,
                is_new_group=m.is_new_group,
            )
            for m in matches
        ]
    )


@router.get(
    "/my-matches",
    response_model=list[GroupMatchOut],
    summary="TOP 3 dopasowań dla mojego profilu"
)
def get_my_matches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Zwraca aktualne TOP 3 grup dopasowanych do opisu użytkownika."""
    profile = db.query(SymptomProfile).filter(
        SymptomProfile.user_id == current_user.id
    ).first()

    if not profile or profile.embedding is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brak profilu objawów"
        )

    embedding_list = (
        profile.embedding.tolist()
        if hasattr(profile.embedding, "tolist")
        else list(profile.embedding)
    )
    matches = find_top_matches(
        db=db,
        embedding=embedding_list,
        exclude_user_id=str(current_user.id)
    )

    return [
        GroupMatchOut(
            group_id=m.group_id,
            name=m.name,
            accent_color=m.accent_color,
            score_pct=m.score_pct,
            member_count=m.member_count,
            avg_match_score=m.avg_match_score,
            keywords=m.keywords,
            age_range=m.age_range,
            symptom_category=m.symptom_category,
            admin_note=m.admin_note,
            is_new_group=m.is_new_group,
        )
        for m in matches
    ]


@router.post(
    "/choose-group",
    status_code=status.HTTP_200_OK,
    summary="Przypisz mnie do wybranej grupy"
)
def choose_group(
    data: GroupChoiceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Przypisuje użytkownika do grupy wybranej z listy TOP 3."""
    if data.group_id == "__new__":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nie można wybrać tworzenia nowej grupy. Wybierz jedną z proponowanych grup.",
        )
    profile = db.query(SymptomProfile).filter(
        SymptomProfile.id == data.profile_id,
        SymptomProfile.user_id == current_user.id
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil nie istnieje"
        )

    group = assign_user_to_group(
        db=db,
        user_id=str(current_user.id),
        group_id=data.group_id,
        profile_id=data.profile_id,
        match_score=data.score
    )

    return {
        "group_id": str(group.id),
        "group_name": group.name,
    }
