"""
Silnik dopasowania postów do soczewek.

Algorytm:
  semantic_score = cosine_similarity(post.embedding, lens.embedding)
  hpo_score      = hpo_overlap (Jaccard) między listami HPO
  final_score    = 0.65 * semantic_score + 0.35 * hpo_score
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class LensMatchResult:
    lens_id: str
    match_score: float
    score_breakdown: dict


def compute_hpo_overlap(
    post_hpo: list[str],
    lens_hpo_cluster: list[str],
) -> float:
    """
    Jaccard similarity między HPO terms posta a HPO cluster soczewki.
    Zwraca 0.0 jeśli któraś lista jest pusta.
    """
    if not post_hpo or not lens_hpo_cluster:
        return 0.0
    post_set = set(post_hpo)
    lens_set = set(lens_hpo_cluster)
    intersection = len(post_set & lens_set)
    union = len(post_set | lens_set)
    return intersection / union if union > 0 else 0.0


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """
    Cosine similarity między dwoma wektorami.
    Przy znormalizowanych embeddingach to iloczyn skalarny.
    """
    a = np.array(vec_a, dtype=np.float32)
    b = np.array(vec_b, dtype=np.float32)
    return float(np.dot(a, b))


def _as_float_list(vec: list[float] | object) -> list[float]:
    if hasattr(vec, "tolist"):
        return [float(x) for x in vec.tolist()]
    return [float(x) for x in vec]


def match_post_to_lenses(
    post_embedding: list[float],
    post_hpo_terms: list[str],
    lenses: list[dict],
) -> list[LensMatchResult]:
    """
    Oblicza score dopasowania posta do każdej soczewki.
    Zwraca posortowaną listę (score malejąco), max max_lenses_per_post wyników
    powyżej match_score_threshold.
    """
    results: list[LensMatchResult] = []

    semantic_weight = 0.65
    hpo_weight = 0.35

    post_emb = _as_float_list(post_embedding)

    for lens in lenses:
        raw_emb = lens.get("embedding")
        if raw_emb is None:
            continue

        lens_emb = _as_float_list(raw_emb)
        if len(lens_emb) != len(post_emb):
            logger.warning(
                "Pominięto soczewkę %s — niezgodny wymiar wektora.",
                lens.get("id"),
            )
            continue

        semantic = cosine_similarity(post_emb, lens_emb)
        hpo = compute_hpo_overlap(post_hpo_terms, lens.get("hpo_cluster") or [])
        final = semantic_weight * semantic + hpo_weight * hpo

        if final >= settings.match_score_threshold:
            results.append(
                LensMatchResult(
                    lens_id=str(lens["id"]),
                    match_score=round(final, 4),
                    score_breakdown={
                        "semantic": round(semantic, 4),
                        "hpo_overlap": round(hpo, 4),
                        "semantic_weight": semantic_weight,
                        "hpo_weight": hpo_weight,
                    },
                )
            )

    results.sort(key=lambda r: r.match_score, reverse=True)
    return results[: settings.max_lenses_per_post]
