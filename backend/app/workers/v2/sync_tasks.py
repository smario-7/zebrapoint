"""
Celery tasks v2 — synchronizacja danych zewnętrznych.

Task sync_orphanet_weekly: dla wierszy już w orpha_diseases odświeża z API
nazwę EN oraz listę HPO. Kolumny name_pl nie są nadpisywane (źródło: XML Orphadata
lub ręczna korekta). Soczewka diagnostyczna: hpo_cluster z API, pole name z name_pl w bazie.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select, update as sa_update

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


async def _sync_orphanet_async() -> None:
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.config import settings
    from app.core.database import database_url

    if not settings.orphanet_api_key:
        logger.warning(
            "sync_orphanet_weekly: brak ORPHANET_API_KEY — synchronizacja pominięta "
            "(name_pl / name soczewki pozostają bez zmian z bazy)"
        )
        return

    from app.models.v2.hpo import OrphaDisease as OrphaDiseaseModel
    from app.models.v2.lens import Lens
    from app.services.v2.orphanet_client import OrphanetClient

    engine = create_async_engine(database_url, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        result = await session.execute(
            select(OrphaDiseaseModel.orpha_id, OrphaDiseaseModel.name_pl)
        )
        rows = result.fetchall()

    name_pl_by_orpha_id: dict[int, str] = {int(r[0]): str(r[1]) for r in rows}
    existing_ids = list(name_pl_by_orpha_id.keys())

    if not existing_ids:
        logger.info("Brak chorób do synchronizacji.")
        await engine.dispose()
        return

    logger.info("Synchronizacja %d chorób Orphanet (API: EN + HPO, bez nadpisywania name_pl)...", len(existing_ids))

    async with OrphanetClient() as client:
        diseases = await client.get_diseases_batch_for_sync(existing_ids)

    now = datetime.now(timezone.utc)

    async with session_factory() as session:
        for disease in diseases:
            await session.execute(
                sa_update(OrphaDiseaseModel)
                .where(OrphaDiseaseModel.orpha_id == disease.orpha_id)
                .values(
                    name_en=disease.name_en,
                    orpha_code=disease.orpha_code,
                    hpo_associations=disease.hpo_associations,
                    source_url=disease.source_url,
                    last_synced_at=now,
                )
            )

            lens_name = name_pl_by_orpha_id.get(disease.orpha_id)
            lens_values = {
                "hpo_cluster": disease.hpo_associations,
                "last_synced_at": now,
            }
            if lens_name is not None and lens_name.strip():
                lens_values["name"] = lens_name

            await session.execute(
                sa_update(Lens)
                .where(
                    Lens.orpha_id == disease.orpha_id,
                    Lens.type == "diagnostic",
                )
                .values(**lens_values)
            )

        await session.commit()

    logger.info("Synchronizacja zakończona: %d chorób zaktualizowanych", len(diseases))
    await engine.dispose()


@celery_app.task(
    name="v2.sync_orphanet_weekly",
    bind=True,
    max_retries=3,
    default_retry_delay=3600,
    acks_late=True,
)
def sync_orphanet_weekly(self):
    try:
        asyncio.run(_sync_orphanet_async())
    except Exception as exc:
        logger.error("sync_orphanet_weekly — błąd: %s", exc)
        raise self.retry(exc=exc) from exc
