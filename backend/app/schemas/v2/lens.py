import uuid

from pydantic import BaseModel, ConfigDict


class LensOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    type: str
    emoji: str | None = None
    is_active: bool


class LensWithScore(LensOut):
    score: float
