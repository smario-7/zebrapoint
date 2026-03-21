from pydantic import BaseModel, ConfigDict, field_validator
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
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    user_id: UUID
    description: str
    group_id: UUID | None
    match_score: float
    created_at: datetime
    match: MatchResult


class SymptomProfilePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    user_id: UUID
    description: str
    group_id: UUID | None
    match_score: float
    created_at: datetime
    updated_at: datetime


class SymptomUpdate(BaseModel):
    description: str

    @field_validator("description")
    @classmethod
    def validate_length(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 100:
            raise ValueError("Opis min. 100 znaków")
        if len(v) > 1000:
            raise ValueError("Opis max. 1000 znaków")
        return v


class GroupMatchOut(BaseModel):
    group_id: str
    name: str
    accent_color: str
    score_pct: int
    member_count: int
    avg_match_score: float | None
    keywords: list[str]
    age_range: str | None
    symptom_category: str | None
    ai_description: str | None = None
    admin_note: str | None
    is_new_group: bool


class SymptomUpdateResponse(BaseModel):
    profile_id: str
    description: str
    matches: list[GroupMatchOut]


class GroupChoiceRequest(BaseModel):
    profile_id: str
    group_id: str
    score: float
