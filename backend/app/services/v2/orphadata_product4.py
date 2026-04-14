"""
Parser Orphadata product4: powiązania HPO per choroba (``en_product4.xml``).

Struktura: ``JDBOR`` → ``HPODisorderSetStatusList`` → ``HPODisorderSetStatus`` →
``Disorder`` → ``OrphaCode`` + ``HPODisorderAssociationList`` → ``HPODisorderAssociation``
→ ``HPO`` → ``HPOId`` (tekst ``HP:…``).
"""

from __future__ import annotations

import logging
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

logger = logging.getLogger(__name__)


def parse_product4_hpo(en4_path: Path) -> dict[int, list[str]]:
    """
    Zwraca ``orpha_id → posortowana lista unikalnych identyfikatorów HPO`` (``HP:0001234``).

    Ten sam ``OrphaCode`` w wielu ``HPODisorderSetStatus`` jest scalany (suma zbiorów).
    """
    en4_path = en4_path.resolve()
    by_code: dict[int, set[str]] = defaultdict(set)

    for _event, elem in ET.iterparse(en4_path, events=("end",)):
        if elem.tag != "Disorder":
            continue
        code_el = elem.find("OrphaCode")
        if code_el is None or not (code_el.text or "").strip():
            elem.clear()
            continue
        try:
            orpha_code = int((code_el.text or "").strip())
        except ValueError:
            logger.warning("Pominięto Disorder z niepoprawnym OrphaCode: %r", code_el.text)
            elem.clear()
            continue

        alist = elem.find("HPODisorderAssociationList")
        if alist is not None:
            for assoc in alist.findall("HPODisorderAssociation"):
                hpo = assoc.find("HPO")
                if hpo is None:
                    continue
                hpo_id_el = hpo.find("HPOId")
                if hpo_id_el is None:
                    continue
                raw = (hpo_id_el.text or "").strip()
                if not raw:
                    continue
                if not raw.startswith("HP:"):
                    logger.warning(
                        "OrphaCode %s: pomijam nie-HPOId w polu HPOId: %r",
                        orpha_code,
                        raw,
                    )
                    continue
                by_code[orpha_code].add(raw)

        elem.clear()

    return {code: sorted(ids) for code, ids in by_code.items()}
