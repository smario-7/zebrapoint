"""
Serwis scoringu User ↔ Lens (v2).

Oblicza score dopasowania użytkownika do soczewek na podstawie embeddingów.
Wyniki są liczone asynchronicznie (Celery) i zapisywane do tabeli user_lens_scores.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import numpy as np

logger = logging.getLogger(__name__)

# Wagi dla filtra "ogólny"
_WEIGHTS_WITH_DIAGNOSIS = {"diagnostic": 0.50, "symptomatic": 0.30, "topical": 0.20}
_WEIGHTS_NO_DIAGNOSIS = {"diagnostic": 0.20, "symptomatic": 0.50, "topical": 0.30}

# Fallback score dla soczewek tematycznych bez community vector
_TOPICAL_NO_COMMUNITY = 0.3
_TOPICAL_NO_USER_VECTOR = 0.2

# Multiplier gdy użyjemy "zastępczego" wektora (np. HPO zamiast diagnozy)
_FALLBACK_MULTIPLIER = 0.8


@dataclass(frozen=True)
class LensScore:
    lens_id: str
    lens_type: str
    score: float
    score_breakdown: dict


def _cosine(a: list[float], b: list[float]) -> float:
    """
    Cosine similarity dla wektorów już znormalizowanych.

    W naszym pipeline embeddingi są normalizowane przy enkodowaniu, więc
    cosine similarity to zwykły iloczyn skalarny.
    """
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    return float(np.dot(va, vb))


def _avg_vectors(vectors: list[list[float]]) -> list[float] | None:
    """Średnia z listy wektorów. Zwraca None dla pustej listy."""
    if not vectors:
        return None
    arr = np.array(vectors, dtype=np.float32)
    avg = arr.mean(axis=0)
    norm = np.linalg.norm(avg)
    if norm > 0:
        avg = avg / norm
    return avg.tolist()


def score_lens_for_user(
    *,
    lens: dict,
    user_diagnosis_vector: list[float] | None,
    user_hpo_vector: list[float] | None,
    user_post_vector: list[float] | None,
    user_has_diagnosis: bool,
    community_vector: list[float] | None,
) -> LensScore:
    """
    Oblicza score jednej soczewki dla użytkownika.

    Args:
        lens: {"id": str, "type": str, "embedding": list[float] | None}
        user_diagnosis_vector: wektor diagnozy usera (może być None)
        user_hpo_vector: wektor profilu HPO usera (może być None)
        user_post_vector: wektor aktywności pisania usera (może być None)
        user_has_diagnosis: czy user ma potwierdzoną diagnozę
        community_vector: uśredniony wektor userów z postami w tej soczewce
    """
    lens_type = lens.get("type")
    lens_embedding = lens.get("embedding")
    breakdown: dict = {"type": lens_type}

    if lens_type == "diagnostic":
        if user_diagnosis_vector and lens_embedding:
            s = _cosine(user_diagnosis_vector, lens_embedding)
            breakdown.update({"method": "diagnosis_vector", "raw": round(s, 4)})
            score = s
        elif user_hpo_vector and lens_embedding:
            s = _cosine(user_hpo_vector, lens_embedding) * _FALLBACK_MULTIPLIER
            breakdown.update({"method": "hpo_vector_fallback", "raw": round(s, 4)})
            score = s
        else:
            score = 0.0
            breakdown["method"] = "no_vector"

    elif lens_type == "symptomatic":
        if user_hpo_vector and lens_embedding:
            s = _cosine(user_hpo_vector, lens_embedding)
            breakdown.update({"method": "hpo_vector", "raw": round(s, 4)})
            score = s
        elif user_diagnosis_vector and lens_embedding:
            s = _cosine(user_diagnosis_vector, lens_embedding) * _FALLBACK_MULTIPLIER
            breakdown.update({"method": "diagnosis_vector_fallback", "raw": round(s, 4)})
            score = s
        else:
            score = 0.0
            breakdown["method"] = "no_vector"

    elif lens_type == "topical":
        if community_vector and user_post_vector:
            s = _cosine(user_post_vector, community_vector)
            breakdown.update({"method": "community_vector", "raw": round(s, 4)})
            score = s
        elif not community_vector:
            score = _TOPICAL_NO_COMMUNITY
            breakdown["method"] = "no_community_default"
        else:
            score = _TOPICAL_NO_USER_VECTOR
            breakdown["method"] = "no_user_post_vector"

    else:
        score = 0.0
        breakdown["method"] = "unknown_type"

    clamped = round(max(0.0, min(1.0, float(score))), 4)
    breakdown["clamped"] = clamped

    # Informacyjne: wagi "combined" zależą od profilu usera, więc tu tylko sygnał
    breakdown["user_has_diagnosis"] = bool(user_has_diagnosis)

    return LensScore(
        lens_id=str(lens["id"]),
        lens_type=str(lens_type),
        score=clamped,
        score_breakdown=breakdown,
    )


def compute_combined_scores(
    lens_scores: list[LensScore],
    *,
    user_has_diagnosis: bool,
) -> dict[str, float]:
    """
    Oblicza score "ogólny" dla każdej soczewki — ważona suma typów.

    Zwraca dict {lens_id: combined_score}.
    """
    weights = _WEIGHTS_WITH_DIAGNOSIS if user_has_diagnosis else _WEIGHTS_NO_DIAGNOSIS
    scores_by_id: dict[str, dict[str, float]] = {}
    for ls in lens_scores:
        scores_by_id.setdefault(ls.lens_id, {})[ls.lens_type] = float(ls.score)

    combined: dict[str, float] = {}
    for lens_id, type_scores in scores_by_id.items():
        c = sum(weights.get(t, 0.0) * s for t, s in type_scores.items())
        combined[lens_id] = round(float(c), 4)
    return combined

