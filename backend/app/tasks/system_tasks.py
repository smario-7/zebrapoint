import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import redis as redis_lib

from app.config import settings
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

_JSONL_MAX_LINES = 1000


def _snapshots_dir() -> Path:
    d = settings.resolved_log_dir() / "snapshots"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _append_jsonl_rotating(path: Path, obj: dict, max_lines: int = _JSONL_MAX_LINES) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    lines: list[str] = []
    if path.is_file():
        with path.open("r", encoding="utf-8", errors="replace") as f:
            lines = f.read().splitlines()
    lines = lines[-(max_lines - 1) :]
    lines.append(json.dumps(obj, ensure_ascii=False))
    with path.open("w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def _celery_worker_snapshot(worker_name: str, s: dict) -> dict:
    total = s.get("total") if isinstance(s.get("total"), dict) else {}
    processed = None
    if isinstance(total, dict):
        processed = total.get("tasks.succeeded")
        if processed is None:
            processed = total.get("tasks.total")
    pool = s.get("pool") if isinstance(s.get("pool"), dict) else {}
    active = None
    writes = pool.get("writes") if isinstance(pool.get("writes"), dict) else {}
    inq = writes.get("inqueues") if isinstance(writes.get("inqueues"), dict) else {}
    if isinstance(inq, dict):
        active = inq.get("active")
    return {
        "worker": worker_name,
        "processed": processed,
        "active": active,
    }


@celery_app.task(name="app.tasks.system_tasks.save_system_snapshot")
def save_system_snapshot() -> dict:
    now = datetime.now(timezone.utc).isoformat()
    snap_dir = _snapshots_dir()
    redis_path = snap_dir / "redis_stats.jsonl"
    celery_path = snap_dir / "celery_stats.jsonl"

    redis_entry: dict = {"ts": now, "error": None}
    try:
        r = redis_lib.from_url(settings.redis_url, decode_responses=True)
        r.ping()
        info = r.info()
        redis_entry.update(
            {
                "used_memory_human": info.get("used_memory_human"),
                "connected_clients": info.get("connected_clients"),
                "total_keys_db0": r.dbsize(),
                "uptime_in_seconds": info.get("uptime_in_seconds"),
                "redis_version": info.get("redis_version"),
            }
        )
    except Exception as exc:
        redis_entry["error"] = str(exc)
        logger.warning("Snapshot Redis: %s", exc)

    _append_jsonl_rotating(redis_path, redis_entry)

    celery_entry: dict = {"ts": now, "error": None, "workers": []}
    try:
        insp = celery_app.control.inspect(timeout=2.0)
        if insp is None:
            celery_entry["error"] = "Brak inspect (broker niedostępny?)"
        else:
            stats = insp.stats()
            if not stats:
                celery_entry["error"] = "Brak odpowiedzi stats od workerów"
            else:
                for wname, raw in stats.items():
                    if isinstance(raw, dict):
                        celery_entry["workers"].append(_celery_worker_snapshot(wname, raw))
    except Exception as exc:
        celery_entry["error"] = str(exc)
        logger.warning("Snapshot Celery: %s", exc)

    _append_jsonl_rotating(celery_path, celery_entry)

    return {"redis": redis_entry.get("error") is None, "celery": celery_entry.get("error") is None}
