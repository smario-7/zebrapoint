import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    username: str
    created_at: datetime
    updated_at: datetime
    role: str
    status: str
    onboarding_completed: bool
    searchable: bool
    location_city: str | None = None
    location_country: str
    post_count: int
    symptom_description: str | None = None


class UpdateProfileRequest(BaseModel):
    username: str | None = None
    symptom_description: str | None = None
    location_city: str | None = None
    location_country: str | None = None
    searchable: bool | None = None
    onboarding_completed: bool | None = None

    @field_validator("symptom_description")
    @classmethod
    def symptom_len(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        if len(s) > 20000:
            raise ValueError("Opis objawów może mieć maksymalnie 20000 znaków")
        return s or None

    @field_validator("username")
    @classmethod
    def username_format(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not (3 <= len(v) <= 30):
            raise ValueError("Nick musi mieć 3–30 znaków")
        return v
