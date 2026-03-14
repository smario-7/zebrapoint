from celery import Celery
from celery.schedules import crontab
from app.config import settings

# ── Singleton instancji Celery ────────────────────────────────────
celery_app = Celery(
    "zebrapoint",
    broker=settings.redis_url,
    backend=settings.redis_url,
    # Moduły z zadaniami — Celery auto-importuje przy starcie
    include=[
        "app.tasks.ml_tasks",
        "app.tasks.notification_tasks"
    ]
)

# ── Konfiguracja ──────────────────────────────────────────────────
celery_app.conf.update(

    # Serializacja — JSON (nie pickle, bezpieczniej)
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],

    # Strefa czasowa
    timezone="Europe/Warsaw",
    enable_utc=True,

    # Wyniki trzymaj w Redis 24h, potem auto-usuń
    result_expires=86400,

    # Niezawodność:
    # task_acks_late=True  → Worker potwierdza zadanie DOPIERO po wykonaniu
    #                         (nie po pobraniu). Jeśli worker padnie w trakcie,
    #                         zadanie wróci do kolejki.
    task_acks_late=True,
    task_reject_on_worker_lost=True,

    # Kolejki
    task_default_queue="default",
    task_queues={
        "ml": {
            "exchange":      "ml",
            "routing_key":   "ml",
        },
        "notifications": {
            "exchange":      "notifications",
            "routing_key":   "notifications",
        },
        "default": {
            "exchange":      "default",
            "routing_key":   "default",
        },
    },

    # Routing zadań do kolejek
    task_routes={
        "app.tasks.ml_tasks.*":             {"queue": "ml"},
        "app.tasks.notification_tasks.*":   {"queue": "notifications"},
    },

    # Worker — ogranicz do 1 zadania naraz na Pi
    # (model ML jest zasobożerny, 2 naraz = OOM kill)
    worker_concurrency=1,
    worker_prefetch_multiplier=1,

    # Harmonogram zadań cyklicznych (Celery Beat)
    beat_schedule={
        # Co 30 minut sprawdź czy potrzebny retrain ML
        "check-retrain-every-30min": {
            "task":     "app.tasks.ml_tasks.check_and_retrain",
            "schedule": 1800.0,    # sekundy
            "options":  {"queue": "ml"}
        },
        # Co tydzień (poniedziałek 8:00) digest dla nieaktywnych userów
        # (Sprint 9 — placeholder)
        "weekly-digest-monday": {
            "task":     "app.tasks.notification_tasks.send_weekly_digest",
            "schedule": crontab(hour=8, minute=0, day_of_week=1),
            "options":  {"queue": "notifications"}
        },
    },

    # Logi — nie zaśmiecaj terminala zbędnymi INFO
    worker_redirect_stdouts_level="WARNING",
)
