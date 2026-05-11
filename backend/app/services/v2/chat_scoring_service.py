"""
Scoring kandydatów do Dynamic Chat.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

import numpy as np

_MIN_SCORE = 0.30
_ACTIVITY_BOOST = 1.15
_MAX_INACTIVE_DAYS = 180
_RECENT_ACTIVE_DAYS = 90
_DEFAULT_RESPONSIVENESS = 0.5


@dataclass
class CandidateScore:
    user_id: str
    score: float
    breakdown: dict


def _cosine(a: list[float], b: list[float]) -> float:
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    return float(np.dot(va, vb))


def _days_since(dt: datetime | None) -> float:
    if dt is None:
        return float("inf")
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - dt).total_seconds() / 86400


def _hpo_jaccard(a: list[str], b: list[str]) -> float:
    if not a or not b:
        return 0.0
    sa, sb = set(a), set(b)
    inter = len(sa & sb)
    union = len(sa | sb)
    return inter / union if union else 0.0


def _location_score(
    req_city: str | None,
    req_country: str | None,
    cand_city: str | None,
    cand_country: str | None,
) -> float:
    if req_city and cand_city and req_city.lower() == cand_city.lower():
        return 1.0
    if req_country and cand_country and req_country.lower() == cand_country.lower():
        return 0.5
    return 0.0


def score_candidate(
    query_embedding: list[float],
    requester_hpo: list[str],
    requester_city: str | None,
    requester_country: str | None,
    candidate: dict,
    include_location: bool,
) -> CandidateScore:
    """
    Oblicza score kandydata do czatu.

    candidate dict:
        id, searchable, status, last_login_at,
        post_vector, hpo_ids (lista str),
        chat_response_rate, location_city, location_country
    """
    user_id = str(candidate["id"])

    if not candidate.get("searchable"):
        return CandidateScore(user_id=user_id, score=0.0, breakdown={"skip": "not_searchable"})
    if candidate.get("status") != "active":
        return CandidateScore(user_id=user_id, score=0.0, breakdown={"skip": "not_active"})

    days_inactive = _days_since(candidate.get("last_login_at"))
    if days_inactive > _MAX_INACTIVE_DAYS:
        return CandidateScore(user_id=user_id, score=0.0, breakdown={"skip": "inactive"})

    post_vector = candidate.get("post_vector")
    semantic = _cosine(query_embedding, post_vector) if post_vector else 0.0

    hpo_ids = candidate.get("hpo_ids") or []
    hpo_sim = _hpo_jaccard(requester_hpo, hpo_ids)

    resp_rate = candidate.get("chat_response_rate")
    responsiveness = float(resp_rate) if resp_rate is not None else _DEFAULT_RESPONSIVENESS

    location = 0.0
    if include_location:
        location = _location_score(
            requester_city,
            requester_country,
            candidate.get("location_city"),
            candidate.get("location_country"),
        )

    raw = (
        0.40 * semantic
        + 0.25 * hpo_sim
        + 0.20 * responsiveness
        + 0.15 * location
    )

    boost = _ACTIVITY_BOOST if days_inactive < _RECENT_ACTIVE_DAYS else 1.0
    final = round(min(1.0, raw * boost), 4)

    return CandidateScore(
        user_id=user_id,
        score=final,
        breakdown={
            "semantic": round(semantic, 4),
            "hpo_sim": round(hpo_sim, 4),
            "responsiveness": round(responsiveness, 4),
            "location": round(location, 4),
            "activity_boost": boost,
        },
    )


def find_top_candidates(
    query_embedding: list[float],
    requester_hpo: list[str],
    requester_city: str | None,
    requester_country: str | None,
    candidates: list[dict],
    target_count: int,
    include_location: bool,
) -> list[CandidateScore]:
    """
    Zwraca top N kandydatów powyżej progu MIN_SCORE, posortowanych malejąco.
    Może zwrócić mniej niż target_count jeśli brak kandydatów.
    """
    scores = [
        score_candidate(
            query_embedding,
            requester_hpo,
            requester_city,
            requester_country,
            c,
            include_location,
        )
        for c in candidates
    ]
    qualified = [s for s in scores if s.score >= _MIN_SCORE]
    qualified.sort(key=lambda x: x.score, reverse=True)
    return qualified[:target_count]
