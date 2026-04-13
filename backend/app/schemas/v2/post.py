import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PostCreate(BaseModel):
    title: str
    content: str


class PostOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    author_id: uuid.UUID
    title: str
    status: str
    comment_count: int
    published_at: datetime | None = None
    created_at: datetime


class PostDetail(PostOut):
    content: str
