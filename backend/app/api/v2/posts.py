"""
Router v2: posty (draft, publikacja, dopasowanie do soczewek).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_active_user, get_db
from app.models.v2.lens import Lens
from app.models.v2.matching import PostLensMatch
from app.models.v2.post import Post
from app.models.v2.user import User
from app.schemas.v2.post import PostCreate, PostLensMatchOut, PostOut, PostUpdate
from app.workers.v2.post_tasks import process_published_post

router = APIRouter(prefix="/api/v2/posts", tags=["Posts v2"])


@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
async def create_post(
    data: PostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    post = Post(
        author_id=current_user.id,
        title=data.title,
        content=data.content,
        status="draft",
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return PostOut.model_validate(post)


@router.get("", response_model=list[PostOut])
async def list_my_posts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Post)
        .where(Post.author_id == current_user.id)
        .where(Post.status != "removed")
        .order_by(Post.created_at.desc())
    )
    return [PostOut.model_validate(p) for p in result.scalars().all()]


@router.get("/{post_id}", response_model=PostOut)
async def get_post(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    post = await _get_post_or_404(post_id, db)
    if post.status == "removed" and post.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post nie istnieje")
    if post.status == "draft" and post.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post nie istnieje")
    return PostOut.model_validate(post)


@router.patch("/{post_id}", response_model=PostOut)
async def update_post(
    post_id: uuid.UUID,
    data: PostUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    post = await _get_post_or_404(post_id, db)
    _assert_owner(post, current_user)
    if post.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Można edytować tylko posty w statusie draft",
        )
    if data.title is not None:
        post.title = data.title
    if data.content is not None:
        post.content = data.content
    await db.commit()
    await db.refresh(post)
    return PostOut.model_validate(post)


@router.post("/{post_id}/publish", response_model=PostOut)
async def publish_post(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    post = await _get_post_or_404(post_id, db)
    _assert_owner(post, current_user)

    if post.status == "published":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Post jest już opublikowany",
        )
    if post.status == "removed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nie można opublikować usuniętego posta",
        )

    await db.execute(
        update(Post)
        .where(Post.id == post_id)
        .values(status="published", published_at=datetime.now(timezone.utc))
    )
    await db.commit()
    await db.refresh(post)

    process_published_post.delay(str(post_id))

    return PostOut.model_validate(post)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    post = await _get_post_or_404(post_id, db)
    _assert_owner(post, current_user)
    await db.execute(update(Post).where(Post.id == post_id).values(status="removed"))
    await db.commit()


@router.get("/{post_id}/lens-matches", response_model=list[PostLensMatchOut])
async def get_post_lens_matches(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    post = await _get_post_or_404(post_id, db)
    _assert_owner(post, current_user)

    result = await db.execute(
        select(PostLensMatch, Lens.name, Lens.type, Lens.emoji)
        .join(Lens, PostLensMatch.lens_id == Lens.id)
        .where(PostLensMatch.post_id == post_id)
        .order_by(PostLensMatch.match_score.desc())
    )
    rows = result.all()
    return [
        PostLensMatchOut(
            lens_id=plm.lens_id,
            lens_name=name,
            lens_type=ltype,
            lens_emoji=emoji,
            match_score=float(plm.match_score),
            score_breakdown=plm.score_breakdown,
        )
        for plm, name, ltype, emoji in rows
    ]


async def _get_post_or_404(post_id: uuid.UUID, db: AsyncSession) -> Post:
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post nie istnieje")
    return post


def _assert_owner(post: Post, user: User) -> None:
    if post.author_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Brak dostępu")
