from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["Admin"])


def require_admin(current_user: User = Depends(get_current_user)):
    if getattr(current_user, "role", None) != "admin":
        raise HTTPException(status_code=403, detail="Wymagane uprawnienia admina")
    return current_user


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
