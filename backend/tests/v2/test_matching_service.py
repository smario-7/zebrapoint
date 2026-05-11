"""Testy jednostkowe silnika dopasowania post ↔ soczewka (bez bazy)."""

from unittest.mock import patch

from app.services.v2.matching_service import (
    compute_hpo_overlap,
    cosine_similarity,
    match_post_to_lenses,
)


def test_compute_hpo_overlap_empty():
    assert compute_hpo_overlap([], ["HP:0000001"]) == 0.0
    assert compute_hpo_overlap(["HP:0000001"], []) == 0.0


def test_compute_hpo_overlap_jaccard():
    post = ["HP:0000001", "HP:0000002"]
    lens = ["HP:0000002", "HP:0000003"]
    # intersection 1, union 3
    assert abs(compute_hpo_overlap(post, lens) - 1 / 3) < 1e-6


def test_cosine_similarity_normalized():
    a = [1.0, 0.0, 0.0]
    b = [1.0, 0.0, 0.0]
    assert abs(cosine_similarity(a, b) - 1.0) < 1e-5


@patch("app.services.v2.matching_service.settings")
def test_match_post_to_lenses_threshold_and_limit(mock_settings):
    mock_settings.match_score_threshold = 0.4
    mock_settings.max_lenses_per_post = 2

    emb = [1.0, 0.0]
    lenses = [
        {"id": "00000000-0000-0000-0000-000000000001", "embedding": emb, "hpo_cluster": ["HP:1"]},
        {"id": "00000000-0000-0000-0000-000000000002", "embedding": [0.0, 1.0], "hpo_cluster": []},
        {"id": "00000000-0000-0000-0000-000000000003", "embedding": None, "hpo_cluster": []},
    ]

    results = match_post_to_lenses(emb, ["HP:1"], lenses)
    assert len(results) <= 2
    for r in results:
        assert r.match_score >= 0.4
