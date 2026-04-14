"""
Celery tasks v2 — przetwarzanie opublikowanego posta.

Task: v2.process_published_post
  embedding + HPO/tag extraction + dopasowanie do soczewek + zapis post_lens_matches.
"""

from __future__ import annotations

import logging
from uuid import UUID

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="v2.process_published_post",
    bind=True,
    max_retries=3,
    default_retry_delay=120,
    acks_late=True,
    queue="v2",
)
def process_published_post(self, post_id: str):
    """Pipeline po publikacji posta."""
    import asyncio

    try:
        asyncio.run(_process_post_async(post_id))
    except Exception as exc:
        logger.error("process_published_post(%s) — błąd: %s", post_id, exc)
        raise self.retry(exc=exc) from exc


async def _process_post_async(post_id: str) -> None:
    from sqlalchemy import select, update
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.config import settings
    from app.core.database import database_url
    from app.models.v2.lens import Lens
    from app.models.v2.matching import PostLensMatch
    from app.models.v2.post import Post
    from app.services.v2.embedding_service import encode
    from app.services.v2.hpo_extractor import extract_hpo_and_tags
    from app.services.v2.matching_service import match_post_to_lenses

    engine = create_async_engine(database_url, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    try:
        async with session_factory() as session:
            result = await session.execute(select(Post).where(Post.id == UUID(post_id)))
            post = result.scalar_one_or_none()

        if not post:
            logger.error("Post %s nie istnieje.", post_id)
            return

        if post.status != "published":
            logger.warning(
                "Post %s nie jest opublikowany (status: %s).",
                post_id,
                post.status,
            )
            return

        text = f"{post.title} | {post.content}"
        post_embedding = encode(text).tolist()

        hpo_terms, context_tags = extract_hpo_and_tags(post.title, post.content)

        async with session_factory() as session:
            await session.execute(
                update(Post)
                .where(Post.id == UUID(post_id))
                .values(
                    embedding=post_embedding,
                    hpo_terms=hpo_terms,
                    context_tags=context_tags,
                )
            )
            await session.commit()

        async with session_factory() as session:
            result = await session.execute(
                select(Lens.id, Lens.embedding, Lens.hpo_cluster)
                .where(Lens.is_active.is_(True))
                .where(Lens.embedding.is_not(None))
            )
            lenses = [
                {
                    "id": str(row.id),
                    "embedding": row.embedding,
                    "hpo_cluster": row.hpo_cluster or [],
                }
                for row in result
            ]

        logger.info("Post %s: matching względem %d soczewek...", post_id, len(lenses))

        matches = match_post_to_lenses(post_embedding, hpo_terms, lenses)

        logger.info(
            "Post %s: %d dopasowań (próg: %.2f)",
            post_id,
            len(matches),
            settings.match_score_threshold,
        )

        if matches:
            async with session_factory() as session:
                for match in matches:
                    insert_stmt = pg_insert(PostLensMatch).values(
                        post_id=UUID(post_id),
                        lens_id=UUID(match.lens_id),
                        match_score=match.match_score,
                        score_breakdown=match.score_breakdown,
                    )
                    insert_stmt = insert_stmt.on_conflict_do_update(
                        index_elements=[PostLensMatch.post_id, PostLensMatch.lens_id],
                        set_={
                            "match_score": insert_stmt.excluded.match_score,
                            "score_breakdown": insert_stmt.excluded.score_breakdown,
                        },
                    )
                    await session.execute(insert_stmt)
                await session.commit()

        logger.info("Post %s: pipeline zakończony.", post_id)

    finally:
        await engine.dispose()
