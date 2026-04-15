import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LensOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None = None
    type: str
    emoji: str | None = None
    post_count: int
    activity_level: str
    data_source: str | None = None


class LensWithScore(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None = None
    type: str
    emoji: str | None = None
    post_count: int
    activity_level: str
    data_source: str | None = None
    user_score: float | None = None  # None = brak scoringu (np. nowy user)


class LensPostItem(BaseModel):
    id: uuid.UUID
    title: str
    content: str  # preview (max 300 znaków)
    author_id: uuid.UUID
    match_score: float
    feed_score: float
    comment_count: int
    published_at: datetime | None = None
