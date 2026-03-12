import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserOut, TokenResponse
from app.auth.jwt import create_access_token
from app.auth.dependencies import get_current_user

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


@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED
)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Rejestracja nowego użytkownika."""

    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Podany adres email jest już zarejestrowany"
        )

    user = User(
        email=user_data.email,
        password_hash=_hash_password(user_data.password),
        display_name=user_data.display_name.strip()
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Logowanie — zwraca JWT token."""

    user = db.query(User).filter(User.email == credentials.email).first()

    if not user or not _verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy email lub hasło"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Konto zostało dezaktywowane"
        )

    token = create_access_token({"sub": str(user.id)})

    return TokenResponse(
        access_token=token,
        user=UserOut.model_validate(user)
    )


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Dane zalogowanego użytkownika."""
    return current_user
