import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PostCreate(BaseModel):
    title: str
    content: str


class PostUpdate(BaseModel):
    title: str | None = None
    content: str | None = None


class PostOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    author_id: uuid.UUID
    title: str
    content: str
    status: str
    hpo_terms: list[str] | None = None
    context_tags: list[str] | None = None
    comment_count: int
    published_at: datetime | None = None
    created_at: datetime


class PostLensMatchOut(BaseModel):
    lens_id: uuid.UUID
    lens_name: str
    lens_type: str
    lens_emoji: str | None = None
    match_score: float
    score_breakdown: dict | None = None
