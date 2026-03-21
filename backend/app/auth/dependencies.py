import logging
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.auth.session import user_from_access_token
from app.config import settings
from app.database import get_db
from app.models.user import User

logger = logging.getLogger(__name__)


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """Dependency: weryfikuje JWT z ciasteczka HttpOnly i zwraca użytkownika."""
    token = request.cookies.get(settings.access_token_cookie_name)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Brak sesji — zaloguj się ponownie",
        )
    user = user_from_access_token(token, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy lub wygasły token",
        )
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
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
            detail=f"Konto zablokowane. Powód: {reason}",
        )
    return current_user


def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Wymagana rola admin — 403 dla zwykłego użytkownika."""
    if getattr(current_user, "role", None) != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Wymagane uprawnienia administratora",
        )
    return current_user
