from __future__ import annotations

import logging
from pathlib import Path

import pytest

from app.services.v2.orphadata_product4 import parse_product4_hpo

_FIXTURES = Path(__file__).resolve().parent.parent / "fixtures" / "orphadata"


def test_parse_product4_hpo_sample_dedup_sort_merge() -> None:
    path = _FIXTURES / "product4_en_sample.xml"
    hpo = parse_product4_hpo(path)

    assert hpo[58] == ["HP:0000256", "HP:0001249", "HP:0001250"]
    assert hpo[999888] == ["HP:0000001", "HP:0000002"]


def test_parse_product4_hpo_invalid_hpo_id_warning(caplog: pytest.LogCaptureFixture) -> None:
    path = _FIXTURES / "product4_en_bad_hpo.xml"
    with caplog.at_level(logging.WARNING):
        hpo = parse_product4_hpo(path)
    assert hpo[910011] == ["HP:0000001"]
    assert any("pomijam nie-HPOId" in rec.message for rec in caplog.records)


def test_parse_product4_hpo_full_cache_file_if_present() -> None:
    """Opcjonalnie: pełny plik z etapu 1 — bez commitowania wyniku, tylko spójność."""
    full = Path(__file__).resolve().parents[2] / "scripts" / "v2" / "cache" / "orphadata" / "en_product4.xml"
    if not full.is_file():
        pytest.skip("Brak lokalnego en_product4.xml (etap 1)")
    hpo = parse_product4_hpo(full)
    assert 58 in hpo
    ids58 = hpo[58]
    assert len(ids58) == 61
    assert ids58 == sorted(ids58)
    for x in ("HP:0000256", "HP:0001249", "HP:0001250"):
        assert x in ids58
