"""Wspólne wyszukiwanie chorób w Orphanet API (admin + publiczny endpoint onboardingu)."""

from __future__ import annotations

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.v2.hpo import OrphaDisease as OrphaDiseaseModel
from app.schemas.v2.admin import OrphaSearchResult
from app.services.v2.orphanet_client import OrphanetClient


async def search_orphanet_diseases(
    db: AsyncSession,
    q: str,
    *,
    limit: int = 10,
) -> list[OrphaSearchResult]:
    if not settings.orphanet_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Brak ORPHANET_API_KEY — wyszukiwanie niedostępne",
        )

    existing = await db.execute(select(OrphaDiseaseModel.orpha_id))
    existing_ids = set(existing.scalars().all())

    try:
        async with OrphanetClient() as client:
            diseases = await client.search_by_name(q, limit=limit)
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
