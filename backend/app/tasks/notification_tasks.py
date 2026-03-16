import logging
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.tasks.notification_tasks.send_email",
    queue="notifications",
    bind=True,
    max_retries=3,
    default_retry_delay=60     # retry po 1 minucie
)
def send_email(self, to: str, subject: str, html: str):
    """
    Wysyłanie emaila przez Resend.

    IMPLEMENTACJA: Sprint 9
    Parametry:
        to      — adres email odbiorcy
        subject — temat emaila
        html    — treść HTML
    """
    logger.info(f"send_email → {to}: {subject} (stub Sprint 9)")
    return {"status": "stub", "to": to}


@celery_app.task(
    name="app.tasks.notification_tasks.notify_group_reassignment",
    queue="notifications",
    bind=True,
    max_retries=3,
    default_retry_delay=60
)
def notify_group_reassignment(self, user_id: str, group_id: str):
    """
    Email gdy użytkownik zostaje przypisany do nowej grupy (po retrain ML).

    IMPLEMENTACJA: Sprint 9
    """
    logger.info(
        f"notify_group_reassignment user={user_id} group={group_id} (stub)"
    )
    return {"status": "stub"}


@celery_app.task(
    name="app.tasks.notification_tasks.notify_new_post",
    queue="notifications",
    bind=True,
    max_retries=3,
    default_retry_delay=60
)
def notify_new_post(self, post_id: str):
    """
    Email do wszystkich członków grupy o nowym poście.

    IMPLEMENTACJA: Sprint 9
    """
    logger.info(f"notify_new_post post={post_id} (stub Sprint 9)")
    return {"status": "stub"}


@celery_app.task(
    name="app.tasks.notification_tasks.send_weekly_digest",
    queue="notifications"
)
def send_weekly_digest():
    """
    Cotygodniowy digest dla nieaktywnych użytkowników.
    Wołany przez Beat co poniedziałek o 8:00.

    IMPLEMENTACJA: Sprint 9
    """
    logger.info("send_weekly_digest (stub Sprint 9)")
    return {"status": "stub"}
