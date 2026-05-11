"""Router v2: wyszukiwanie terminów HPO (autocomplete onboardingu)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_active_user, get_db
from app.models.v2.hpo import HpoTerm
from app.models.v2.user import User

router = APIRouter(prefix="/api/v2/hpo", tags=["HPO v2"])


class HpoSearchItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    hpo_id: str
    label_pl: str | None
    label_en: str


@router.get("/search", response_model=list[HpoSearchItem])
async def search_hpo(
    q: str = Query(min_length=2, description="Fragment nazwy PL lub EN"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    pattern = f"%{q}%"
    result = await db.execute(
        select(HpoTerm)
        .where(or_(HpoTerm.label_en.ilike(pattern), HpoTerm.label_pl.ilike(pattern)))
        .order_by(HpoTerm.label_en.asc())
        .limit(20)
    )
    terms = result.scalars().all()
    return [
        HpoSearchItem(
            hpo_id=t.hpo_id,
            label_pl=t.label_pl,
            label_en=t.label_en,
        )
        for t in terms
    ]
