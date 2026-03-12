from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class MessageOut(BaseModel):
    id: UUID
    group_id: UUID
    user_id: UUID
    display_name: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class MessageHistoryResponse(BaseModel):
    messages: List[MessageOut]
    total: int
    has_more: bool
    oldest_id: Optional[UUID] = None

