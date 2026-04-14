"""
Parser Orphadata product9 (prewalencja + nazwy PL/EN) z plików ``*_product9_prev.xml``.

Kolejność klas prevalencji (PL, po ``html.unescape``) pochodzi z pełnego przebiegu
``pl_product9_prev.xml`` (Orphadata, stan z eksploracji 2025-12-09): unikalne etykiety::

    1-5 / 10 000
    1-9 / 1 000 000
    1-9 / 100 000
    6-9 / 10 000
    <1 / 1 000 000
    >1 / 1000
    Jeszcze nie udokumentowany
    nieznany

Niższy ``prevalence_rank`` = częstsza klasa (lepsze miejsce przy sortowaniu ``asc``).
"""

from __future__ import annotations

import html
import logging
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import Final

logger = logging.getLogger(__name__)

# Mapowanie etykiety (dokładny tekst po html.unescape) → priorytet (0 = najczęstsza znana klasa).
# Źródło etykiet: ``scripts/v2/cache/orphadata/pl_product9_prev.xml`` — ``sorted(set(...))`` z
# ``PrevalenceClass/Name[@lang='pl']`` (wszystkie ``Disorder``).
_PREVALENCE_CLASS_RANK: Final[dict[str, int]] = {
    ">1 / 1000": 0,
    "6-9 / 10 000": 1,
    "1-5 / 10 000": 2,
    "1-9 / 100 000": 3,
    "1-9 / 1 000 000": 4,
    "<1 / 1 000 000": 5,
    "Jeszcze nie udokumentowany": 6,
    "nieznany": 7,
}

# Etykieta spoza słownika (np. nowe wydanie Orphadata) — na koniec, z logiem WARNING.
_UNKNOWN_LABEL_RANK: Final[int] = 90

# Brak niepustej klasy we wszystkich ``Prevalence`` danego ``Disorder``.
_NO_PREVALENCE_CLASS_RANK: Final[int] = 100


@dataclass(frozen=True)
class DiseaseRow:
    """Jedna choroba z product9 (PL + EN), gotowa do scalenia z product4 i zapisu do bazy."""

    orpha_id: int
    orpha_code: str
    name_pl: str
    name_en: str
    prevalence_rank: int
    prevalence_label_raw: str | None


def _direct_disorder_name(
    elem: ET.Element,
    primary_lang: str,
    *,
    fallback_lang: str | None = None,
) -> str:
    """Pierwsze bezpośrednie ``Name`` pod ``Disorder`` (nie typ/grupa)."""
    primary = ""
    fallback = ""
    for child in elem:
        if child.tag != "Name":
            continue
        lang = child.get("lang")
        raw = (child.text or "").strip()
        if not raw:
            continue
        text = html.unescape(raw)
        if lang == primary_lang:
            primary = text
        elif fallback_lang is not None and lang == fallback_lang:
            fallback = text
    return primary or fallback or ""


def _collect_prevalence_class_labels_pl(elem: ET.Element) -> set[str]:
    labels: set[str] = set()
    prev_list = elem.find("PrevalenceList")
    if prev_list is None:
        return labels
    for prev in prev_list.findall("Prevalence"):
        pc = prev.find("PrevalenceClass")
        if pc is None:
            continue
        name_el = pc.find("Name")
        if name_el is None or name_el.get("lang") != "pl":
            continue
        raw = (name_el.text or "").strip()
        if not raw:
            continue
        labels.add(html.unescape(raw))
    return labels


def _rank_from_class_labels(class_labels: set[str]) -> tuple[int, str | None]:
    if not class_labels:
        return (_NO_PREVALENCE_CLASS_RANK, None)
    best_rank = 10**9
    best_label: str | None = None
    for label in sorted(class_labels):
        rank = _PREVALENCE_CLASS_RANK.get(label)
        if rank is None:
            logger.warning(
                "Nieznana etykieta klasy prevalencji (PL): %r — traktuję jako najrzadszą",
                label,
            )
            rank = _UNKNOWN_LABEL_RANK
        if (
            best_label is None
            or rank < best_rank
            or (rank == best_rank and label < best_label)
        ):
            best_rank = rank
            best_label = label
    assert best_label is not None
    return (best_rank, best_label)


def _iter_disorders_product9(
    path: Path,
    *,
    name_lang: str,
    with_prevalence_pl: bool,
) -> dict[int, tuple[str, frozenset[str]]]:
    """
    Zwraca mapę ``OrphaCode → (nazwa, zbiór etykiet klas PL lub pusty frozenset)``.

    ``with_prevalence_pl``: tylko dla ``name_lang == 'pl'`` ma sens; dla ``en`` zawsze pusty zbiór.
    """
    out: dict[int, tuple[str, frozenset[str]]] = {}
    for _event, elem in ET.iterparse(path, events=("end",)):
        if elem.tag != "Disorder":
            continue
        code_el = elem.find("OrphaCode")
        if code_el is None or not (code_el.text or "").strip():
            elem.clear()
            continue
        try:
            code = int((code_el.text or "").strip())
        except ValueError:
            logger.warning("Pominięto Disorder z niepoprawnym OrphaCode: %r", code_el.text)
            elem.clear()
            continue
        if name_lang == "pl":
            name = _direct_disorder_name(elem, "pl", fallback_lang="en")
        else:
            name = _direct_disorder_name(elem, "en")
        labels: frozenset[str] = frozenset()
        if with_prevalence_pl and name_lang == "pl":
            labels = frozenset(_collect_prevalence_class_labels_pl(elem))
        out[code] = (name, labels)
        elem.clear()
    return out


def parse_product9_prev(pl_path: Path, en_path: Path) -> list[DiseaseRow]:
    """
    Parsuje PL (master listy kodów + prewalencja) i EN (nazwy), scala po ``OrphaCode``.

    Choroba tylko po angielsku (brak w PL) jest pomijana. Brak EN: ``name_en = name_pl``.
    """
    pl_path = pl_path.resolve()
    en_path = en_path.resolve()
    pl_map = _iter_disorders_product9(pl_path, name_lang="pl", with_prevalence_pl=True)
    en_map = _iter_disorders_product9(en_path, name_lang="en", with_prevalence_pl=False)

    rows: list[DiseaseRow] = []
    for orpha_id in sorted(pl_map.keys()):
        name_pl, class_labels = pl_map[orpha_id]
        if not name_pl:
            logger.warning("OrphaCode %s: brak nazwy PL — pomijam", orpha_id)
            continue
        en_entry = en_map.get(orpha_id)
        name_en = en_entry[0] if en_entry and en_entry[0].strip() else name_pl
        rank, label_raw = _rank_from_class_labels(set(class_labels))
        rows.append(
            DiseaseRow(
                orpha_id=orpha_id,
                orpha_code=f"ORPHA:{orpha_id}",
                name_pl=name_pl,
                name_en=name_en,
                prevalence_rank=rank,
                prevalence_label_raw=label_raw,
            )
        )

    rows.sort(key=lambda r: (r.prevalence_rank, r.orpha_id))
    return rows
