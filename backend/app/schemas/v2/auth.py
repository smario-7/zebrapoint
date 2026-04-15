from pydantic import BaseModel, EmailStr, field_validator

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
