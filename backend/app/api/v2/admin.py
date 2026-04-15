"""
Router v2: panel administratora (soczewki, użytkownicy, moderacja, Orphanet, statystyki).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, require_admin
from app.models.v2.hpo import HpoTerm, OrphaDisease as OrphaDiseaseModel
from app.models.v2.lens import Lens
from app.models.v2.post import Comment, Post
from app.models.v2.proposal import LensProposal
from app.models.v2.user import User
from app.schemas.v2.admin import (
    AdminLensOut,
    AdminPostOut,
    AdminProposalOut,
    AdminUserOut,
    BanRequest,
    LensCreateRequest,
    LensUpdateRequest,
    OrphaImportRequest,
    OrphaSearchResult,
    ProposalRejectRequest,
    RoleChangeRequest,
    SystemStats,
)

router = APIRouter(prefix="/api/v2/admin", tags=["Admin v2"])


def _admin_lens_out(lens: Lens) -> AdminLensOut:
    fields = AdminLensOut.model_fields.keys()
    data: dict[str, Any] = {k: getattr(lens, k) for k in fields if hasattr(lens, k)}
    data["embedding_ready"] = lens.embedding is not None
    return AdminLensOut(**data)


@router.get("/users", response_model=list[AdminUserOut])
async def list_users(
    search: str | None = Query(default=None, description="Szukaj po email lub username"),
    role: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = select(User)
    if search:
        pattern = f"%{search}%"
        query = query.where(or_(User.email.ilike(pattern), User.username.ilike(pattern)))
    if role:
        query = query.where(User.role == role)
    if status_filter:
        query = query.where(User.status == status_filter)
    query = query.order_by(User.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return [AdminUserOut.model_validate(u) for u in result.scalars().all()]


@router.patch("/users/{user_id}/ban")
async def ban_user(
    user_id: uuid.UUID,
    data: BanRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nie możesz zbanować samego siebie",
        )
    new_status = "suspended" if data.banned else "active"
    result = await db.execute(
        update(User)
        .where(User.id == user_id)
        .values(status=new_status)
        .returning(User.id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nie znaleziono użytkownika",
        )
    await db.commit()
    return {"status": new_status, "user_id": str(user_id)}


@router.patch("/users/{user_id}/role")
async def change_user_role(
    user_id: uuid.UUID,
    data: RoleChangeRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    if data.role not in ("user", "moderator", "admin"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rola musi być: user | moderator | admin",
        )
    if user_id == current_admin.id and data.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nie możesz odebrać sobie roli administratora",
        )
    result = await db.execute(
        update(User)
        .where(User.id == user_id)
        .values(role=data.role)
        .returning(User.id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nie znaleziono użytkownika",
        )
    await db.commit()
    return {"role": data.role, "user_id": str(user_id)}


@router.get("/posts", response_model=list[AdminPostOut])
async def list_posts_for_moderation(
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = select(Post)
    if status_filter:
        query = query.where(Post.status == status_filter)
    query = query.order_by(Post.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return [AdminPostOut.model_validate(p) for p in result.scalars().all()]


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_post(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        update(Post)
        .where(Post.id == post_id)
        .values(status="removed")
        .returning(Post.id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nie znaleziono posta",
        )
    await db.commit()


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_comment(
    comment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    if comment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nie znaleziono komentarza",
        )
    await db.execute(delete(Comment).where(Comment.id == comment_id))
    await db.commit()


@router.get("/lenses", response_model=list[AdminLensOut])
async def list_all_lenses(
    type_filter: str | None = Query(default=None, alias="type"),
    active_only: bool = Query(default=False),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = select(Lens)
    if type_filter:
        query = query.where(Lens.type == type_filter)
    if active_only:
        query = query.where(Lens.is_active.is_(True))
    query = query.order_by(Lens.type, Lens.name).limit(limit).offset(offset)
    result = await db.execute(query)
    return [_admin_lens_out(l) for l in result.scalars().all()]


@router.post("/lenses", response_model=AdminLensOut, status_code=status.HTTP_201_CREATED)
async def create_topical_lens(
    data: LensCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    if data.type != "topical":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin może tworzyć tylko soczewki typu 'topical'",
        )
    lens = Lens(
        name=data.name,
        description=data.description,
        type="topical",
        emoji=data.emoji,
        data_source="admin",
        is_active=True,
        created_by=current_admin.id,
    )
    db.add(lens)
    await db.commit()
    await db.refresh(lens)

    from app.workers.v2.embedding_tasks import generate_single_lens_embedding

    generate_single_lens_embedding.delay(str(lens.id))

    return _admin_lens_out(lens)


@router.patch("/lenses/{lens_id}", response_model=AdminLensOut)
async def update_lens(
    lens_id: uuid.UUID,
    data: LensUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Lens).where(Lens.id == lens_id))
    lens = result.scalar_one_or_none()
    if lens is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nie znaleziono soczewki",
        )

    if data.name is not None:
        lens.name = data.name
    if data.description is not None:
        lens.description = data.description
    if data.emoji is not None:
        lens.emoji = data.emoji

    await db.commit()
    await db.refresh(lens)

    if data.name is not None or data.description is not None:
        from app.workers.v2.embedding_tasks import generate_single_lens_embedding

        generate_single_lens_embedding.delay(str(lens.id))

    return _admin_lens_out(lens)


@router.patch("/lenses/{lens_id}/toggle")
async def toggle_lens_active(
    lens_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Lens).where(Lens.id == lens_id))
    lens = result.scalar_one_or_none()
    if lens is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nie znaleziono soczewki",
        )
    lens.is_active = not lens.is_active
    await db.commit()
    return {"lens_id": str(lens_id), "is_active": lens.is_active}


@router.post("/lenses/sync-orphanet")
async def trigger_orphanet_sync(_: User = Depends(require_admin)):
    from app.workers.v2.sync_tasks import sync_orphanet_weekly

    sync_orphanet_weekly.delay()
    return {"status": "sync_triggered"}


@router.get("/orphanet/search", response_model=list[OrphaSearchResult])
async def search_orphanet(
    q: str = Query(min_length=2, description="Nazwa choroby lub kod ORPHA"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    from app.config import settings
    from app.services.v2.orphanet_client import OrphanetClient

    if not settings.orphanet_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Brak ORPHANET_API_KEY — wyszukiwanie niedostępne",
        )

    existing = await db.execute(select(OrphaDiseaseModel.orpha_id))
    existing_ids = set(existing.scalars().all())

    try:
        async with OrphanetClient() as client:
            diseases = await client.search_by_name(q, limit=10)
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Orphanet API niedostępne: {e!s}",
        ) from e

    return [
        OrphaSearchResult(
            orpha_id=d.orpha_id,
            orpha_code=d.orpha_code,
            name_pl=d.name_pl,
            name_en=d.name_en,
            hpo_count=len(d.hpo_associations),
            already_imported=d.orpha_id in existing_ids,
        )
        for d in diseases
    ]


@router.post("/orphanet/import", status_code=status.HTTP_201_CREATED)
async def import_orphanet_disease(
    data: OrphaImportRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    from app.config import settings
    from app.services.v2.orphanet_client import OrphanetClient

    if not settings.orphanet_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Brak ORPHANET_API_KEY — import niedostępny",
        )

    result = await db.execute(
        select(OrphaDiseaseModel).where(OrphaDiseaseModel.orpha_id == data.orpha_id)
    )
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"ORPHA:{data.orpha_id} jest już w bazie",
        )

    async with OrphanetClient() as client:
        disease = await client.get_disease(data.orpha_id)

    if disease is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ORPHA:{data.orpha_id} nie znaleziono w Orphanet API",
        )

    now = datetime.now(timezone.utc)
    name_pl = disease.name_pl or disease.name_en
    name_en = disease.name_en

    orpha = OrphaDiseaseModel(
        orpha_id=disease.orpha_id,
        orpha_code=disease.orpha_code,
        name_pl=name_pl,
        name_en=name_en,
        hpo_associations=disease.hpo_associations,
        source_url=disease.source_url,
        last_synced_at=now,
        created_at=now,
    )
    db.add(orpha)
    await db.flush()

    lens = Lens(
        name=name_pl,
        type="diagnostic",
        emoji="🧬",
        hpo_cluster=disease.hpo_associations,
        orpha_id=disease.orpha_id,
        data_source="orphanet",
        source_url=disease.source_url,
        last_synced_at=now,
        is_active=True,
        created_by=current_admin.id,
    )
    db.add(lens)
    await db.commit()
    await db.refresh(lens)

    from app.workers.v2.embedding_tasks import generate_single_lens_embedding

    generate_single_lens_embedding.delay(str(lens.id))

    return {
        "orpha_id": disease.orpha_id,
        "lens_id": str(lens.id),
        "name": lens.name,
        "status": "imported",
        "embedding": "pending",
    }


@router.get("/lens-proposals", response_model=list[AdminProposalOut])
async def list_lens_proposals(
    status_filter: str | None = Query(default="pending", alias="status"),
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = select(LensProposal, User.username).join(User, User.id == LensProposal.user_id)
    if status_filter:
        query = query.where(LensProposal.status == status_filter)
    query = query.order_by(LensProposal.created_at.desc()).limit(limit)
    result = await db.execute(query)
    out: list[AdminProposalOut] = []
    for proposal, username in result.all():
        out.append(
            AdminProposalOut(
                id=proposal.id,
                user_id=proposal.user_id,
                proposer_username=username,
                name=proposal.name,
                type=proposal.type,
                justification=proposal.justification,
                status=proposal.status,
                admin_comment=proposal.admin_comment,
                created_at=proposal.created_at,
            )
        )
    return out


@router.post("/lens-proposals/{proposal_id}/approve")
async def approve_lens_proposal(
    proposal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    result = await db.execute(select(LensProposal).where(LensProposal.id == proposal_id))
    proposal = result.scalar_one_or_none()
    if proposal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nie znaleziono propozycji",
        )
    if proposal.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Propozycja nie jest w statusie 'pending'",
        )

    lens = Lens(
        name=proposal.name,
        type=proposal.type,
        data_source="admin",
        is_active=True,
        created_by=current_admin.id,
    )
    db.add(lens)
    await db.flush()

    now = datetime.now(timezone.utc)
    proposal.status = "approved"
    proposal.reviewed_by = current_admin.id
    proposal.reviewed_at = now
    proposal.created_lens_id = lens.id

    await db.commit()

    from app.workers.v2.embedding_tasks import generate_single_lens_embedding

    generate_single_lens_embedding.delay(str(lens.id))

    return {
        "proposal_id": str(proposal_id),
        "lens_id": str(lens.id),
        "status": "approved",
    }


@router.post("/lens-proposals/{proposal_id}/reject")
async def reject_lens_proposal(
    proposal_id: uuid.UUID,
    data: ProposalRejectRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    result = await db.execute(select(LensProposal).where(LensProposal.id == proposal_id))
    proposal = result.scalar_one_or_none()
    if proposal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nie znaleziono propozycji",
        )
    if proposal.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Propozycja nie jest w statusie 'pending'",
        )

    now = datetime.now(timezone.utc)
    proposal.status = "rejected"
    proposal.admin_comment = data.comment
    proposal.reviewed_by = current_admin.id
    proposal.reviewed_at = now
    await db.commit()

    return {"proposal_id": str(proposal_id), "status": "rejected"}


@router.get("/stats", response_model=SystemStats)
async def get_system_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    users_total = (
        await db.execute(select(func.count()).select_from(User))
    ).scalar()
    users_active = (
        await db.execute(
            select(func.count()).select_from(User).where(User.status == "active")
        )
    ).scalar()

    posts_total = (
        await db.execute(select(func.count()).select_from(Post))
    ).scalar()
    posts_published = (
        await db.execute(
            select(func.count()).select_from(Post).where(Post.status == "published")
        )
    ).scalar()
    posts_no_embedding = (
        await db.execute(
            select(func.count())
            .select_from(Post)
            .where(Post.status == "published")
            .where(Post.embedding.is_(None))
        )
    ).scalar()

    lenses_total = (
        await db.execute(select(func.count()).select_from(Lens))
    ).scalar()
    lenses_active = (
        await db.execute(
            select(func.count()).select_from(Lens).where(Lens.is_active.is_(True))
        )
    ).scalar()
    lenses_no_embedding = (
        await db.execute(
            select(func.count())
            .select_from(Lens)
            .where(Lens.is_active.is_(True))
            .where(Lens.embedding.is_(None))
        )
    ).scalar()

    proposals_pending = (
        await db.execute(
            select(func.count())
            .select_from(LensProposal)
            .where(LensProposal.status == "pending")
        )
    ).scalar()

    last_sync = (
        await db.execute(select(func.max(OrphaDiseaseModel.last_synced_at)))
    ).scalar()

    hpo_version = (await db.execute(select(HpoTerm.source_version).limit(1))).scalar()

    return SystemStats(
        users_total=users_total or 0,
        users_active=users_active or 0,
        posts_total=posts_total or 0,
        posts_published=posts_published or 0,
        posts_without_embedding=posts_no_embedding or 0,
        lenses_total=lenses_total or 0,
        lenses_active=lenses_active or 0,
        lenses_without_embedding=lenses_no_embedding or 0,
        proposals_pending=proposals_pending or 0,
        last_orphanet_sync=last_sync,
        last_hpo_sync=hpo_version,
    )
