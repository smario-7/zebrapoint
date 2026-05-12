import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.v2.user import User


class HpoTermOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    hpo_id: str
    label_pl: str | None
    label_en: str


class OrphaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    orpha_id: int
    name_pl: str
    name_en: str


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
    diagnosis_confirmed: bool = False
    orpha_id: int | None = None
    consent_data_processing: bool = False
    consent_searchable_info: bool = False
    hpo_profile: list[HpoTermOut] = Field(default_factory=list)
    orpha_disease: OrphaOut | None = None


def user_to_user_out(user: User) -> UserOut:
    hp: list[HpoTermOut] = []
    for p in user.hpo_profile or []:
        t = p.hpo_term
        hp.append(
            HpoTermOut(
                hpo_id=p.hpo_id,
                label_pl=t.label_pl if t else None,
                label_en=t.label_en if t else "",
            )
        )
    orpha_out: OrphaOut | None = None
    if user.orpha_id is not None and user.orpha_disease is not None:
        d = user.orpha_disease
        orpha_out = OrphaOut(orpha_id=d.orpha_id, name_pl=d.name_pl, name_en=d.name_en)
    return UserOut(
        id=user.id,
        email=user.email,
        username=user.username,
        created_at=user.created_at,
        updated_at=user.updated_at,
        role=user.role,
        status=user.status,
        onboarding_completed=user.onboarding_completed,
        searchable=user.searchable,
        location_city=user.location_city,
        location_country=user.location_country,
        post_count=user.post_count,
        symptom_description=user.symptom_description,
        diagnosis_confirmed=user.diagnosis_confirmed,
        orpha_id=user.orpha_id,
        consent_data_processing=user.consent_data_processing,
        consent_searchable_info=user.consent_searchable_info,
        hpo_profile=hp,
        orpha_disease=orpha_out,
    )


class UpdateProfileRequest(BaseModel):
    username: str | None = None
    location_city: str | None = None
    location_country: str | None = None
    searchable: bool | None = None
    onboarding_completed: bool | None = None

    @field_validator("username")
    @classmethod
    def username_format(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not (3 <= len(v) <= 30):
            raise ValueError("Nick musi mieć 3–30 znaków")
        return v


class HealthProfileUpdate(BaseModel):
    symptom_description: str | None = Field(None, max_length=20000)
    hpo_ids: list[str] = Field(default_factory=list, max_length=50)
    diagnosis_confirmed: bool = False
    orpha_id: int | None = None
    consent_searchable_info: bool = False
    searchable: bool = False
    location_city: str | None = None
    location_country: str = "PL"

    @field_validator("symptom_description")
    @classmethod
    def symptom_len(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        if len(s) > 20000:
            raise ValueError("Opis objawów może mieć maksymalnie 20000 znaków")
        return s or None

    @field_validator("location_country")
    @classmethod
    def country_code(cls, v: str) -> str:
        s = (v or "PL").strip().upper() or "PL"
        if len(s) > 8:
            raise ValueError("Kod kraju jest za długi")
        return s
