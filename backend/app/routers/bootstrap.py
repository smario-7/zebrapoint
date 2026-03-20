from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_active_user
from app.database import get_db
from app.models.dm_conversation import DmConversation
from app.models.group import Group
from app.models.symptom_profile import SymptomProfile
from app.models.user import User
from app.schemas.group import GroupOut
from app.schemas.symptom import SymptomProfilePublic
from app.schemas.user import UserOut

router = APIRouter(prefix="/bootstrap", tags=["Bootstrap"])


class BootstrapMeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user: UserOut
    symptoms_profile: SymptomProfilePublic | None
    my_group: GroupOut | None
    unread_count: int


@router.get(
    "/me",
    response_model=BootstrapMeOut,
    summary="Dane startowe dla aplikacji (1 request zamiast kilku)",
)
def bootstrap_me(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Endpoint do szybkiego startu frontendu.
    Zwraca paczkę danych często używanych w layoutach (sidebar/navbar).
    """
    profile = (
        db.query(SymptomProfile)
        .filter(SymptomProfile.user_id == current_user.id)
        .first()
    )

    group = None
    if profile and profile.group_id:
        group = db.query(Group).filter(Group.id == profile.group_id).first()

    unread_total = (
        db.query(
            func.coalesce(
                func.sum(
                    case(
                        (DmConversation.user_a_id == current_user.id, DmConversation.unread_count_a),
                        else_=0,
                    )
                    + case(
                        (DmConversation.user_b_id == current_user.id, DmConversation.unread_count_b),
                        else_=0,
                    )
                ),
                0,
            )
        )
        .scalar()
    )

    return {
        "user": UserOut.model_validate(current_user),
        "symptoms_profile": (
            SymptomProfilePublic.model_validate(profile) if profile else None
        ),
        "my_group": GroupOut.model_validate(group) if group else None,
        "unread_count": int(unread_total or 0),
    }

