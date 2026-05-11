"""Użytkownik z access tokenu JWT (np. cookie) — sesja synchroniczna dla kodu v1."""

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.auth.jwt import decode_access_token
from app.models.user import User


def user_from_access_token(token: str | None, db: Session) -> User | None:
    if not token or not isinstance(token, str):
        return None
    try:
        payload = decode_access_token(token)
    except HTTPException:
        return None

    user_id_raw = payload.get("sub")
    if not user_id_raw:
        return None
    try:
        user_id = UUID(str(user_id_raw))
    except (ValueError, TypeError):
        return None

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        return None
    return user
