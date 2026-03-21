"""Wspólna logika: użytkownik z surowego tokenu JWT (cookie lub przyszłe użycia)."""

from uuid import UUID

from fastapi import HTTPException
from jose import JWTError
from sqlalchemy.orm import Session

from app.auth.jwt import decode_access_token
from app.models.user import User


def user_from_access_token(token: str | None, db: Session) -> User | None:
    """Zwraca User lub None przy błędnym/wygasłym tokenie (bez podnoszenia HTTPException)."""
    if not token or not isinstance(token, str):
        return None
    try:
        payload = decode_access_token(token)
    except (HTTPException, JWTError):
        return None

    user_id_raw = payload.get("sub")
    if not user_id_raw:
        return None
    try:
        user_id = UUID(user_id_raw) if isinstance(user_id_raw, str) else user_id_raw
    except (ValueError, TypeError):
        return None

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        return None
    return user
