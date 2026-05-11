"""
Router v2: propozycje soczewek (Lens Proposals).

Cel: osobny prefiks `/api/v2/lens-proposals`, żeby nie mieszać z `/api/v2/posts`.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_active_user, get_db
from app.models.v2.proposal import LensProposal
from app.models.v2.user import User
from app.schemas.v2.proposal import LensProposalCreate, LensProposalOut

router = APIRouter(prefix="/api/v2/lens-proposals", tags=["Lens Proposals v2"])


@router.post("", response_model=LensProposalOut, status_code=status.HTTP_201_CREATED)
async def create_lens_proposal(
    data: LensProposalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Zgłoś propozycję nowej soczewki (symptomatic lub topical)."""
    if data.type not in ("symptomatic", "topical"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Typ propozycji musi być 'symptomatic' lub 'topical'",
        )

    proposal = LensProposal(
        user_id=current_user.id,
        name=data.name,
        type=data.type,
        justification=data.justification,
        status="pending",
    )
    db.add(proposal)
    await db.commit()
    await db.refresh(proposal)
    return LensProposalOut.model_validate(proposal)


@router.get("/my", response_model=list[LensProposalOut])
async def list_my_lens_proposals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Moje propozycje soczewek z aktualnym statusem."""
    result = await db.execute(
        select(LensProposal)
        .where(LensProposal.user_id == current_user.id)
        .order_by(LensProposal.created_at.desc())
    )
    return [LensProposalOut.model_validate(p) for p in result.scalars().all()]

