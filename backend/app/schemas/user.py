import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

NICK_PATTERN = re.compile(r"^[a-zA-Z0-9_\-]{3,30}$")
RESERVED_NICKS = {
    "admin", "moderator", "zebrapoint", "support",
    "system", "bot", "help", "info", "kontakt"
}


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    display_name: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Hasło musi mieć co najmniej 8 znaków")
        if len(v) > 128:
            raise ValueError("Hasło może mieć maksymalnie 128 znaków")
        return v

    @field_validator("display_name")
    @classmethod
    def validate_nick(cls, v: str) -> str:
        v = v.strip()
        if not NICK_PATTERN.match(v):
            raise ValueError(
                "Nick może zawierać tylko litery, cyfry, _ i -. Długość: 3–30 znaków."
            )
        if v.lower() in RESERVED_NICKS:
            raise ValueError(f"Nick '{v}' jest zarezerwowany")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_max_length(cls, v: str) -> str:
        if len(v) > 128:
            raise ValueError("Hasło może mieć maksymalnie 128 znaków")
        return v


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: str
    display_name: str
    avatar_url: str | None
    is_active: bool
    role: str = "user"
    created_at: datetime


class UpdateProfile(BaseModel):
    display_name: str | None = None

    @field_validator("display_name")
    @classmethod
    def validate_nick(cls, v):
        if v is not None:
            v = v.strip()
            if not NICK_PATTERN.match(v):
                raise ValueError(
                    "Nick może zawierać tylko litery, cyfry, _ i -. Długość: 3–30 znaków."
                )
            if v.lower() in RESERVED_NICKS:
                raise ValueError(f"Nick '{v}' jest zarezerwowany")
        return v


class UpdatePassword(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError("Min. 8 znaków")
        if len(v) > 128:
            raise ValueError("Maks. 128 znaków")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class LoginResponse(BaseModel):
    """Odpowiedź logowania — JWT jest tylko w ciasteczku HttpOnly."""

    user: UserOut
