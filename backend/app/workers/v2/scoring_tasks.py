"""
Celery tasks v2 — obliczanie scoringu User ↔ Lens.

Tasky:
  - v2.compute_user_lens_scores: oblicza score dla jednego usera względem wszystkich aktywnych soczewek
  - v2.compute_all_users_lens_scores: batch scoring dla wszystkich aktywnych userów (Celery Beat)
"""

from __future__ import annotations

import logging

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="v2.compute_user_lens_scores",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
    queue="v2",
)
def compute_user_lens_scores(self, user_id: str):
    """Oblicza i zapisuje score user↔lens dla jednego użytkownika."""
    import asyncio

    try:
        asyncio.run(_compute_for_user_async(user_id))
    except Exception as exc:
        logger.error("compute_user_lens_scores(%s) — błąd: %s", user_id, exc)
        raise self.retry(exc=exc) from exc


@celery_app.task(
    name="v2.compute_all_users_lens_scores",
    bind=True,
    max_retries=2,
    default_retry_delay=300,
    acks_late=True,
    queue="v2",
)
def compute_all_users_lens_scores(self):
    """Batch scoring dla wszystkich aktywnych userów (Celery Beat)."""
    import asyncio

    try:
        asyncio.run(_compute_all_async())
    except Exception as exc:
        logger.error("compute_all_users_lens_scores — błąd: %s", exc)
        raise self.retry(exc=exc) from exc


async def _compute_for_user_async(user_id: str) -> None:
    from datetime import datetime, timezone
    from uuid import UUID

    from sqlalchemy import select
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.core.database import database_url
    from app.models.v2.lens import Lens, UserLensScore
    from app.models.v2.matching import PostLensMatch
    from app.models.v2.post import Post
    from app.models.v2.user import User
    from app.services.v2.user_lens_scoring_service import _avg_vectors, score_lens_for_user

    engine = create_async_engine(database_url, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    try:
        async with session_factory() as session:
            result = await session.execute(select(User).where(User.id == UUID(user_id)))
            user = result.scalar_one_or_none()
            if not user:
                logger.warning("User %s nie istnieje.", user_id)
                return

            result = await session.execute(
                select(Lens.id, Lens.type, Lens.embedding, Lens.hpo_cluster)
                .where(Lens.is_active.is_(True))
                .where(Lens.embedding.is_not(None))
            )
            lenses = [
                {
                    "id": str(row.id),
                    "type": row.type,
                    "embedding": row.embedding,
                    "hpo_cluster": row.hpo_cluster,
                }
                for row in result
            ]

            if not lenses:
                logger.info("Brak aktywnych soczewek z embeddingiem.")
                return

            topical_ids = [l["id"] for l in lenses if l["type"] == "topical"]
            community_vectors: dict[str, list[float] | None] = {}

            for lens_id in topical_ids:
                result = await session.execute(
                    select(User.post_vector)
                    .join(Post, Post.author_id == User.id)
                    .join(PostLensMatch, PostLensMatch.post_id == Post.id)
                    .where(PostLensMatch.lens_id == UUID(lens_id))
                    .where(User.post_vector.is_not(None))
                    .distinct()
                )
                vectors = [row.post_vector for row in result if row.post_vector]
                community_vectors[lens_id] = _avg_vectors(vectors)

            scores = []
            for lens in lenses:
                community_vec = (
                    community_vectors.get(lens["id"]) if lens["type"] == "topical" else None
                )
                ls = score_lens_for_user(
                    lens=lens,
                    user_diagnosis_vector=user.diagnosis_vector,
                    user_hpo_vector=user.hpo_vector,
                    user_post_vector=user.post_vector,
                    user_has_diagnosis=user.diagnosis_confirmed,
                    community_vector=community_vec,
                )
                scores.append(ls)

        now = datetime.now(timezone.utc)
        async with session_factory() as session:
            for ls in scores:
                stmt = pg_insert(UserLensScore).values(
                    user_id=UUID(user_id),
                    lens_id=UUID(ls.lens_id),
                    score=ls.score,
                    score_breakdown=ls.score_breakdown,
                    calculated_at=now,
                )
                stmt = stmt.on_conflict_do_update(
                    index_elements=["user_id", "lens_id"],
                    set_={
                        "score": stmt.excluded.score,
                        "score_breakdown": stmt.excluded.score_breakdown,
                        "calculated_at": stmt.excluded.calculated_at,
                    },
                )
                await session.execute(stmt)
            await session.commit()

        logger.info("Scoring zakończony dla usera %s: %d soczewek.", user_id, len(scores))

    finally:
        await engine.dispose()


async def _compute_all_async() -> None:
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.core.database import database_url
    from app.models.v2.user import User

    engine = create_async_engine(database_url, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    try:
        async with session_factory() as session:
            result = await session.execute(select(User.id).where(User.status == "active"))
            user_ids = [str(row.id) for row in result]

        logger.info("Batch scoring: %d userów do przetworzenia.", len(user_ids))

        for uid in user_ids:
            await _compute_for_user_async(uid)

        logger.info("Batch scoring zakończony.")
    finally:
        await engine.dispose()


@celery_app.task(
    name="v2.update_lens_activity_levels",
    bind=True,
    max_retries=2,
    default_retry_delay=300,
    acks_late=True,
    queue="v2",
)
def update_lens_activity_levels(self):
    """
    Aktualizuje activity_level dla każdej aktywnej soczewki
    na podstawie liczby opublikowanych postów z ostatnich 30 dni.
    Uruchamiany co noc przez Celery Beat.
    """
    import asyncio

    try:
        asyncio.run(_update_activity_levels_async())
    except Exception as exc:
        logger.error("update_lens_activity_levels — błąd: %s", exc)
        raise self.retry(exc=exc) from exc


async def _update_activity_levels_async() -> None:
    from datetime import datetime, timedelta, timezone

    from sqlalchemy import func, select, update
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.core.database import database_url
    from app.models.v2.lens import Lens
    from app.models.v2.matching import PostLensMatch
    from app.models.v2.post import Post
    from app.services.v2.time_decay_service import determine_activity_level

    engine = create_async_engine(database_url, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)

    try:
        async with session_factory() as session:
            result = await session.execute(
                select(
                    PostLensMatch.lens_id,
                    func.count(PostLensMatch.post_id).label("post_count_30d"),
                )
                .join(Post, Post.id == PostLensMatch.post_id)
                .where(Post.status == "published")
                .where(Post.published_at.is_not(None))
                .where(Post.published_at >= cutoff)
                .group_by(PostLensMatch.lens_id)
            )
            counts = {row.lens_id: int(row.post_count_30d) for row in result}

            result = await session.execute(select(Lens.id).where(Lens.is_active.is_(True)))
            lens_ids = [row.id for row in result]

            updated = 0
            for lens_id in lens_ids:
                posts_30d = counts.get(lens_id, 0)
                new_level = determine_activity_level(posts_30d)
                await session.execute(
                    update(Lens).where(Lens.id == lens_id).values(activity_level=new_level)
                )
                updated += 1

            await session.commit()
            logger.info("activity_level zaktualizowany dla %d soczewek.", updated)
    finally:
        await engine.dispose()

