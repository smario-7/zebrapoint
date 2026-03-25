import json
from collections import deque
from pathlib import Path

import redis as redis_lib
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.config import settings
from app.database import get_db
from app.models.ml_pipeline_run import MlPipelineRun
from app.models.user import User
from app.services.ai_token_metrics import read_daily_history, read_token_totals
from app.services.group_ai_description import MODEL as OPENAI_GROUP_MODEL
from app.services.ml_pipeline import get_ml_pipeline_public_config
from app.tasks.celery_app import celery_app

router = APIRouter(prefix="/admin/monitoring", tags=["Admin"])


def _redis_client():
    return redis_lib.from_url(settings.redis_url, decode_responses=True)


@router.get("/ml")
def monitoring_ml(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    runs = (
        db.query(MlPipelineRun)
        .order_by(MlPipelineRun.run_at.desc())
        .limit(20)
        .all()
    )
    return {
        "parameters": get_ml_pipeline_public_config(db),
        "openai_model_group_descriptions": OPENAI_GROUP_MODEL,
        "runs": [
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
        ],
    }


@router.get("/ai")
def monitoring_ai(admin: User = Depends(require_admin)):
    try:
        r = _redis_client()
        r.ping()
    except Exception as exc:
        raise HTTPException(503, f"Redis niedostępny: {exc}") from exc

    return {
        "model": OPENAI_GROUP_MODEL,
        "totals": read_token_totals(r),
        "daily": read_daily_history(r, days=30),
    }


@router.get("/system")
def monitoring_system(admin: User = Depends(require_admin)):
    redis_block: dict = {"connected": False, "error": None, "info": {}}
    try:
        r = _redis_client()
        redis_block["connected"] = bool(r.ping())
        info = r.info()
        redis_block["info"] = {
            "redis_version": info.get("redis_version"),
            "uptime_in_seconds": info.get("uptime_in_seconds"),
            "connected_clients": info.get("connected_clients"),
            "used_memory_human": info.get("used_memory_human"),
            "used_memory_peak_human": info.get("used_memory_peak_human"),
            "total_keys_db0": r.dbsize(),
        }
    except Exception as exc:
        redis_block["error"] = str(exc)

    celery_block: dict = {"workers_reachable": False, "active": [], "scheduled": [], "error": None}
    try:
        insp = celery_app.control.inspect(timeout=1.0)
        if insp is None:
            celery_block["error"] = "Brak obiektu inspect (broker niedostępny?)"
        else:
            active = insp.active()
            scheduled = insp.scheduled()
            celery_block["workers_reachable"] = active is not None or scheduled is not None
            if not celery_block["workers_reachable"]:
                celery_block["error"] = (
                    "Żaden worker Celery nie odpowiedział na inspect (uruchom workerów)"
                )
            if active:
                for worker, tasks in active.items():
                    for t in tasks or []:
                        celery_block["active"].append(
                            {
                                "worker": worker,
                                "name": t.get("name"),
                                "id": t.get("id"),
                                "args": t.get("args"),
                                "kwargs": t.get("kwargs"),
                            }
                        )
            if scheduled:
                for worker, tasks in scheduled.items():
                    for entry in tasks or []:
                        req = entry.get("request") or {}
                        celery_block["scheduled"].append(
                            {
                                "worker": worker,
                                "name": req.get("name"),
                                "id": req.get("id"),
                                "eta": entry.get("eta"),
                            }
                        )
    except Exception as exc:
        celery_block["error"] = str(exc)

    return {"redis": redis_block, "celery": celery_block}


def _tail_lines(path: Path, lines: int) -> list[str]:
    if not path.is_file():
        return []
    with path.open("r", encoding="utf-8", errors="replace") as f:
        return [line.rstrip("\n\r") for line in deque(f, maxlen=lines)]


def _tail_jsonl_objects(path: Path, max_entries: int) -> list[dict]:
    if not path.is_file():
        return []
    with path.open("r", encoding="utf-8", errors="replace") as f:
        raw_lines = list(deque(f, maxlen=max_entries))
    out: list[dict] = []
    for line in raw_lines:
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return out


def _flatten_celery_history(snapshots: list[dict]) -> list[dict]:
    rows: list[dict] = []
    for snap in reversed(snapshots):
        ts = snap.get("ts")
        err = snap.get("error")
        workers = snap.get("workers") or []
        if not workers:
            rows.append(
                {
                    "ts": ts,
                    "worker": None,
                    "processed": None,
                    "active": None,
                    "snapshot_error": err,
                }
            )
            continue
        for w in workers:
            rows.append(
                {
                    "ts": ts,
                    "worker": w.get("worker"),
                    "processed": w.get("processed"),
                    "active": w.get("active"),
                    "snapshot_error": None,
                }
            )
    return rows


@router.get("/stats-history")
def monitoring_stats_history(
    admin: User = Depends(require_admin),
    entries: int = Query(48, ge=1, le=500),
):
    base = settings.resolved_log_dir() / "snapshots"
    redis_snaps = _tail_jsonl_objects(base / "redis_stats.jsonl", entries)
    redis_snaps.reverse()
    celery_snaps = _tail_jsonl_objects(base / "celery_stats.jsonl", entries)
    return {
        "redis": redis_snaps,
        "celery": _flatten_celery_history(celery_snaps),
    }


@router.get("/logs")
def monitoring_logs(
    admin: User = Depends(require_admin),
    lines: int = Query(200, ge=1, le=2000),
):
    base = settings.resolved_log_dir()
    return {
        "backend": _tail_lines(base / "backend.log", lines),
        "celery": _tail_lines(base / "celery.log", lines),
        "redis": _tail_lines(base / "redis.log", lines),
    }
