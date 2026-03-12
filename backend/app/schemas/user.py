from pydantic import BaseModel, EmailStr, field_validator
from uuid import UUID
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    display_name: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Hasło musi mieć co najmniej 8 znaków")
        return v

    @field_validator("display_name")
    @classmethod
    def display_name_length(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Nazwa musi mieć co najmniej 2 znaki")
        if len(v) > 100:
            raise ValueError("Nazwa może mieć maksymalnie 100 znaków")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: UUID
    email: str
    display_name: str
    avatar_url: str | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UpdateProfile(BaseModel):
    display_name: str | None = None

    @field_validator("display_name")
    @classmethod
    def validate_name(cls, v):
        if v is not None:
            v = v.strip()
            if len(v) < 2:
                raise ValueError("Min. 2 znaki")
            if len(v) > 100:
                raise ValueError("Max. 100 znaków")
        return v


class UpdatePassword(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError("Min. 8 znaków")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
