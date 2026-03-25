import logging

from sqlalchemy.exc import ProgrammingError

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.tasks.ml_tasks.retrain_clusters",
    queue="ml",
    bind=True,
    max_retries=2,
    default_retry_delay=300
)
def retrain_clusters(self):
    """
    Wymuszony retrain klastrów HDBSCAN.
    Wołany ręcznie przez admina (POST /admin/retrain) lub przez check_and_retrain.
    """
    from app.database import SessionLocal
    from app.services.ml_pipeline import run_pipeline

    logger.info("retrain_clusters START")
    db = SessionLocal()
    try:
        result = run_pipeline(db)
        logger.info("retrain_clusters OK: %s", result)
        return result
    except ProgrammingError as exc:
        logger.error("retrain_clusters BŁĄD (schemat SQL): %s", exc, exc_info=True)
        raise
    except Exception as exc:
        logger.error("retrain_clusters BŁĄD: %s", exc, exc_info=True)
        raise self.retry(exc=exc)
    finally:
        db.close()


@celery_app.task(
    name="app.tasks.ml_tasks.check_and_retrain",
    queue="ml"
)
def check_and_retrain():
    """
    Wywoływany co 30 minut przez Celery Beat.
    Sprawdza warunek retrain — jeśli spełniony, kolejkuje retrain_clusters.
    """
    from app.database import SessionLocal
    from app.services.ml_pipeline import should_retrain

    db = SessionLocal()
    try:
        if should_retrain(db):
            logger.info("Warunek retrain spełniony — kolejkuję retrain_clusters")
            retrain_clusters.apply_async(queue="ml")
        else:
            logger.debug("Retrain nie jest jeszcze potrzebny")
    finally:
        db.close()


@celery_app.task(
    name="app.tasks.ml_tasks.update_group_characteristics",
    queue="ml"
)
def update_group_characteristics_task(group_id: str):
    """
    Przelicza charakterystyki jednej grupy (słowa kluczowe, kategoria).
    Wołane po przypisaniu nowego członka do grupy.
    """
    from app.database import SessionLocal
    from app.services.group_characteristics import update_group_characteristics

    db = SessionLocal()
    try:
        update_group_characteristics(db, group_id)
        return {"status": "ok", "group_id": group_id}
    except Exception as exc:
        logger.error(
            "update_group_characteristics błąd dla %s: %s",
            group_id,
            exc,
            exc_info=True,
        )
        raise
    finally:
        db.close()
