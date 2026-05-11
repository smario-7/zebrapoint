"""
Time Decay Feed — ranking postów w soczewce.

Wzór:
    feed_score = match_score * 10 * decay
    decay = 0.5 ^ (age_days / half_life)

half_life zależny od activity_level soczewki:
    high   → 14 dni  (duże soczewki, posty szybko "starzeją się")
    medium → 30 dni
    low    → 90 dni  (rzadkie soczewki, stare posty nadal wartościowe)

Dynamic Window:
    activity_level obliczany co noc przez Celery task
    na podstawie liczby postów z ostatnich 30 dni w soczewce.
"""

from __future__ import annotations

from datetime import datetime, timezone

# Półczasy w dniach wg activity_level
HALF_LIFE: dict[str, int] = {
    "high": 14,
    "medium": 30,
    "low": 90,
}

# Progi dla Dynamic Window (posty z ostatnich 30 dni)
_HIGH_THRESHOLD = 20  # >=20 postów/miesiąc → high
_MEDIUM_THRESHOLD = 5  # 5–19 postów/miesiąc → medium; <5 → low


def compute_feed_score(
    match_score: float,
    published_at: datetime,
    activity_level: str,
    now: datetime | None = None,
) -> float:
    """
    Oblicza feed_score posta w kontekście soczewki.

    Args:
        match_score: wynik dopasowania post↔soczewka (0–1)
        published_at: czas publikacji posta (timezone-aware)
        activity_level: 'high' | 'medium' | 'low'
        now: bieżący czas (domyślnie UTC now); parametr dla testowalności

    Returns:
        feed_score >= 0.0 (nie jest ograniczony do 1.0 — skala 0–10)
    """
    if now is None:
        now = datetime.now(timezone.utc)

    # Upewnij się że published_at jest timezone-aware
    if published_at.tzinfo is None:
        published_at = published_at.replace(tzinfo=timezone.utc)

    age_days = max(0.0, (now - published_at).total_seconds() / 86400)
    half_life = HALF_LIFE.get(activity_level, HALF_LIFE["medium"])
    decay = 0.5 ** (age_days / half_life)
    return round(match_score * 10 * decay, 4)


def determine_activity_level(posts_last_30_days: int) -> str:
    """
    Określa activity_level soczewki na podstawie liczby postów z ostatnich 30 dni.
    Używane przez Celery task aktualizujący soczewki co noc.
    """
    if posts_last_30_days >= _HIGH_THRESHOLD:
        return "high"
    if posts_last_30_days >= _MEDIUM_THRESHOLD:
        return "medium"
    return "low"

