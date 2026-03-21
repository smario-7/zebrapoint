from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.database import get_db
from app.models.admin_action import AdminAction
from app.models.report import Report
from app.models.user import User
from app.models.user_warning import UserWarning
from app.schemas.moderation import UserModerationStatus

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users", response_model=list[UserModerationStatus], summary="Lista użytkowników (admin)")
def list_users(
    search: str | None = None,
    is_banned: bool | None = None,
    limit: int = 50,
    offset: int = 0,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if search:
        query = query.filter(User.display_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%"))
    if is_banned is not None:
        query = query.filter(User.is_banned == is_banned)

    users = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()
    if not users:
        return []

    user_ids = [user.id for user in users]
    warning_rows = (
        db.query(UserWarning.user_id, func.count(UserWarning.id).label("cnt"))
        .filter(UserWarning.user_id.in_(user_ids))
        .group_by(UserWarning.user_id)
        .all()
    )
    report_rows = (
        db.query(Report.target_id, func.count(Report.id).label("cnt"))
        .filter(Report.target_type == "user", Report.target_id.in_(user_ids))
        .group_by(Report.target_id)
        .all()
    )

    warning_counts = {row.user_id: row.cnt for row in warning_rows}
    report_counts = {row.target_id: row.cnt for row in report_rows}

    return [
        UserModerationStatus(
            user_id=user.id,
            display_name=user.display_name,
            email=user.email,
            role=user.role,
            is_banned=user.is_banned,
            banned_until=user.banned_until,
            ban_reason=user.ban_reason,
            warning_count=warning_counts.get(user.id, 0),
            report_count=report_counts.get(user.id, 0),
        )
        for user in users
    ]


@router.post("/users/{user_id}/unban", summary="Odbanuj użytkownika")
def unban_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Użytkownik nie istnieje")

    user.is_banned = False
    user.banned_until = None
    user.ban_reason = None
    action = AdminAction(
        admin_id=admin.id,
        target_user_id=user.id,
        action_type="unban",
        reason="Manualne odbanowanie przez admina",
    )
    db.add(action)
    db.commit()
    return {"message": f"Użytkownik {user.display_name} odbanowany"}


@router.get("/users/{user_id}/history", summary="Historia akcji moderacyjnych dla usera")
def user_moderation_history(
    user_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Użytkownik nie istnieje")

    warnings = db.query(UserWarning).filter(UserWarning.user_id == user_id).order_by(UserWarning.created_at.desc()).all()
    actions = db.query(AdminAction).filter(AdminAction.target_user_id == user_id).order_by(AdminAction.created_at.desc()).all()
    return {
        "user": {
            "id": str(user.id),
            "display_name": user.display_name,
            "email": user.email,
            "role": user.role,
            "is_banned": user.is_banned,
            "banned_until": user.banned_until.isoformat() if user.banned_until else None,
        },
        "warnings": [{"id": str(w.id), "message": w.message, "created_at": w.created_at.isoformat()} for w in warnings],
        "actions": [
            {
                "id": str(a.id),
                "action_type": a.action_type,
                "reason": a.reason,
                "expires_at": a.expires_at.isoformat() if a.expires_at else None,
                "created_at": a.created_at.isoformat(),
            }
            for a in actions
        ],
    }
