"""
Klient do Orphanet API (api.orphacode.org).
Nagłówek apiKey z ORPHANET_API_KEY — wymagany do wywołań (seed, sync).

Licencja danych: CC BY 4.0 — wymagana atrybucja w UI.

Nomenklatura choroby: osobne żądania pod EN i PL (prefiks języka w URL).
Powiązania HPO: endpoint pod /EN/ (jak w dokumentacji API).

Rate limiting: ok. 1 żądanie na sekundę — pauza między kolejnymi requestami HTTP.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_BASE_ROOT = "https://api.orphacode.org"
# Nomenklatura w wielu językach — prefiks w ścieżce (EN/PL/…); HPO zostaje pod /EN/.
_BASE_EN_URL = f"{_BASE_ROOT}/EN/ClinicalEntity"
_BASE_PL_URL = f"{_BASE_ROOT}/PL/ClinicalEntity"
_TIMEOUT = 30.0
_RATE_LIMIT_DELAY = 1.1


def _clinical_entity_name_path(orpha_code: int, lang: str) -> str:
    lang_u = lang.upper()
    root_url = _BASE_PL_URL if lang_u == "PL" else _BASE_EN_URL
    suffix = root_url.removeprefix(_BASE_ROOT)
    return f"{suffix}/orphacode/{orpha_code}"


@dataclass
class OrphaDisease:
    """Sparsowana choroba z Orphanet API."""

    orpha_id: int
    orpha_code: str
    name_en: str
    name_pl: str | None
    hpo_associations: list[str]
    source_url: str


class OrphanetClient:
    """
    Asynchroniczny klient Orphanet API.

        async with OrphanetClient() as client:
            disease = await client.get_disease(98)
    """

    def __init__(self, api_key: str | None = None):
        self._api_key = api_key or settings.orphanet_api_key
        self._client: httpx.AsyncClient | None = None

    async def __aenter__(self) -> OrphanetClient:
        headers = {
            "Accept": "application/json",
        }
        if self._api_key:
            headers["apiKey"] = self._api_key
        self._client = httpx.AsyncClient(
            base_url=_BASE_ROOT,
            headers=headers,
            timeout=_TIMEOUT,
        )
        return self

    async def __aexit__(self, *args: object) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    async def list_active_orpha_codes(self) -> list[int]:
        """
        Pobiera listę aktywnych kodów ORPHA z pakietu nomenklatury (jedno żądanie).
        Przy błędzie zwraca pustą listę.
        """
        assert self._client is not None
        try:
            resp = await self._client.get("/EN/ClinicalEntity")
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPStatusError as e:
            logger.warning(
                "HTTP %s przy liście ClinicalEntity: %s",
                e.response.status_code,
                e.response.text[:200],
            )
            return []
        except (httpx.HTTPError, ValueError, TypeError) as e:
            logger.warning("Błąd pobierania listy ClinicalEntity: %s", e)
            return []

        if not isinstance(data, list):
            logger.warning("Nieoczekiwany format listy ClinicalEntity (nie tablica)")
            return []

        await asyncio.sleep(_RATE_LIMIT_DELAY)

        codes: list[int] = []
        for entry in data:
            if not isinstance(entry, dict):
                continue
            status = entry.get("Status")
            if status != "Active":
                continue
            code = entry.get("ORPHAcode")
            if isinstance(code, int):
                codes.append(code)
            elif isinstance(code, str) and code.isdigit():
                codes.append(int(code))

        return codes

    async def get_disease(self, orpha_code: int) -> OrphaDisease | None:
        """
        Pobiera pełne dane choroby (nazwa + powiązania HPO).
        Zwraca None przy błędzie HTTP lub braku danych.
        """
        assert self._client is not None
        name_en = await self._fetch_name(orpha_code, lang="EN")
        await asyncio.sleep(_RATE_LIMIT_DELAY)
        if not name_en:
            return None

        name_pl = await self._fetch_name(orpha_code, lang="PL")
        await asyncio.sleep(_RATE_LIMIT_DELAY)

        hpo_ids = await self._fetch_hpo_associations(orpha_code)
        await asyncio.sleep(_RATE_LIMIT_DELAY)

        return OrphaDisease(
            orpha_id=orpha_code,
            orpha_code=f"ORPHA:{orpha_code}",
            name_en=name_en,
            name_pl=name_pl,
            hpo_associations=sorted(set(hpo_ids)),
            source_url=f"https://www.orpha.net/en/disease/detail/{orpha_code}",
        )

    async def get_disease_for_sync(self, orpha_code: int) -> OrphaDisease | None:
        """
        Wariant do tygodniowego sync: nazwa EN + HPO z API, bez zapytania o termin PL
        (polskie nazwy zostają z Orphadata / ręcznych poprawek w bazie).
        """
        assert self._client is not None
        name_en = await self._fetch_name(orpha_code, lang="EN")
        await asyncio.sleep(_RATE_LIMIT_DELAY)
        if not name_en:
            return None

        hpo_ids = await self._fetch_hpo_associations(orpha_code)
        await asyncio.sleep(_RATE_LIMIT_DELAY)

        return OrphaDisease(
            orpha_id=orpha_code,
            orpha_code=f"ORPHA:{orpha_code}",
            name_en=name_en,
            name_pl=None,
            hpo_associations=sorted(set(hpo_ids)),
            source_url=f"https://www.orpha.net/en/disease/detail/{orpha_code}",
        )

    async def get_hpo_associations_only(self, orpha_code: int) -> list[str]:
        """Tylko lista HPOId (jedno żądanie HTTP); pauza rate-limit po odpowiedzi."""
        assert self._client is not None
        raw = await self._fetch_hpo_associations(orpha_code)
        await asyncio.sleep(_RATE_LIMIT_DELAY)
        return sorted(set(raw))

    async def get_diseases_batch(
        self,
        orpha_codes: list[int],
        *,
        on_progress: object | None = None,
    ) -> list[OrphaDisease]:
        """
        Pobiera listę chorób sekwencyjnie (rate limit).
        on_progress: callback(current, total) — opcjonalne logowanie postępu.
        """
        results: list[OrphaDisease] = []
        total = len(orpha_codes)
        for i, code in enumerate(orpha_codes, 1):
            try:
                disease = await self.get_disease(code)
                if disease:
                    results.append(disease)
                if on_progress is not None:
                    on_progress(i, total)
                elif i % 20 == 0:
                    logger.info("Pobrano: %d / %d chorób", i, total)
            except Exception as e:
                logger.warning("Błąd dla ORPHA:%d — %s", code, e)
        return results

    async def get_diseases_batch_for_sync(
        self,
        orpha_codes: list[int],
        *,
        on_progress: object | None = None,
    ) -> list[OrphaDisease]:
        """Jak get_diseases_batch, ale bez pobierania nazwy PL z API (2 requesty na chorobę)."""
        results: list[OrphaDisease] = []
        total = len(orpha_codes)
        for i, code in enumerate(orpha_codes, 1):
            try:
                disease = await self.get_disease_for_sync(code)
                if disease:
                    results.append(disease)
                if on_progress is not None:
                    on_progress(i, total)
                elif i % 20 == 0:
                    logger.info("Pobrano (sync): %d / %d chorób", i, total)
            except Exception as e:
                logger.warning("Błąd sync dla ORPHA:%d — %s", code, e)
        return results

    async def _fetch_name(self, orpha_code: int, *, lang: str = "EN") -> str | None:
        assert self._client is not None
        lang_u = lang.upper()
        path = _clinical_entity_name_path(orpha_code, lang_u)
        try:
            resp = await self._client.get(path)
            resp.raise_for_status()
            data = resp.json()

            if isinstance(data, dict):
                preferred = data.get("Preferred term")
                if isinstance(preferred, str) and preferred.strip():
                    return preferred.strip()

                names = data.get("Name", [])
                if isinstance(names, list):
                    for entry in names:
                        if not isinstance(entry, dict):
                            continue
                        entry_lang = entry.get("lang")
                        if isinstance(entry_lang, str) and entry_lang.upper() == lang_u:
                            label = entry.get("label")
                            if isinstance(label, str) and label.strip():
                                return label.strip()

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                logger.debug("ORPHA:%d (%s) nie istnieje w API", orpha_code, lang_u)
            else:
                logger.warning(
                    "HTTP %d dla ORPHA:%d (%s)",
                    e.response.status_code,
                    orpha_code,
                    lang_u,
                )
            return None
        except (httpx.HTTPError, KeyError, ValueError, TypeError) as e:
            logger.warning("Błąd pobierania ORPHA:%d (%s) — %s", orpha_code, lang_u, e)
            return None
        return None

    async def _fetch_hpo_associations(self, orpha_code: int) -> list[str]:
        assert self._client is not None
        try:
            resp = await self._client.get(
                f"/EN/ClinicalEntity/orphacode/{orpha_code}/HPODisorderAssociation"
            )
            resp.raise_for_status()
            data = resp.json()

            associations = data.get("HPODisorderAssociation", [])
            if not isinstance(associations, list):
                return []

            hpo_ids: list[str] = []
            for assoc in associations:
                if not isinstance(assoc, dict):
                    continue
                hpo_block = assoc.get("HPO")
                if isinstance(hpo_block, dict):
                    hpo_id = hpo_block.get("HPOId")
                    if isinstance(hpo_id, str) and hpo_id.startswith("HP:"):
                        hpo_ids.append(hpo_id)
            return hpo_ids

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return []
            logger.warning(
                "HTTP %d dla HPO associations ORPHA:%d",
                e.response.status_code,
                orpha_code,
            )
            return []
        except (httpx.HTTPError, KeyError, ValueError, TypeError) as e:
            logger.warning("Błąd HPO associations ORPHA:%d — %s", orpha_code, e)
            return []
