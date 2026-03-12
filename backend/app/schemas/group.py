from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class GroupOut(BaseModel):
    id: UUID
    name: str
    description: str | None
    member_count: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class GroupMemberOut(BaseModel):
    user_id: UUID
    display_name: str
    joined_at: datetime

    class Config:
        from_attributes = True
