import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from uuid import UUID

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.symptom_profile import SymptomProfile
from app.schemas.group import GroupOut, GroupMemberOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/groups", tags=["Groups"])


@router.get(
    "/me",
    response_model=GroupOut,
    summary="Moja aktualna grupa"
)
def get_my_group(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(SymptomProfile).filter(
        SymptomProfile.user_id == current_user.id
    ).first()

    if not profile or not profile.group_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nie należysz jeszcze do żadnej grupy. Najpierw wypełnij profil objawów."
        )

    group = db.query(Group).filter(Group.id == profile.group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grupa nie istnieje"
        )

    return group


@router.get(
    "/{group_id}",
    response_model=GroupOut,
    summary="Szczegóły grupy"
)
def get_group(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    membership = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.group_id == group_id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nie jesteś członkiem tej grupy"
        )

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupa nie istnieje")

    return group


@router.get(
    "/{group_id}/members",
    response_model=list[GroupMemberOut],
    summary="Członkowie grupy"
)
def get_group_members(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    membership = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.group_id == group_id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nie jesteś członkiem tej grupy"
        )

    members = (
        db.query(GroupMember)
        .options(joinedload(GroupMember.user))
        .filter(GroupMember.group_id == group_id)
        .order_by(GroupMember.joined_at)
        .all()
    )

    return [
        GroupMemberOut(
            user_id=m.user_id,
            display_name=m.user.display_name,
            joined_at=m.joined_at
        )
        for m in members
    ]
