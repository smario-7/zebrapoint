from __future__ import annotations

import logging
from dataclasses import FrozenInstanceError
from pathlib import Path

import pytest

from app.services.v2.orphadata_product9 import DiseaseRow, parse_product9_prev

_FIXTURES = Path(__file__).resolve().parent.parent / "fixtures" / "orphadata"


def test_parse_product9_prev_sample_order_and_fields() -> None:
    pl = _FIXTURES / "product9_pl_sample.xml"
    en = _FIXTURES / "product9_en_sample.xml"
    rows = parse_product9_prev(pl, en)
    by_id = {r.orpha_id: r for r in rows}

    assert len(rows) == 4
    assert [r.orpha_id for r in rows] == [900001, 900003, 900002, 900004]

    a = by_id[900001]
    assert a.name_pl == "Choroba częsta PL"
    assert a.name_en == "Common disease EN"
    assert a.prevalence_rank == 0
    assert a.prevalence_label_raw == ">1 / 1000"
    assert a.orpha_code == "ORPHA:900001"

    b = by_id[900002]
    assert b.prevalence_rank == 100
    assert b.prevalence_label_raw is None

    c = by_id[900003]
    assert c.prevalence_rank == 0
    assert c.prevalence_label_raw == ">1 / 1000"
    assert c.name_en == "Two classes disease EN"

    d = by_id[900004]
    assert d.name_pl == "Tylko PL"
    assert d.name_en == "Tylko PL"
    assert d.prevalence_rank == 100


def test_parse_product9_unknown_prevalence_label_warning(caplog: pytest.LogCaptureFixture) -> None:
    pl = _FIXTURES / "product9_pl_unknown_class.xml"
    en = _FIXTURES / "product9_en_unknown_class.xml"
    with caplog.at_level(logging.WARNING):
        rows = parse_product9_prev(pl, en)
    assert len(rows) == 1
    r = rows[0]
    assert r.prevalence_rank == 90
    assert r.prevalence_label_raw == "Całkowicie nowa etykieta testowa"
    assert any("Nieznana etykieta" in rec.message for rec in caplog.records)


def test_disease_row_frozen() -> None:
    r = DiseaseRow(
        orpha_id=1,
        orpha_code="ORPHA:1",
        name_pl="a",
        name_en="b",
        prevalence_rank=0,
        prevalence_label_raw=None,
    )
    with pytest.raises(FrozenInstanceError):
        r.orpha_id = 2  # type: ignore[misc]
