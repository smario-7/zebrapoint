import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.symptom_profile import SymptomProfile
from app.schemas.symptom import SymptomCreate, SymptomOut, SymptomProfilePublic
from app.services.embedding_service import generate_embedding
from app.services.matching_service import find_matching_group, add_user_to_group

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/symptoms", tags=["Symptoms"])


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

    profile = SymptomProfile(
        user_id=current_user.id,
        description=data.description,
        embedding=embedding,
        group_id=match["group_id"],
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

    profile.description = data.description
    profile.embedding   = embedding
    profile.group_id    = match["group_id"]
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
