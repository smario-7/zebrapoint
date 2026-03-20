import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, tuple_
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.database import get_db
from app.models.admin_action import AdminAction
from app.models.comment import Comment
from app.models.message import Message
from app.models.post import Post
from app.models.report import Report
from app.models.user import User
from app.models.user_warning import UserWarning
from app.schemas.moderation import AdminActionOut, ModerationAction, ReportOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/reports", response_model=list[ReportOut], summary="Kolejka zgłoszeń (admin)")
def list_reports(
    status_filter: str = "pending",
    target_type: str | None = None,
    limit: int = 50,
    offset: int = 0,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Report)
    if status_filter != "all":
        query = query.filter(Report.status == status_filter)
    if target_type:
        query = query.filter(Report.target_type == target_type)

    reports = query.order_by(Report.created_at.desc()).offset(offset).limit(limit).all()
    if not reports:
        return []

    pair_rows = (
        db.query(Report.target_type, Report.target_id, func.count(Report.id).label("cnt"))
        .filter(
            tuple_(
                Report.target_type,
                Report.target_id,
            ).in_([(report.target_type, report.target_id) for report in reports])
        )
        .group_by(Report.target_type, Report.target_id)
        .all()
    )
    report_counts = {(row.target_type, row.target_id): row.cnt for row in pair_rows}

    target_type_to_ids: dict[str, set[UUID]] = {"post": set(), "comment": set(), "message": set(), "user": set()}
    for report in reports:
        if report.target_type in target_type_to_ids:
            target_type_to_ids[report.target_type].add(report.target_id)

    previews = _build_preview_maps(db, target_type_to_ids)

    return [
        ReportOut(
            id=report.id,
            reporter_id=report.reporter_id,
            reporter_name=report.reporter.display_name if report.reporter else "",
            target_type=report.target_type,
            target_id=report.target_id,
            reason=report.reason,
            description=report.description,
            status=report.status,
            created_at=report.created_at,
            target_preview=previews.get((report.target_type, report.target_id)),
            report_count=report_counts.get((report.target_type, report.target_id), 1),
        )
        for report in reports
    ]


@router.get("/reports/stats", summary="Statystyki zgłoszeń")
def report_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = db.query(Report.status, func.count(Report.id).label("cnt")).group_by(Report.status).all()
    stats = {row.status: row.cnt for row in rows}
    return {
        "pending": stats.get("pending", 0),
        "reviewed": stats.get("reviewed", 0),
        "dismissed": stats.get("dismissed", 0),
        "total": sum(stats.values()),
    }


@router.post("/reports/{report_id}/action", response_model=AdminActionOut, summary="Wykonaj akcję moderacyjną")
def take_action(
    report_id: str,
    data: ModerationAction,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        report_id_uuid = UUID(report_id)
    except ValueError:
        raise HTTPException(404, "Zgłoszenie nie istnieje")

    report = db.query(Report).filter(Report.id == report_id_uuid).first()
    if not report:
        raise HTTPException(404, "Zgłoszenie nie istnieje")
    if report.status != "pending":
        raise HTTPException(400, "Zgłoszenie zostało już rozpatrzone")

    target_user = _get_content_author(db, report.target_type, report.target_id)
    target_user_id = target_user.id if target_user else None

    expires_at = None
    if data.action_type == "ban_temp":
        ban_hours = data.ban_hours or 24
        expires_at = datetime.now(timezone.utc) + timedelta(hours=ban_hours)

    if data.action_type == "warn" and target_user:
        warning_msg = data.warning_message or "Twoja treść naruszała zasady społeczności."
        warning = UserWarning(
            user_id=target_user.id,
            admin_id=admin.id,
            message=warning_msg,
            report_id=report.id,
        )
        db.add(warning)
    elif data.action_type == "delete_content":
        _delete_reported_content(db, report.target_type, report.target_id)
    elif data.action_type in ("ban_temp", "ban_permanent"):
        if not target_user:
            raise HTTPException(400, "Nie można zidentyfikować autora treści")
        _delete_reported_content(db, report.target_type, report.target_id)
        target_user.is_banned = True
        target_user.ban_reason = data.reason or "naruszenie regulaminu"
        target_user.banned_until = expires_at if data.action_type == "ban_temp" else None

    report.status = "reviewed"
    report.reviewed_by = admin.id
    report.reviewed_at = datetime.now(timezone.utc)

    action = AdminAction(
        admin_id=admin.id,
        target_user_id=target_user_id,
        report_id=report.id,
        action_type=data.action_type,
        reason=data.reason,
        expires_at=expires_at,
    )
    db.add(action)
    db.commit()
    db.refresh(action)

    return AdminActionOut(
        id=action.id,
        admin_id=action.admin_id,
        admin_name=admin.display_name,
        target_user_id=action.target_user_id,
        target_user_name=target_user.display_name if target_user else None,
        report_id=action.report_id,
        action_type=action.action_type,
        reason=action.reason,
        expires_at=action.expires_at,
        created_at=action.created_at,
    )


def _build_preview_maps(
    db: Session,
    target_type_to_ids: dict[str, set[UUID]],
) -> dict[tuple[str, UUID], str]:
    previews: dict[tuple[str, UUID], str] = {}

    post_ids = list(target_type_to_ids["post"])
    if post_ids:
        posts = db.query(Post).filter(Post.id.in_(post_ids)).all()
        for post in posts:
            content = (post.content or "")[:150]
            previews[("post", post.id)] = f"[Post] {post.title}: {content}..."

    comment_ids = list(target_type_to_ids["comment"])
    if comment_ids:
        comments = db.query(Comment).filter(Comment.id.in_(comment_ids)).all()
        for comment in comments:
            previews[("comment", comment.id)] = f"[Komentarz] {(comment.content or '')[:200]}"

    message_ids = list(target_type_to_ids["message"])
    if message_ids:
        messages = db.query(Message).filter(Message.id.in_(message_ids)).all()
        for message in messages:
            previews[("message", message.id)] = f"[Wiadomość] {(message.content or '')[:200]}"

    user_ids = list(target_type_to_ids["user"])
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        for user in users:
            previews[("user", user.id)] = f"[Użytkownik] {user.display_name} ({user.email})"

    return previews


def _get_content_author(db: Session, target_type: str, target_id: UUID) -> User | None:
    try:
        if target_type == "post":
            post = db.query(Post).filter(Post.id == target_id).first()
            return db.query(User).filter(User.id == post.user_id).first() if post else None
        if target_type == "comment":
            comment = db.query(Comment).filter(Comment.id == target_id).first()
            return db.query(User).filter(User.id == comment.user_id).first() if comment else None
        if target_type == "message":
            message = db.query(Message).filter(Message.id == target_id).first()
            return db.query(User).filter(User.id == message.user_id).first() if message else None
        if target_type == "user":
            return db.query(User).filter(User.id == target_id).first()
    except Exception as exc:
        logger.warning("Nie udało się odczytać autora zgłoszonej treści: %s", exc)
    return None


def _delete_reported_content(db: Session, target_type: str, target_id: UUID) -> bool:
    try:
        if target_type == "post":
            obj = db.query(Post).filter(Post.id == target_id).first()
        elif target_type == "comment":
            obj = db.query(Comment).filter(Comment.id == target_id).first()
        elif target_type == "message":
            obj = db.query(Message).filter(Message.id == target_id).first()
        else:
            return False
        if obj:
            db.delete(obj)
            return True
    except Exception as exc:
        logger.warning("Nie udało się usunąć zgłoszonej treści: %s", exc)
    return False
