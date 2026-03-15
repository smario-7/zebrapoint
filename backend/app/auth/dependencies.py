import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Query, WebSocket, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.auth.jwt import decode_access_token
from app.database import get_db
from app.models.user import User

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Dependency: weryfikuje token i zwraca zalogowanego użytkownika."""
    token = credentials.credentials
    payload = decode_access_token(token)

    user_id_raw = payload.get("sub")
    if not user_id_raw:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy token — brak user_id"
        )
    try:
        user_id = UUID(user_id_raw) if isinstance(user_id_raw, str) else user_id_raw
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy token — błędny user_id"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Użytkownik nie istnieje"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Konto jest nieaktywne"
        )
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """
    Sprawdza czy konto aktywne i czy ban nie wygasł (auto-odbanowanie).
    """
    is_banned = getattr(current_user, "is_banned", False)
    banned_until = getattr(current_user, "banned_until", None)
    if is_banned and banned_until and datetime.now(timezone.utc) > banned_until:
        current_user.is_banned = False
        current_user.banned_until = None
        current_user.ban_reason = None
        db.commit()
        db.refresh(current_user)

    if getattr(current_user, "is_banned", False):
        reason = getattr(current_user, "ban_reason", None) or "naruszenie regulaminu"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Konto zablokowane. Powód: {reason}"
        )
    return current_user


def require_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Wymagana rola admin — 403 dla zwykłego użytkownika."""
    if getattr(current_user, "role", None) != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Wymagane uprawnienia administratora"
        )
    return current_user


async def get_current_user_ws(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Weryfikacja użytkownika dla połączeń WebSocket.

    Token JWT jest przekazywany w parametrze query: ?token=JWT.
    Zwraca obiekt User lub None (bez podnoszenia HTTPException),
    ponieważ WebSocket nie obsługuje standardowych odpowiedzi HTTP.
    """
    try:
        payload = decode_access_token(token)
    except JWTError as exc:
        logger.warning("WebSocket auth failed: %s", exc)
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

