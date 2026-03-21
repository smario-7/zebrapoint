import random

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserOut,
    LoginResponse,
    UpdateProfile,
    UpdatePassword,
    NICK_PATTERN,
    RESERVED_NICKS,
)
from app.auth.jwt import create_access_token
from app.auth.dependencies import get_current_user
from app.config import settings
from app.rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["Auth"])

BCRYPT_MAX_BYTES = 72


def _password_bytes(password: str) -> bytes:
    """Hasło jako bajty, max 72 (limit bcrypt)."""
    return password.encode("utf-8")[:BCRYPT_MAX_BYTES]


def _hash_password(password: str) -> str:
    """Hash bcrypt do zapisu w bazie (string)."""
    raw = bcrypt.hashpw(_password_bytes(password), bcrypt.gensalt())
    return raw.decode("ascii")


def _verify_password(password: str, password_hash: str) -> bool:
    """Weryfikacja hasła; hash w bazie mógł powstać z bcrypt lub passlib."""
    return bcrypt.checkpw(_password_bytes(password), password_hash.encode("ascii"))


def _generate_nick_suggestions(nick: str, db: Session) -> list[str]:
    """Generuje do 3 dostępnych alternatyw dla zajętego nicku."""
    suggestions = []
    attempts = [f"{nick}_{i}" for i in range(1, 10)] + [
        f"{nick}{random.randint(10, 99)}" for _ in range(5)
    ]
    for candidate in attempts:
        if len(suggestions) >= 3:
            break
        if not NICK_PATTERN.match(candidate):
            continue
        taken = db.query(User).filter(
            func.lower(User.display_name) == candidate.lower()
        ).first()
        if not taken:
            suggestions.append(candidate)
    return suggestions


@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("10/minute")
def register(request: Request, user_data: UserCreate, db: Session = Depends(get_db)):
    """Rejestracja nowego użytkownika."""

    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Podany adres email jest już zarejestrowany"
        )

    existing_nick = db.query(User).filter(
        func.lower(User.display_name) == user_data.display_name.lower()
    ).first()
    if existing_nick:
        suggestions = _generate_nick_suggestions(user_data.display_name, db)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "field": "display_name",
                "message": f"Nick '{user_data.display_name}' jest już zajęty",
                "suggestions": suggestions,
            },
        )

    user = User(
        email=user_data.email,
        password_hash=_hash_password(user_data.password),
        display_name=user_data.display_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.get("/check-nick")
def check_nick_availability(nick: str, db: Session = Depends(get_db)):
    """
    Sprawdza dostępność nicku (real-time przy rejestracji, z debounce).
    """
    nick = nick.strip()

    if not NICK_PATTERN.match(nick):
        return {
            "available": False,
            "reason": "format",
            "message": "Dozwolone: litery, cyfry, _ i - (3–30 znaków)",
            "suggestions": [],
        }

    if nick.lower() in RESERVED_NICKS:
        return {
            "available": False,
            "reason": "reserved",
            "message": "Ten nick jest zarezerwowany",
            "suggestions": [],
        }

    taken = db.query(User).filter(
        func.lower(User.display_name) == nick.lower()
    ).first()
    if taken:
        suggestions = _generate_nick_suggestions(nick, db)
        return {
            "available": False,
            "reason": "taken",
            "message": f"Nick '{nick}' jest już zajęty",
            "suggestions": suggestions,
        }

    return {
        "available": True,
        "message": "Nick jest dostępny ✓",
        "suggestions": [],
    }


@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
def login(
    request: Request,
    credentials: UserLogin,
    response: Response,
    db: Session = Depends(get_db),
):
    """Logowanie — JWT w ciasteczku HttpOnly (nie w treści JSON)."""

    user = db.query(User).filter(User.email == credentials.email).first()

    if not user or not _verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy email lub hasło",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Konto zostało dezaktywowane",
        )

    token = create_access_token({"sub": str(user.id)})
    max_age_sec = settings.access_token_expire_minutes * 60
    response.set_cookie(
        key=settings.access_token_cookie_name,
        value=token,
        max_age=max_age_sec,
        httponly=True,
        secure=settings.cookie_secure_flag(),
        samesite="lax",
        path="/",
    )

    return LoginResponse(user=UserOut.model_validate(user))


@router.post("/logout")
def logout(response: Response):
    """Kasuje ciasteczko sesji (wylogowanie)."""
    response.delete_cookie(
        key=settings.access_token_cookie_name,
        path="/",
        httponly=True,
        secure=settings.cookie_secure_flag(),
        samesite="lax",
    )
    return {"message": "Wylogowano"}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Dane zalogowanego użytkownika."""
    return current_user


@router.patch("/me", response_model=UserOut)
def update_profile(
    data: UpdateProfile,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aktualizacja display_name z zachowaniem unikalności (case-insensitive)."""
    if data.display_name is not None:
        new_name = data.display_name.strip()
        if new_name.lower() != current_user.display_name.lower():
            conflict = (
                db.query(User)
                .filter(
                    func.lower(User.display_name) == new_name.lower(),
                    User.id != current_user.id,
                )
                .first()
            )
            if conflict:
                suggestions = _generate_nick_suggestions(new_name, db)
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "message": f"Nick '{new_name}' jest już zajęty",
                        "suggestions": suggestions,
                    },
                )
        current_user.display_name = new_name
    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/me/password")
def change_password(
    data: UpdatePassword,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Zmiana hasła."""
    if not _verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aktualne hasło jest nieprawidłowe",
        )
    current_user.password_hash = _hash_password(data.new_password)
    db.commit()
    return {"message": "Hasło zostało zmienione"}
