from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class GroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    description: str | None
    member_count: int
    is_active: bool
    created_at: datetime
    accent_color: str | None = None
    keywords: list[str] | None = None
    symptom_category: str | None = None


class GroupMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user_id: UUID
    display_name: str
    joined_at: datetime
