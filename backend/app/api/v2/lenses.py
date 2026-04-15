"""
Router v2: soczewki.

Endpointy:
  - GET /api/v2/lenses              — lista soczewek z score usera, z filtrem
  - GET /api/v2/lenses/{lens_id}    — szczegóły soczewki
  - GET /api/v2/lenses/{lens_id}/posts — posty w soczewce (pod feed Time Decay w 2.3)
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_active_user, get_db
from app.models.v2.lens import Lens, UserLensScore
from app.models.v2.matching import PostLensMatch
from app.models.v2.post import Post
from app.models.v2.user import User
from app.schemas.v2.lens import LensOut, LensPostItem, LensWithScore

router = APIRouter(prefix="/api/v2/lenses", tags=["Lenses v2"])


@router.get("", response_model=list[LensWithScore])
async def list_lenses(
    filter: str = Query(
        default="all",
        description="Filtr: all | diagnostic | symptomatic | topical",
    ),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Zwraca soczewki posortowane wg score użytkownika.

    Jeśli user nie ma jeszcze scoringów (np. nowy user) — sortuje po post_count.
    """
    scores_result = await db.execute(
        select(UserLensScore.lens_id, UserLensScore.score).where(
            UserLensScore.user_id == current_user.id
        )
    )
    user_scores = {row.lens_id: float(row.score) for row in scores_result}

    query = select(Lens).where(Lens.is_active.is_(True))
    if filter and filter != "all":
        query = query.where(Lens.type == filter)
    result = await db.execute(query)
    lenses = result.scalars().all()

    output: list[LensWithScore] = []
    for lens in lenses:
        score = user_scores.get(lens.id)
        output.append(
            LensWithScore(
                id=lens.id,
                name=lens.name,
                description=lens.description,
                type=lens.type,
                emoji=lens.emoji,
                post_count=lens.post_count,
                activity_level=lens.activity_level,
                data_source=lens.data_source,
                user_score=score,
            )
        )

    output.sort(key=lambda x: (x.user_score is None, -(x.user_score or 0.0), -x.post_count))
    return output[offset : offset + limit]


@router.get("/{lens_id}", response_model=LensOut)
async def get_lens(
    lens_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(select(Lens).where(Lens.id == lens_id))
    lens = result.scalar_one_or_none()
    if not lens:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Soczewka nie istnieje",
        )
    return LensOut.model_validate(lens)


@router.get("/{lens_id}/posts", response_model=list[LensPostItem])
async def get_lens_posts(
    lens_id: uuid.UUID,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Posty w soczewce posortowane wg Time Decay feed_score.
    feed_score = match_score * 10 * decay(age, activity_level)

    Paginacja: pobieramy (offset + limit * 3) rekordów i sortujemy w Pythonie.
    To świadomy kompromis: przy małej liczbie postów działa bez problemu,
    a przy bardzo dużych soczewkach można w przyszłości zmaterializować feed_score.
    Zwraca tylko opublikowane posty.
    """
    from datetime import datetime, timezone

    from app.services.v2.time_decay_service import compute_feed_score

    lens_result = await db.execute(select(Lens.activity_level).where(Lens.id == lens_id))
    activity_level = lens_result.scalar_one_or_none()
    if not activity_level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Soczewka nie istnieje",
        )

    pull_limit = offset + limit * 3
    result = await db.execute(
        select(Post, PostLensMatch.match_score)
        .join(PostLensMatch, PostLensMatch.post_id == Post.id)
        .where(PostLensMatch.lens_id == lens_id)
        .where(Post.status == "published")
        .order_by(PostLensMatch.match_score.desc())
        .limit(pull_limit)
    )
    rows = result.all()

    now = datetime.now(timezone.utc)
    scored: list[tuple[Post, float, float]] = []
    for post, match_score in rows:
        if not post.published_at:
            continue
        ms = float(match_score)
        feed_score = compute_feed_score(
            match_score=ms,
            published_at=post.published_at,
            activity_level=activity_level,
            now=now,
        )
        scored.append((post, ms, feed_score))

    scored.sort(key=lambda x: x[2], reverse=True)
    page = scored[offset : offset + limit]

    return [
        LensPostItem(
            id=post.id,
            title=post.title,
            content=(post.content or "")[:300],
            author_id=post.author_id,
            match_score=match_score,
            feed_score=feed_score,
            comment_count=post.comment_count,
            published_at=post.published_at,
        )
        for post, match_score, feed_score in page
    ]

