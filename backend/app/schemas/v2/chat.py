import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ChatCreate(BaseModel):
    query_text: str
    target_count: int
    include_location: bool = False


class ChatOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    creator_id: uuid.UUID
    query_text: str
    status: str
    created_at: datetime


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    chat_id: uuid.UUID
    author_id: uuid.UUID
    content: str
    created_at: datetime
