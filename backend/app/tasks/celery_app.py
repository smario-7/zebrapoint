from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery(
    "zebrapoint",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.tasks.notification_tasks",
        "app.tasks.system_tasks",
        "app.workers.v2.sync_tasks",
        "app.workers.v2.embedding_tasks",
        "app.workers.v2.post_tasks",
        "app.workers.v2.scoring_tasks",
        "app.workers.v2.chat_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],

    timezone="Europe/Warsaw",
    enable_utc=True,

    result_expires=86400,

    task_acks_late=True,
    task_reject_on_worker_lost=True,

    task_default_queue="default",
    task_queues={
        "v2": {
            "exchange": "v2",
            "routing_key": "v2",
        },
        "notifications": {
            "exchange": "notifications",
            "routing_key": "notifications",
        },
        "default": {
            "exchange": "default",
            "routing_key": "default",
        },
    },

    task_routes={
        "v2.*": {"queue": "v2"},
        "app.tasks.notification_tasks.*": {"queue": "notifications"},
    },

    worker_concurrency=1,
    worker_prefetch_multiplier=1,

    beat_schedule={
        "weekly-digest-monday": {
            "task": "app.tasks.notification_tasks.send_weekly_digest",
            "schedule": crontab(hour=8, minute=0, day_of_week=1),
            "options": {"queue": "notifications"},
        },
        "save-system-snapshot-hourly": {
            "task": "app.tasks.system_tasks.save_system_snapshot",
            "schedule": 3600.0,
            "options": {"queue": "default"},
        },
        "sync-orphanet-weekly": {
            "task": "v2.sync_orphanet_weekly",
            "schedule": crontab(hour=3, minute=0, day_of_week=1),
            "options": {"queue": "v2"},
        },
        "update-lens-activity-levels-nightly": {
            "task": "v2.update_lens_activity_levels",
            "schedule": crontab(hour=1, minute=30),  # 01:30 — przed scoring o 02:00
            "options": {"queue": "v2"},
        },
        "compute-all-users-scores-nightly": {
            "task": "v2.compute_all_users_lens_scores",
            "schedule": crontab(hour=2, minute=0),
            "options": {"queue": "v2"},
        },
    },

    worker_redirect_stdouts_level="WARNING",
)
