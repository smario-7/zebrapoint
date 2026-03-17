from datetime import datetime, timezone, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.database import get_db
from app.models.user import User
from app.models.report import Report
from app.models.admin_action import AdminAction
from app.models.user_warning import UserWarning
from app.models.post import Post
from app.models.comment import Comment
from app.models.message import Message
from app.schemas.moderation import (
    ReportOut,
    ModerationAction,
    AdminActionOut,
    UserModerationStatus,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Redis (Sprint 6) ─────────────────────────────────────────────

@router.get("/redis/ping")
def redis_ping(admin: User = Depends(require_admin)):
    """Sprawdza czy Redis odpowiada."""
    import redis as redis_lib
    from app.config import settings
    try:
        r = redis_lib.from_url(settings.redis_url)
        pong = r.ping()
        info = r.info("server")
        return {
            "connected": pong,
            "redis_version": info.get("redis_version"),
            "used_memory_human": info.get("used_memory_human")
        }
    except Exception as e:
        raise HTTPException(503, f"Redis niedostępny: {str(e)}")


# ── ML Pipeline (Sprint 7) ──────────────────────────────────────

@router.post("/retrain")
def trigger_retrain(admin: User = Depends(require_admin)):
    """Wymuszony retrain klastrów ML — kolejkuje zadanie."""
    from app.tasks.ml_tasks import retrain_clusters
    task = retrain_clusters.apply_async(queue="ml")
    return {
        "message": "Retrain zakolejkowany",
        "task_id": task.id,
        "status": "queued"
    }


@router.get("/pipeline/status")
def pipeline_status(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Historia ostatnich 10 uruchomień ML pipeline."""
    from app.models.ml_pipeline_run import MlPipelineRun
    runs = (
        db.query(MlPipelineRun)
        .order_by(MlPipelineRun.run_at.desc())
        .limit(10)
        .all()
    )
    return [
        {
            "id": str(r.id),
            "run_at": r.run_at.isoformat(),
            "status": r.status,
            "profiles_count": r.profiles_count,
            "clusters_found": r.clusters_found,
            "noise_count": r.noise_count,
            "reassigned": r.reassigned,
            "duration_ms": r.duration_ms,
            "error_message": r.error_message,
        }
        for r in runs
    ]


@router.get("/tasks/{task_id}")
def get_task_status(
    task_id: str,
    admin: User = Depends(require_admin)
):
    """Status zadania Celery po task_id."""
    from app.tasks.celery_app import celery_app
    result = celery_app.AsyncResult(task_id)
    return {
        "task_id": task_id,
        "status": result.status,
        "result": result.result if result.ready() else None
    }


# ── Grupy ────────────────────────────────────────────────────────

@router.get("/groups")
def list_all_groups(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Lista wszystkich aktywnych grup z charakterystykami."""
    from app.models.group import Group
    groups = (
        db.query(Group)
        .filter(Group.is_active == True)
        .order_by(Group.member_count.desc())
        .all()
    )
    return [
        {
            "id": str(g.id),
            "name": g.name,
            "member_count": g.member_count,
            "keywords": g.keywords,
            "symptom_category": g.symptom_category,
            "age_range": g.age_range,
            "avg_match_score": g.avg_match_score,
            "admin_note": g.admin_note,
            "accent_color": g.accent_color,
        }
        for g in groups
    ]


class GroupNoteUpdate(BaseModel):
    admin_note: str | None


@router.patch("/groups/{group_id}/note")
def update_group_note(
    group_id: str,
    data: GroupNoteUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin dodaje lub aktualizuje notę do grupy."""
    from datetime import datetime, timezone
    from app.models.group import Group

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(404, "Grupa nie istnieje")

    group.admin_note = data.admin_note
    group.admin_note_by = admin.id
    group.admin_note_at = datetime.now(timezone.utc)
    db.commit()

    return {"group_id": group_id, "admin_note": group.admin_note}


# ── Kolejka zgłoszeń i moderacja (Sprint 10) ──────────────────────

@router.get(
    "/reports",
    response_model=list[ReportOut],
    summary="Kolejka zgłoszeń (admin)"
)
def list_reports(
    status_filter: str = "pending",
    target_type: str | None = None,
    limit: int = 50,
    offset: int = 0,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Report)
    if status_filter != "all":
        query = query.filter(Report.status == status_filter)
    if target_type:
        query = query.filter(Report.target_type == target_type)
    reports = (
        query.order_by(Report.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    result = []
    for r in reports:
        preview = _get_content_preview(db, r.target_type, r.target_id)
        count = db.query(func.count(Report.id)).filter(
            Report.target_type == r.target_type,
            Report.target_id == r.target_id
        ).scalar()
        result.append(ReportOut(
            id=r.id,
            reporter_id=r.reporter_id,
            reporter_name=r.reporter.display_name if r.reporter else "",
            target_type=r.target_type,
            target_id=r.target_id,
            reason=r.reason,
            description=r.description,
            status=r.status,
            created_at=r.created_at,
            target_preview=preview,
            report_count=count or 1
        ))
    return result


@router.get("/reports/stats", summary="Statystyki zgłoszeń")
def report_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    rows = db.query(Report.status, func.count(Report.id).label("cnt")).group_by(Report.status).all()
    stats = {row.status: row.cnt for row in rows}
    return {
        "pending": stats.get("pending", 0),
        "reviewed": stats.get("reviewed", 0),
        "dismissed": stats.get("dismissed", 0),
        "total": sum(stats.values())
    }


@router.post(
    "/reports/{report_id}/action",
    response_model=AdminActionOut,
    summary="Wykonaj akcję moderacyjną"
)
def take_action(
    report_id: str,
    data: ModerationAction,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
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

    if data.action_type == "dismiss":
        pass
    elif data.action_type == "warn":
        if target_user:
            warning_msg = data.warning_message or "Twoja treść naruszała zasady społeczności."
            warning = UserWarning(
                user_id=target_user.id,
                admin_id=admin.id,
                message=warning_msg,
                report_id=report.id
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
        if data.action_type == "ban_temp":
            hours = data.ban_hours or 24
            target_user.banned_until = datetime.now(timezone.utc) + timedelta(hours=hours)
        else:
            target_user.banned_until = None

    report.status = "reviewed"
    report.reviewed_by = admin.id
    report.reviewed_at = datetime.now(timezone.utc)

    expires_at = None
    if data.action_type == "ban_temp" and data.ban_hours:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=data.ban_hours)

    action = AdminAction(
        admin_id=admin.id,
        target_user_id=target_user_id,
        report_id=report.id,
        action_type=data.action_type,
        reason=data.reason,
        expires_at=expires_at
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
        created_at=action.created_at
    )


@router.get(
    "/users",
    response_model=list[UserModerationStatus],
    summary="Lista użytkowników (admin)"
)
def list_users(
    search: str | None = None,
    is_banned: bool | None = None,
    limit: int = 50,
    offset: int = 0,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if search:
        query = query.filter(
            User.display_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        )
    if is_banned is not None:
        query = query.filter(User.is_banned == is_banned)
    users = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()
    result = []
    for u in users:
        warning_count = db.query(func.count(UserWarning.id)).filter(UserWarning.user_id == u.id).scalar() or 0
        report_count = db.query(func.count(Report.id)).filter(
            Report.target_type == "user", Report.target_id == u.id
        ).scalar() or 0
        result.append(UserModerationStatus(
            user_id=u.id,
            display_name=u.display_name,
            email=u.email,
            role=u.role,
            is_banned=getattr(u, "is_banned", False),
            banned_until=getattr(u, "banned_until", None),
            ban_reason=getattr(u, "ban_reason", None),
            warning_count=warning_count,
            report_count=report_count
        ))
    return result


@router.post("/users/{user_id}/unban", summary="Odbanuj użytkownika")
def unban_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Użytkownik nie istnieje")
    user.is_banned = False
    user.banned_until = None
    user.ban_reason = None
    db.commit()
    action = AdminAction(
        admin_id=admin.id,
        target_user_id=user.id,
        action_type="unban",
        reason="Manualne odbanowanie przez admina"
    )
    db.add(action)
    db.commit()
    return {"message": f"Użytkownik {user.display_name} odbanowany"}


@router.get("/users/{user_id}/history", summary="Historia akcji moderacyjnych dla usera")
def user_moderation_history(
    user_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
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
            "is_banned": getattr(user, "is_banned", False),
            "banned_until": user.banned_until.isoformat() if getattr(user, "banned_until", None) else None,
        },
        "warnings": [{"id": str(w.id), "message": w.message, "created_at": w.created_at.isoformat()} for w in warnings],
        "actions": [
            {
                "id": str(a.id),
                "action_type": a.action_type,
                "reason": a.reason,
                "expires_at": a.expires_at.isoformat() if a.expires_at else None,
                "created_at": a.created_at.isoformat()
            }
            for a in actions
        ]
    }


def _get_content_preview(db: Session, target_type: str, target_id: UUID) -> str | None:
    try:
        if target_type == "post":
            obj = db.query(Post).filter(Post.id == target_id).first()
            if obj:
                content = (obj.content or "")[:150]
                return f"[Post] {obj.title}: {content}..."
        elif target_type == "comment":
            obj = db.query(Comment).filter(Comment.id == target_id).first()
            if obj:
                return f"[Komentarz] {(obj.content or '')[:200]}"
        elif target_type == "message":
            obj = db.query(Message).filter(Message.id == target_id).first()
            if obj:
                return f"[Wiadomość] {(obj.content or '')[:200]}"
        elif target_type == "user":
            obj = db.query(User).filter(User.id == target_id).first()
            if obj:
                return f"[Użytkownik] {obj.display_name} ({obj.email})"
    except Exception:
        pass
    return None


def _get_content_author(db: Session, target_type: str, target_id: UUID) -> User | None:
    try:
        if target_type == "post":
            obj = db.query(Post).filter(Post.id == target_id).first()
            return db.query(User).filter(User.id == obj.user_id).first() if obj else None
        if target_type == "comment":
            obj = db.query(Comment).filter(Comment.id == target_id).first()
            return db.query(User).filter(User.id == obj.user_id).first() if obj else None
        if target_type == "message":
            obj = db.query(Message).filter(Message.id == target_id).first()
            return db.query(User).filter(User.id == obj.user_id).first() if obj else None
        if target_type == "user":
            return db.query(User).filter(User.id == target_id).first()
    except Exception:
        pass
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
    except Exception:
        pass
    return False


# ── Forum Moderation (Sprint 8) ───────────────────────────────────

class PostModerationUpdate(BaseModel):
    is_pinned: bool | None = None
    is_locked: bool | None = None


@router.patch("/posts/{post_id}/moderate")
def moderate_post(
    post_id: str,
    data:    PostModerationUpdate,
    admin:   User = Depends(require_admin),
    db:      Session = Depends(get_db)
):
    """
    Admin może:
    - Przypiąć post (is_pinned=True) — pojawi się na górze listy
    - Zablokować post (is_locked=True) — brak nowych komentarzy
    """
    from app.models.post import Post

    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post nie istnieje")

    if data.is_pinned is not None:
        post.is_pinned = data.is_pinned
    if data.is_locked is not None:
        post.is_locked = data.is_locked

    db.commit()
    return {
        "post_id":   post_id,
        "is_pinned": post.is_pinned,
        "is_locked": post.is_locked
    }
