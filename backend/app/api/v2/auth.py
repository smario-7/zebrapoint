"""
Router auth v2: rejestracja, logowanie, odświeżanie tokenu, profil.
"""
import logging
import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from redis.asyncio import Redis
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    revoke_refresh_token,
    store_refresh_token,
    verify_refresh_token_in_redis,
)
from app.config import settings
from app.core.dependencies import get_current_active_user, get_db, get_redis_auth
from app.core.security import hash_password, verify_password
from app.models.v2.hpo import HpoTerm, OrphaDisease, UserHpoProfile
from app.models.v2.user import User
from app.rate_limit import limiter
from app.schemas.v2.admin import OrphaSearchResult
from app.schemas.v2.auth import (
    LoginRequest,
    LoginResponse,
    OnboardingRequest,
    RegisterRequest,
    UpdatePasswordRequest,
)
from app.schemas.v2.user import UpdateProfileRequest, UserOut

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/auth", tags=["Auth v2"])

_NICK_MIN = 3
_NICK_MAX = 30


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    secure = settings.cookie_secure_flag()
    response.set_cookie(
        key=settings.access_token_cookie_name,
        value=access_token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        key=settings.refresh_token_cookie_name,
        value=refresh_token,
        max_age=settings.refresh_token_expire_days * 24 * 3600,
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/api/v2/auth/refresh",
    )


def _clear_auth_cookies(response: Response) -> None:
    secure = settings.cookie_secure_flag()
    for name, path in [
        (settings.access_token_cookie_name, "/"),
        (settings.refresh_token_cookie_name, "/api/v2/auth/refresh"),
    ]:
        response.delete_cookie(key=name, path=path, httponly=True, secure=secure, samesite="lax")


async def _nick_suggestions(base: str, db: AsyncSession) -> list[str]:
    candidates = [f"{base}_{i}" for i in range(1, 10)] + [
        f"{base}{random.randint(10, 99)}" for _ in range(5)
    ]
    suggestions: list[str] = []
    for candidate in candidates:
        if len(suggestions) >= 3:
            break
        if not (_NICK_MIN <= len(candidate) <= _NICK_MAX):
            continue
        result = await db.execute(
            select(User).where(func.lower(User.username) == candidate.lower())
        )
        if not result.scalar_one_or_none():
            suggestions.append(candidate)
    return suggestions


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(
    request: Request,
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email jest już zarejestrowany",
        )

    result = await db.execute(
        select(User).where(func.lower(User.username) == data.username.lower())
    )
    if result.scalar_one_or_none():
        suggestions = await _nick_suggestions(data.username, db)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "field": "username",
                "message": f"Nick '{data.username}' jest już zajęty",
                "suggestions": suggestions,
            },
        )

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        username=data.username,
        status="pending_onboarding",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis_auth),
):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy email lub hasło",
        )

    if user.status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Konto zostało zawieszone",
        )

    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    access_token = create_access_token(str(user.id))
    refresh_token, jti = create_refresh_token(str(user.id))
    try:
        await store_refresh_token(redis, jti, str(user.id))
    except Exception:
        logger.exception("Redis niedostępny przy zapisie refresh tokenu")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Nie udało się utworzyć sesji — spróbuj ponownie za chwilę",
        )

    _set_auth_cookies(response, access_token, refresh_token)
    return LoginResponse(user=UserOut.model_validate(user))


@router.post("/refresh")
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis_auth),
):
    token = request.cookies.get(settings.refresh_token_cookie_name)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Brak refresh tokenu",
        )

    payload = decode_refresh_token(token)
    jti = payload.get("jti")
    user_id = payload.get("sub")
    if not jti or not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy refresh token",
        )

    stored_user_id = await verify_refresh_token_in_redis(redis, jti)
    if not stored_user_id or stored_user_id != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesja wygasła — zaloguj się ponownie",
        )

    await revoke_refresh_token(redis, jti)
    new_access = create_access_token(str(user_id))
    new_refresh, new_jti = create_refresh_token(str(user_id))
    await store_refresh_token(redis, new_jti, str(user_id))
    _set_auth_cookies(response, new_access, new_refresh)
    return {"message": "Token odświeżony"}


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    redis: Redis = Depends(get_redis_auth),
):
    token = request.cookies.get(settings.refresh_token_cookie_name)
    if token:
        try:
            payload = decode_refresh_token(token)
            jti = payload.get("jti")
            if jti:
                await revoke_refresh_token(redis, jti)
        except HTTPException:
            pass
    _clear_auth_cookies(response)
    return {"message": "Wylogowano"}


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_active_user)):
    return UserOut.model_validate(current_user)


@router.patch("/me/password")
async def patch_me_password(
    data: UpdatePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aktualne hasło jest nieprawidłowe",
        )
    current_user.password_hash = hash_password(data.new_password)
    await db.commit()
    return {"message": "Hasło zostało zmienione"}


@router.patch("/me", response_model=UserOut)
async def patch_me(
    data: UpdateProfileRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if data.username is not None:
        result = await db.execute(
            select(User).where(
                func.lower(User.username) == data.username.lower(),
                User.id != current_user.id,
            )
        )
        if result.scalar_one_or_none():
            suggestions = await _nick_suggestions(data.username, db)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "field": "username",
                    "message": f"Nick '{data.username}' jest już zajęty",
                    "suggestions": suggestions,
                },
            )
        current_user.username = data.username

    if data.location_city is not None:
        current_user.location_city = data.location_city
    if data.location_country is not None:
        current_user.location_country = data.location_country
    if data.searchable is not None:
        current_user.searchable = data.searchable
    if data.onboarding_completed is not None:
        current_user.onboarding_completed = data.onboarding_completed

    await db.commit()
    await db.refresh(current_user)
    return UserOut.model_validate(current_user)


@router.post("/onboarding", response_model=UserOut)
@limiter.limit("10/minute")
async def complete_onboarding(
    request: Request,
    data: OnboardingRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.onboarding_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Onboarding został już ukończony",
        )

    if data.diagnosis_confirmed and data.orpha_id is not None:
        r = await db.execute(select(OrphaDisease).where(OrphaDisease.orpha_id == data.orpha_id))
        if r.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Wybrana choroba nie występuje jeszcze w katalogu aplikacji",
            )

    if data.hpo_ids:
        r = await db.execute(select(HpoTerm.hpo_id).where(HpoTerm.hpo_id.in_(data.hpo_ids)))
        found = {row[0] for row in r.all()}
        missing = [h for h in data.hpo_ids if h not in found]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Nieznane terminy HPO: {', '.join(missing[:5])}",
            )

    now = datetime.now(timezone.utc)
    current_user.symptom_description = data.symptom_description or None
    current_user.diagnosis_confirmed = data.diagnosis_confirmed
    current_user.orpha_id = data.orpha_id
    current_user.consent_data_processing = data.consent_data_processing
    current_user.consent_searchable_info = data.consent_searchable_info
    current_user.searchable = data.searchable
    current_user.location_city = data.location_city
    current_user.location_country = data.location_country
    current_user.onboarding_completed = True
    current_user.status = "active"

    await db.execute(delete(UserHpoProfile).where(UserHpoProfile.user_id == current_user.id))
    for hpo_id in data.hpo_ids:
        db.add(
            UserHpoProfile(
                user_id=current_user.id,
                hpo_id=hpo_id,
                confidence=1.0,
                source="onboarding",
                created_at=now,
            )
        )

    await db.commit()
    await db.refresh(current_user)

    from app.workers.v2.scoring_tasks import compute_user_vectors

    compute_user_vectors.delay(str(current_user.id))

    return UserOut.model_validate(current_user)


@router.get("/orphanet/search", response_model=list[OrphaSearchResult])
@limiter.limit("30/minute")
async def onboarding_orphanet_search(
    request: Request,
    q: str = Query(min_length=2, description="Nazwa choroby lub kod ORPHA"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    from app.services.v2.orphanet_search_service import search_orphanet_diseases

    return await search_orphanet_diseases(db, q, limit=10)


@router.get("/check-nick")
async def check_nick(nick: str, db: AsyncSession = Depends(get_db)):
    nick = nick.strip()
    if not (_NICK_MIN <= len(nick) <= _NICK_MAX):
        return {
            "available": False,
            "reason": "format",
            "message": f"Nick musi mieć {_NICK_MIN}–{_NICK_MAX} znaków",
        }

    result = await db.execute(select(User).where(func.lower(User.username) == nick.lower()))
    if result.scalar_one_or_none():
        suggestions = await _nick_suggestions(nick, db)
        return {
            "available": False,
            "reason": "taken",
            "message": f"Nick '{nick}' jest zajęty",
            "suggestions": suggestions,
        }

    return {"available": True, "message": "Nick jest dostępny", "suggestions": []}
