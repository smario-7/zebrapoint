from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_active_user
from app.database import get_db
from app.models.report import Report
from app.models.user import User
from app.schemas.moderation import ReportCreate

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    summary="Zgłoś treść do moderacji"
)
def create_report(
    data: ReportCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Użytkownik zgłasza treść (wiadomość, post, komentarz lub użytkownika).
    Jeden user może zgłosić ten sam target tylko raz. Zbanowany nie może zgłaszać.
    """
    if getattr(current_user, "is_banned", False):
        raise HTTPException(403, "Twoje konto jest zablokowane")

    existing = db.query(Report).filter(
        Report.reporter_id == current_user.id,
        Report.target_type == data.target_type,
        Report.target_id == data.target_id
    ).first()

    if existing:
        return {"message": "Zgłoszenie przyjęte. Dziękujemy."}

    report = Report(
        reporter_id=current_user.id,
        target_type=data.target_type,
        target_id=data.target_id,
        reason=data.reason,
        description=data.description,
        status="pending"
    )
    db.add(report)
    db.commit()

    db.query(func.count(Report.id)).filter(
        Report.target_type == data.target_type,
        Report.target_id == data.target_id,
        Report.status == "pending"
    ).scalar()

    return {"message": "Zgłoszenie przyjęte. Dziękujemy."}
