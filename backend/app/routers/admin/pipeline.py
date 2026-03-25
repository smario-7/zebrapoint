from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.config import settings
from app.database import get_db
from app.models.ml_admin_settings import MlAdminSettings
from app.models.ml_pipeline_run import MlPipelineRun
from app.models.user import User
from app.schemas.admin_ml import MlSettingsResponse, MlSettingsUpdate
from app.tasks.celery_app import celery_app
from app.tasks.ml_tasks import retrain_clusters

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/redis/ping")
def redis_ping(admin: User = Depends(require_admin)):
    """Sprawdza czy Redis odpowiada."""
    import redis as redis_lib

    try:
        redis_client = redis_lib.from_url(settings.redis_url)
        pong = redis_client.ping()
        info = redis_client.info("server")
        return {
            "connected": pong,
            "redis_version": info.get("redis_version"),
            "used_memory_human": info.get("used_memory_human"),
        }
    except Exception as e:
        raise HTTPException(503, f"Redis niedostępny: {str(e)}")


@router.patch("/ml/settings", response_model=MlSettingsResponse)
def patch_ml_settings(
    body: MlSettingsUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Zapis pragu nowych profili do automatycznego retrainu."""
    row = db.get(MlAdminSettings, 1)
    if row is None:
        row = MlAdminSettings(id=1, retrain_every_n=body.retrain_trigger_new_profiles)
        db.add(row)
    else:
        row.retrain_every_n = body.retrain_trigger_new_profiles
    db.commit()
    db.refresh(row)
    return MlSettingsResponse(
        retrain_trigger_new_profiles=row.retrain_every_n,
        updated_at=row.updated_at,
    )


@router.post("/retrain")
def trigger_retrain(admin: User = Depends(require_admin)):
    """Wymuszony retrain klastrów ML — kolejkuje zadanie."""
    task = retrain_clusters.apply_async(queue="ml")
    return {"message": "Retrain zakolejkowany", "task_id": task.id, "status": "queued"}


@router.get("/pipeline/status")
def pipeline_status(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Historia ostatnich 10 uruchomień ML pipeline."""
    runs = db.query(MlPipelineRun).order_by(MlPipelineRun.run_at.desc()).limit(10).all()
    return [
        {
            "id": str(run.id),
            "run_at": run.run_at.isoformat(),
            "status": run.status,
            "profiles_count": run.profiles_count,
            "clusters_found": run.clusters_found,
            "noise_count": run.noise_count,
            "reassigned": run.reassigned,
            "duration_ms": run.duration_ms,
            "error_message": run.error_message,
        }
        for run in runs
    ]


@router.get("/tasks/{task_id}")
def get_task_status(
    task_id: str,
    admin: User = Depends(require_admin),
):
    """Status zadania Celery po task_id."""
    result = celery_app.AsyncResult(task_id)
    return {"task_id": task_id, "status": result.status, "result": result.result if result.ready() else None}
