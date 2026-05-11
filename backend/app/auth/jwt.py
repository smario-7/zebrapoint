"""
JWT: access token (krótki) + refresh token (długi, stan w Redis).
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from fastapi import HTTPException, status
from redis.asyncio import Redis

from app.config import settings


def create_access_token(data: str | dict[str, Any]) -> str:
    """Tworzy access token. Akceptuje `user_id` albo dict z polem `sub` (zgodność z v1)."""
    if isinstance(data, str):
        user_id = data
    else:
        user_id = data.get("sub")
    if not user_id:
        raise ValueError("Brak identyfikatora użytkownika (sub) w payloadzie tokenu")
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(user_id: str) -> tuple[str, str]:
    now = datetime.now(timezone.utc)
    jti = str(uuid.uuid4())
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "jti": jti,
        "iat": now,
        "exp": now + timedelta(days=settings.refresh_token_expire_days),
    }
    token = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    return token, jti


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesja wygasła — zaloguj się ponownie",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy token",
        )
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy typ tokenu",
        )
    return payload


def decode_refresh_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy lub wygasły refresh token",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy lub wygasły refresh token",
        )
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy typ tokenu",
        )
    return payload


_REDIS_PREFIX = "refresh:"


async def store_refresh_token(redis: Redis, jti: str, user_id: str) -> None:
    key = f"{_REDIS_PREFIX}{jti}"
    ttl_seconds = settings.refresh_token_expire_days * 24 * 3600
    await redis.setex(key, ttl_seconds, user_id)


async def verify_refresh_token_in_redis(redis: Redis, jti: str) -> str | None:
    key = f"{_REDIS_PREFIX}{jti}"
    return await redis.get(key)


async def revoke_refresh_token(redis: Redis, jti: str) -> None:
    await redis.delete(f"{_REDIS_PREFIX}{jti}")
