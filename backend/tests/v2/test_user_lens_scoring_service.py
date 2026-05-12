"""Scoring user ↔ lens: wektory z pgvector bywają numpy — nie wolno bool(ndarray)."""

import numpy as np

from app.services.v2.user_lens_scoring_service import _has_vector, score_lens_for_user


def test_has_vector_numpy():
    assert _has_vector(np.array([1.0, 2.0])) is True
    assert _has_vector(np.array([])) is False
    assert _has_vector(None) is False
    assert _has_vector([1.0]) is True
    assert _has_vector([]) is False


def test_score_lens_symptomatic_with_numpy_vectors():
    emb = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    hpo = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    lens = {
        "id": "00000000-0000-0000-0000-000000000001",
        "type": "symptomatic",
        "embedding": emb,
    }
    ls = score_lens_for_user(
        lens=lens,
        user_diagnosis_vector=None,
        user_hpo_vector=hpo,
        user_post_vector=None,
        user_has_diagnosis=False,
        community_vector=None,
    )
    assert ls.score == 1.0
    assert ls.score_breakdown.get("method") == "hpo_vector"


def test_score_lens_topical_numpy_no_ambiguous_bool():
    comm = np.array([0.0, 1.0, 0.0], dtype=np.float32)
    post = np.array([0.0, 1.0, 0.0], dtype=np.float32)
    lens = {
        "id": "00000000-0000-0000-0000-000000000002",
        "type": "topical",
        "embedding": np.array([1.0, 0.0, 0.0]),
    }
    ls = score_lens_for_user(
        lens=lens,
        user_diagnosis_vector=None,
        user_hpo_vector=None,
        user_post_vector=post,
        user_has_diagnosis=False,
        community_vector=comm,
    )
    assert ls.score == 1.0
    assert ls.score_breakdown.get("method") == "community_vector"
