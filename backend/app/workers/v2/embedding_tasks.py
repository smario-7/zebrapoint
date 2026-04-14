"""
Celery tasks v2 — generowanie embeddingów i opisów soczewek.

Task generate_lens_embeddings: soczewki bez embeddingu (lub lista lens_ids).
Task generate_single_lens_embedding: jedna soczewka (np. po dodaniu w adminie).
"""

from __future__ import annotations

import asyncio
import logging
from uuid import UUID

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

_ENCODE_BATCH_SIZE = 32


@celery_app.task(
    name="v2.generate_lens_embeddings",
    bind=True,
    max_retries=3,
    default_retry_delay=300,
    acks_late=True,
    queue="v2",
)
def generate_lens_embeddings(self, lens_ids: list[str] | None = None):
    """
    Generuje opisy (LLM) i embeddingi dla soczewek bez embeddingu.

    lens_ids: opcjonalna lista UUID (str); None = wszystkie aktywne z embedding IS NULL.
    """
    try:
        asyncio.run(_generate_embeddings_async(lens_ids=lens_ids))
    except Exception as exc:
        logger.error("generate_lens_embeddings — błąd: %s", exc)
        raise self.retry(exc=exc) from exc


@celery_app.task(
    name="v2.generate_single_lens_embedding",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
    queue="v2",
)
def generate_single_lens_embedding(self, lens_id: str):
    """Generuje embedding (i opis) dla jednej soczewki po jej dodaniu lub edycji."""
    try:
        asyncio.run(_generate_embeddings_async(lens_ids=[lens_id]))
    except Exception as exc:
        logger.error("generate_single_lens_embedding(%s) — błąd: %s", lens_id, exc)
        raise self.retry(exc=exc) from exc


async def _generate_embeddings_async(*, lens_ids: list[str] | None = None) -> None:
    from sqlalchemy import select, update
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.core.database import database_url
    from app.models.v2.hpo import HpoTerm, OrphaDisease
    from app.models.v2.lens import Lens
    from app.services.v2.embedding_service import encode_batch
    from app.services.v2.llm_service import generate_lens_description

    engine = create_async_engine(database_url, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    try:
        async with session_factory() as session:
            query = select(Lens).where(Lens.is_active.is_(True))
            if lens_ids:
                uuids = [UUID(s) for s in lens_ids]
                query = query.where(Lens.id.in_(uuids))
            else:
                query = query.where(Lens.embedding.is_(None))

            result = await session.execute(query)
            lenses = list(result.scalars().all())

        if not lenses:
            logger.info("Brak soczewek do przetworzenia.")
            return

        logger.info("Przetwarzam %d soczewek...", len(lenses))

        hpo_ids_needed: set[str] = set()
        for lens in lenses:
            if lens.hpo_cluster:
                hpo_ids_needed.update(lens.hpo_cluster)

        hpo_labels_map: dict[str, str] = {}
        if hpo_ids_needed:
            async with session_factory() as session:
                hpo_result = await session.execute(
                    select(HpoTerm.hpo_id, HpoTerm.label_en).where(HpoTerm.hpo_id.in_(hpo_ids_needed))
                )
                hpo_labels_map = {row.hpo_id: row.label_en for row in hpo_result}

        orpha_ids = {
            lens.orpha_id
            for lens in lenses
            if lens.type == "diagnostic" and lens.orpha_id is not None
        }
        orpha_name_en_map: dict[int, str] = {}
        if orpha_ids:
            async with session_factory() as session:
                orpha_result = await session.execute(
                    select(OrphaDisease.orpha_id, OrphaDisease.name_en).where(
                        OrphaDisease.orpha_id.in_(orpha_ids)
                    )
                )
                orpha_name_en_map = {int(row.orpha_id): row.name_en for row in orpha_result}

        lens_descriptions: dict[str, str | None] = {}
        for lens in lenses:
            hpo_labels = [
                hpo_labels_map[hid]
                for hid in (lens.hpo_cluster or [])
                if hid in hpo_labels_map
            ]
            orpha_name_en = None
            if lens.type == "diagnostic" and lens.orpha_id is not None:
                orpha_name_en = orpha_name_en_map.get(int(lens.orpha_id))

            description = generate_lens_description(
                lens.name,
                hpo_labels=hpo_labels or None,
                orpha_name_en=orpha_name_en,
            )
            lens_descriptions[str(lens.id)] = description

        texts_to_encode: list[str] = []
        for lens in lenses:
            description = lens_descriptions.get(str(lens.id))
            parts = [lens.name]
            if description:
                parts.append(description)
            if lens.hpo_cluster:
                labels = [hpo_labels_map[h] for h in lens.hpo_cluster if h in hpo_labels_map]
                if labels:
                    parts.append(" ".join(labels[:20]))
            texts_to_encode.append(" | ".join(parts))

        logger.info("Enkodowanie %d tekstów...", len(texts_to_encode))
        vectors = encode_batch(texts_to_encode, batch_size=_ENCODE_BATCH_SIZE)

        async with session_factory() as session:
            for lens, vector, _text in zip(lenses, vectors, texts_to_encode):
                description = lens_descriptions.get(str(lens.id))
                await session.execute(
                    update(Lens)
                    .where(Lens.id == lens.id)
                    .values(
                        embedding=vector,
                        description=description,
                    )
                )
            await session.commit()

        logger.info("Zakończono: %d embeddingów zapisanych.", len(lenses))

    finally:
        await engine.dispose()
