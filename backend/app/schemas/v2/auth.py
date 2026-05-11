from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.schemas.v2.user import UserOut


class UpdatePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def new_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Hasło musi mieć co najmniej 8 znaków")
        if len(v) > 128:
            raise ValueError("Hasło może mieć maksymalnie 128 znaków")
        return v


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    username: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Hasło musi mieć co najmniej 8 znaków")
        return v

    @field_validator("username")
    @classmethod
    def username_format(cls, v: str) -> str:
        v = v.strip()
        if not (3 <= len(v) <= 30):
            raise ValueError("Nick musi mieć 3–30 znaków")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    user: UserOut


class OnboardingRequest(BaseModel):
    symptom_description: str = Field(default="", max_length=20000)
    hpo_ids: list[str] = Field(default_factory=list, max_length=50)
    diagnosis_confirmed: bool = False
    orpha_id: int | None = None
    consent_data_processing: bool = False
    consent_searchable_info: bool = False
    searchable: bool = False
    location_city: str | None = None
    location_country: str = "PL"

    @field_validator("symptom_description")
    @classmethod
    def strip_symptoms(cls, v: str) -> str:
        return (v or "").strip()

    @field_validator("location_city")
    @classmethod
    def strip_city(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        return s or None

    @field_validator("location_country")
    @classmethod
    def strip_country(cls, v: str) -> str:
        s = (v or "PL").strip()
        return s or "PL"

    @field_validator("hpo_ids")
    @classmethod
    def unique_hpo(cls, v: list[str]) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        for x in v:
            x = x.strip()
            if not x or x in seen:
                continue
            seen.add(x)
            out.append(x)
        return out

    @model_validator(mode="after")
    def consents_and_diagnosis(self):
        if not self.consent_data_processing:
            raise ValueError("Wymagana zgoda na przetwarzanie danych")
        if self.diagnosis_confirmed and not self.orpha_id:
            raise ValueError("Przy potwierdzonej diagnozie wybierz chorobę z katalogu")
        if not self.diagnosis_confirmed:
            self.orpha_id = None
        return self
