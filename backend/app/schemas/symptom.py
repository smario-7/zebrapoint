from pydantic import BaseModel, field_validator
from uuid import UUID
from datetime import datetime


class SymptomCreate(BaseModel):
    description: str

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 100:
            raise ValueError(
                f"Opis jest za krótki ({len(v)} znaków). "
                f"Napisz co najmniej 100 znaków."
            )
        if len(v) > 1000:
            raise ValueError(
                f"Opis jest za długi ({len(v)} znaków). "
                f"Maksimum to 1000 znaków."
            )
        return v


class MatchResult(BaseModel):
    group_id: str
    score: float
    is_new: bool
    group_name: str


class SymptomOut(BaseModel):
    id: UUID
    user_id: UUID
    description: str
    group_id: UUID | None
    match_score: float
    created_at: datetime
    match: MatchResult

    class Config:
        from_attributes = True


class SymptomProfilePublic(BaseModel):
    id: UUID
    user_id: UUID
    group_id: UUID | None
    match_score: float
    created_at: datetime

    class Config:
        from_attributes = True
