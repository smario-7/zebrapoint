"""
Celery task: scoring kandydatów do Dynamic Chat.
"""

from __future__ import annotations

import json
import logging
import uuid

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

_SEARCH_TTL = 600
_SEARCH_PREFIX = "chat_search:"


@celery_app.task(
    name="v2.score_users_for_chat",
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    acks_late=True,
    queue="v2",
)
def score_users_for_chat(
    self,
    search_id: str,
    requester_id: str,
    query_text: str,
    target_count: int,
    include_location: bool,
):
    import asyncio

    try:
        asyncio.run(
            _score_async(
                search_id=search_id,
                requester_id=requester_id,
                query_text=query_text,
                target_count=target_count,
                include_location=include_location,
            )
        )
    except Exception as exc:
        logger.error("score_users_for_chat(%s) — błąd: %s", search_id, exc)
        _store_error(search_id, str(exc))
        raise self.retry(exc=exc) from exc


async def _score_async(
    search_id: str,
    requester_id: str,
    query_text: str,
    target_count: int,
    include_location: bool,
) -> None:
    from uuid import UUID

    from redis.asyncio import Redis
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.config import settings
    from app.core.database import database_url
    from app.models.v2.hpo import UserHpoProfile
    from app.models.v2.user import User
    from app.services.v2.chat_scoring_service import find_top_candidates
    from app.services.v2.embedding_service import encode

    engine = create_async_engine(database_url)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    redis = Redis.from_url(settings.redis_auth_url, decode_responses=True)

    try:
        async with session_factory() as session:
            result = await session.execute(select(User).where(User.id == UUID(requester_id)))
            requester = result.scalar_one_or_none()
            if not requester:
                logger.error("Requester %s nie istnieje.", requester_id)
                return

            query_embedding = encode(query_text).tolist()

            result = await session.execute(
                select(UserHpoProfile.hpo_id).where(UserHpoProfile.user_id == UUID(requester_id))
            )
            requester_hpo = [row.hpo_id for row in result]

            result = await session.execute(
                select(
                    User.id,
                    User.status,
                    User.searchable,
                    User.last_login_at,
                    User.post_vector,
                    User.chat_response_rate,
                    User.location_city,
                    User.location_country,
                )
                .where(User.searchable.is_(True))
                .where(User.status == "active")
                .where(User.id != UUID(requester_id))
            )
            raw_candidates = result.fetchall()

            candidate_ids = [str(row.id) for row in raw_candidates]
            candidate_uuids = [UUID(cid) for cid in candidate_ids]
            hpo_map: dict[str, list[str]] = {cid: [] for cid in candidate_ids}
            if candidate_uuids:
                result = await session.execute(
                    select(UserHpoProfile.user_id, UserHpoProfile.hpo_id).where(
                        UserHpoProfile.user_id.in_(candidate_uuids)
                    )
                )
                for row in result:
                    hpo_map[str(row.user_id)].append(row.hpo_id)

            candidates = [
                {
                    "id": row.id,
                    "status": row.status,
                    "searchable": row.searchable,
                    "last_login_at": row.last_login_at,
                    "post_vector": row.post_vector,
                    "chat_response_rate": row.chat_response_rate,
                    "location_city": row.location_city,
                    "location_country": row.location_country,
                    "hpo_ids": hpo_map.get(str(row.id), []),
                }
                for row in raw_candidates
            ]

        top = find_top_candidates(
            query_embedding=query_embedding,
            requester_hpo=requester_hpo,
            requester_city=requester.location_city,
            requester_country=requester.location_country,
            candidates=candidates,
            target_count=target_count,
            include_location=include_location,
        )

        result_data = {
            "status": "done",
            "found_count": len(top),
            "target_count": target_count,
            "query_text": query_text,
            "include_location": include_location,
            "candidates": [{"user_id": c.user_id, "score": c.score} for c in top],
        }
        await redis.setex(
            f"{_SEARCH_PREFIX}{search_id}",
            _SEARCH_TTL,
            json.dumps(result_data),
        )
        logger.info("Chat search %s: znaleziono %d kandydatów.", search_id, len(top))

    finally:
        await redis.aclose()
        await engine.dispose()


def _store_error(search_id: str, error: str) -> None:
    import redis as sync_redis

    from app.config import settings

    try:
        r = sync_redis.from_url(settings.redis_auth_url, decode_responses=True)
        r.setex(
            f"{_SEARCH_PREFIX}{search_id}",
            _SEARCH_TTL,
            json.dumps({"status": "error", "error": error}),
        )
    except Exception:
        pass
