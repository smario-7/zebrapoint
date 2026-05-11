"""
Testy ML pipeline (Sprint 7): group_characteristics, group_naming,
should_retrain, run_pipeline. Używają mocków dla bazy i HDBSCAN.
"""
import pytest

pytestmark = pytest.mark.skip(
    reason="Endpointy v1 usunięte z main — backend v2 (zobacz tests/v2/)."
)

import uuid
from unittest.mock import MagicMock, patch

import numpy as np

from app.services.group_characteristics import (
    extract_keywords,
    detect_category,
    detect_age_range,
    update_group_characteristics,
)
from app.services.group_naming import generate_group_name, generate_group_color
from app.services.ml_pipeline import (
    should_retrain,
    run_pipeline,
    MIN_PROFILES_START,
    RETRAIN_EVERY_N,
)


# ── group_characteristics (funkcje czyste, bez bazy) ─────────────────────

class TestExtractKeywords:

    def test_returns_top_n(self):
        texts = [
            "Mój syn ma drżenie rąk i problemy z koordynacją. Napięcie mięśniowe.",
            "Córka ma drżenie i słabe napięcie mięśniowe. Chód niepewny.",
            "Syn ma drżenie przy jedzeniu, napięcie mięśniowe i opóźnienie.",
        ]
        result = extract_keywords(texts, top_n=3)
        assert len(result) == 3
        assert "drżenie" in result
        assert "napięcie" in result or "mięśniowe" in result

    def test_empty_texts_returns_empty_list(self):
        assert extract_keywords([]) == []
        assert extract_keywords([], top_n=5) == []

    def test_respects_stopwords(self):
        texts = ["Jest bardzo dużo problemów i dziecko ma się dobrze."]
        result = extract_keywords(texts, top_n=10)
        assert "jest" not in result
        assert "bardzo" not in result
        assert "problem" not in result

    def test_single_word_repeated(self):
        texts = ["Słowo słowo słowo słowo."]
        result = extract_keywords(texts, top_n=1)
        assert result == ["słowo"]


class TestDetectCategory:

    def test_neurologiczne(self):
        texts = [
            "Drżenie rąk, napięcie mięśniowe, problemy z koordynacją i chodem.",
        ]
        assert detect_category(texts) == "Neurologiczne"

    def test_metaboliczne(self):
        texts = ["Problemy z metabolizmem, cukier, tarczyca i waga."]
        assert detect_category(texts) == "Metaboliczne"

    def test_returns_inne_when_no_match(self):
        texts = ["Xyz abc qwerty randomowy opis bez słów z słownika."]
        assert detect_category(texts) == "Inne"

    def test_empty_texts_returns_inne(self):
        assert detect_category([]) == "Inne"


class TestDetectAgeRange:

    def test_returns_dominant_range(self):
        db = MagicMock()
        mock_user = MagicMock()
        mock_user.age_range = "0–12 lat"
        db.query.return_value.join.return_value.filter.return_value.all.return_value = [
            mock_user,
            mock_user,
            MagicMock(age_range="13–17 lat"),
        ]
        result = detect_age_range(db, str(uuid.uuid4()))
        assert result == "0–12 lat"

    def test_returns_none_when_no_data(self):
        db = MagicMock()
        db.query.return_value.join.return_value.filter.return_value.all.return_value = []
        result = detect_age_range(db, str(uuid.uuid4()))
        assert result is None


class TestUpdateGroupCharacteristics:

    def test_sets_keywords_and_commits(self):
        db = MagicMock()
        profile1 = MagicMock(description="Drżenie i napięcie mięśniowe.", match_score=0.85)
        profile2 = MagicMock(description="Napięcie i koordynacja.", match_score=0.80)
        group = MagicMock(
            id=uuid.uuid4(),
            keywords=None,
            symptom_category=None,
            age_range=None,
            avg_match_score=None,
        )
        query_profiles = MagicMock()
        query_profiles.join.return_value.filter.return_value.all.return_value = [
            profile1,
            profile2,
        ]
        query_group = MagicMock()
        query_group.filter.return_value.first.return_value = group
        query_users = MagicMock()
        query_users.join.return_value.filter.return_value.all.return_value = [
            MagicMock(age_range="0–12 lat"),
        ]
        db.query.side_effect = [query_profiles, query_group, query_users]

        update_group_characteristics(db, str(group.id))

        assert group.keywords is not None
        assert len(group.keywords) <= 5
        assert group.symptom_category == "Neurologiczne"
        assert group.age_range == "0–12 lat"
        assert group.avg_match_score == 0.825
        db.commit.assert_called_once()


# ── group_naming ───────────────────────────────────────────────────────────

class TestGroupNaming:

    def test_generate_group_name_deterministic(self):
        seed = "abc-123"
        a = generate_group_name(seed)
        b = generate_group_name(seed)
        assert a == b
        assert len(a) > 0
        assert " " in a

    def test_generate_group_color_deterministic(self):
        seed = "xyz-456"
        a = generate_group_color(seed)
        b = generate_group_color(seed)
        assert a == b
        assert a.startswith("#")
        assert len(a) == 7

    def test_different_seeds_different_names(self):
        assert generate_group_name("a") != generate_group_name("b")


# ── should_retrain (mockowana sesja) ───────────────────────────────────────

class TestShouldRetrain:

    @patch("app.services.ml_pipeline.get_retrain_every_n", return_value=RETRAIN_EVERY_N)
    def test_false_when_less_than_min_profiles(self, _mock_threshold):
        db = MagicMock()
        db.query.return_value.count.return_value = MIN_PROFILES_START - 1
        assert should_retrain(db) is False

    @patch("app.services.ml_pipeline.get_retrain_every_n", return_value=RETRAIN_EVERY_N)
    def test_true_when_no_previous_run(self, _mock_threshold):
        db = MagicMock()
        q1 = MagicMock()
        q1.count.return_value = 10
        q2 = MagicMock()
        q2.filter.return_value.order_by.return_value.first.return_value = None
        db.query.side_effect = [q1, q2]
        assert should_retrain(db) is True

    @patch("app.services.ml_pipeline.get_retrain_every_n", return_value=RETRAIN_EVERY_N)
    def test_false_when_few_new_profiles(self, _mock_threshold):
        db = MagicMock()
        last_run = MagicMock(run_at=MagicMock())
        q1 = MagicMock()
        q1.count.return_value = 20
        q2 = MagicMock()
        q2.filter.return_value.order_by.return_value.first.return_value = last_run
        q3 = MagicMock()
        q3.filter.return_value.count.return_value = RETRAIN_EVERY_N - 1
        db.query.side_effect = [q1, q2, q3]
        assert should_retrain(db) is False

    @patch("app.services.ml_pipeline.get_retrain_every_n", return_value=RETRAIN_EVERY_N)
    def test_true_when_many_new_profiles(self, _mock_threshold):
        db = MagicMock()
        last_run = MagicMock(run_at=MagicMock())
        q1 = MagicMock()
        q1.count.return_value = 25
        q2 = MagicMock()
        q2.filter.return_value.order_by.return_value.first.return_value = last_run
        q3 = MagicMock()
        q3.filter.return_value.count.return_value = RETRAIN_EVERY_N
        db.query.side_effect = [q1, q2, q3]
        assert should_retrain(db) is True


# ── run_pipeline (mockowana baza i HDBSCAN) ───────────────────────────────

def _make_mock_profiles(n: int, embedding_dim: int = 384):
    base = [0.1] * embedding_dim
    return [
        MagicMock(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            embedding=base,
            description="opis",
            match_score=0.8,
        )
        for _ in range(n)
    ]


class TestRunPipeline:

    def test_skipped_when_insufficient_profiles(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = _make_mock_profiles(3)
        result = run_pipeline(db)
        assert result["status"] == "skipped"
        assert "za mało" in result.get("reason", "")

    def test_skipped_when_no_profiles_with_embedding(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = []
        result = run_pipeline(db)
        assert result["status"] == "skipped"

    @patch("app.services.ml_pipeline._log_run")
    @patch("app.services.ml_pipeline.update_group_characteristics")
    @patch("app.services.ml_pipeline._update_centroids")
    @patch("app.services.ml_pipeline._update_memberships", return_value=1)
    @patch("app.services.ml_pipeline._soft_assign_noise", return_value={})
    @patch("app.services.ml_pipeline._map_clusters_to_groups", return_value={0: "g1", 1: "g2"})
    @patch("app.services.ml_pipeline._run_hdbscan", return_value=np.array([0, 0, 0, 1, 1, 1]))
    def test_success_with_mocked_hdbscan(
        self,
        mock_hdbscan,
        mock_map,
        mock_soft,
        mock_memberships,
        mock_centroids,
        mock_chars,
        mock_log,
    ):
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = _make_mock_profiles(6)
        result = run_pipeline(db)
        assert result["status"] == "success"
        assert result["profiles"] == 6
        assert result["clusters"] == 2
        assert result["noise"] == 0
        assert result["reassigned"] == 1
        mock_hdbscan.assert_called_once()
        mock_map.assert_called_once()
        mock_memberships.assert_called_once()
        mock_centroids.assert_called_once()
        assert mock_chars.call_count == 2
        mock_log.assert_called_once()
        call_kw = mock_log.call_args[1]
        assert call_kw["status"] == "success"
        assert call_kw["profiles_count"] == 6
        assert call_kw["clusters_found"] == 2
