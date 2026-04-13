"""
Tłumaczenie etykiet HPO z angielskiego na polski (MyMemory API).
Cache w Redis (klucz: trans:en:pl:{skrót SHA256}, TTL 30 dni).
Przy błędzie API zwraca None — import może zapisać label_pl = NULL.
"""

from __future__ import annotations

import hashlib
import logging
import httpx
from redis.asyncio import Redis

logger = logging.getLogger(__name__)

_MYMEMORY_URL = "https://api.mymemory.translated.net/get"
_CACHE_TTL = 30 * 24 * 3600
_CACHE_PREFIX = "trans:en:pl:"
_MAX_TEXT_LENGTH = 500


def _cache_key(text: str) -> str:
    digest = hashlib.sha256(text.encode()).hexdigest()[:16]
    return f"{_CACHE_PREFIX}{digest}"


async def translate_to_polish(
    text: str,
    redis: Redis,
    *,
    timeout: float = 5.0,
) -> str | None:
    if not text or not text.strip():
        return None

    text = text[:_MAX_TEXT_LENGTH]
    key = _cache_key(text)

    cached = await redis.get(key)
    if cached is not None:
        return cached

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(
                _MYMEMORY_URL,
                params={"q": text, "langpair": "en|pl"},
            )
            response.raise_for_status()
            data = response.json()

        translated = data.get("responseData", {}).get("translatedText")
        if not translated or translated == text:
            return None

        await redis.setex(key, _CACHE_TTL, translated)
        return translated

    except (httpx.HTTPError, KeyError, TypeError, ValueError) as e:
        logger.warning("Błąd tłumaczenia dla '%s': %s", text[:50], e)
        return None
