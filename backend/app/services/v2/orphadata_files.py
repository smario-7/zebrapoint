"""Pobieranie plików XML Orphadata (product9 PL/EN, product4) do katalogu cache."""

from __future__ import annotations

import logging
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import Final

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

ORPHADATA_XML_URLS: Final[dict[str, str]] = {
    "pl_product9_prev": "https://www.orphadata.com/data/xml/pl_product9_prev.xml",
    "en_product9_prev": "https://www.orphadata.com/data/xml/en_product9_prev.xml",
    "en_product4": "https://www.orphadata.com/data/xml/en_product4.xml",
}

TIMEOUT_SECONDS: Final[dict[str, float]] = {
    "pl_product9_prev": 120.0,
    "en_product9_prev": 120.0,
    "en_product4": 120.0,
}

LOCAL_FILENAMES: Final[dict[str, str]] = {
    "pl_product9_prev": "pl_product9_prev.xml",
    "en_product9_prev": "en_product9_prev.xml",
    "en_product4": "en_product4.xml",
}

_MAX_ATTEMPTS = 3
_RETRY_BACKOFF_SEC = 2.0


def _http_status_should_retry(status_code: int) -> bool:
    return status_code in (408, 425, 429, 500, 502, 503, 504)


@dataclass(frozen=True)
class OrphadataXmlPaths:
    pl_product9_prev: Path
    en_product9_prev: Path
    en_product4: Path

    def as_dict(self) -> dict[str, Path]:
        return {
            "pl_product9_prev": self.pl_product9_prev,
            "en_product9_prev": self.en_product9_prev,
            "en_product4": self.en_product4,
        }


def log_jdbor_root_metadata(xml_path: Path, label: str) -> None:
    """Czyta atrybuty korzenia ``JDBOR`` (date, version) — lekki odczyt początku pliku."""
    try:
        for _event, elem in ET.iterparse(xml_path, events=("start",)):
            if elem.tag == "JDBOR":
                date = elem.attrib.get("date", "")
                version = elem.attrib.get("version", "")
                logger.info(
                    "Orphadata %s — JDBOR date=%r version=%r (plik: %s)",
                    label,
                    date,
                    version,
                    xml_path.name,
                )
                elem.clear()
                break
            elem.clear()
    except Exception as exc:
        logger.warning(
            "Nie udało się odczytać atrybutów JDBOR z %s: %s",
            xml_path,
            exc,
        )


def _download_one(
    key: str,
    url: str,
    dest: Path,
    *,
    timeout: float,
    client: httpx.Client,
) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_name(dest.name + ".tmp")

    for attempt in range(1, _MAX_ATTEMPTS + 1):
        last_error: Exception | None = None
        try:
            with client.stream("GET", url, timeout=timeout) as response:
                response.raise_for_status()
                with open(tmp, "wb") as out:
                    for chunk in response.iter_bytes():
                        if chunk:
                            out.write(chunk)
            tmp.replace(dest)
            logger.info("Pobrano Orphadata %s → %s", key, dest)
            return
        except httpx.HTTPStatusError as exc:
            last_error = exc
            if tmp.exists():
                tmp.unlink(missing_ok=True)
            if not _http_status_should_retry(exc.response.status_code) or attempt >= _MAX_ATTEMPTS:
                raise
        except (httpx.TimeoutException, httpx.TransportError, OSError) as exc:
            last_error = exc
            if tmp.exists():
                tmp.unlink(missing_ok=True)
            if attempt >= _MAX_ATTEMPTS:
                raise

        wait = _RETRY_BACKOFF_SEC * attempt
        logger.warning(
            "Pobieranie %s nieudane (próba %s/%s): %s — ponawiam za %.1f s",
            key,
            attempt,
            _MAX_ATTEMPTS,
            last_error,
            wait,
        )
        time.sleep(wait)


def ensure_orphadata_xml_files(
    *,
    refresh_xml: bool = False,
    cache_dir: Path | None = None,
) -> OrphadataXmlPaths:
    """
    Zapewnia obecność trzech plików XML Orphadata w ``cache_dir`` (domyślnie z settings).

    Jeśli plik istnieje i ``refresh_xml`` jest False — używana jest kopia lokalna.
    Po każdym pliku (nowy lub z cache) logowane są atrybuty ``JDBOR`` (wersja danych).
    """
    base = cache_dir if cache_dir is not None else settings.resolved_orphadata_cache_dir()
    paths_map: dict[str, Path] = {
        key: base / LOCAL_FILENAMES[key] for key in ORPHADATA_XML_URLS
    }

    with httpx.Client(follow_redirects=True) as client:
        for key, url in ORPHADATA_XML_URLS.items():
            dest = paths_map[key]
            if dest.exists() and not refresh_xml:
                logger.info("Orphadata %s — używam lokalnej kopii: %s", key, dest)
            else:
                _download_one(
                    key,
                    url,
                    dest,
                    timeout=TIMEOUT_SECONDS[key],
                    client=client,
                )
            log_jdbor_root_metadata(dest, key)

    return OrphadataXmlPaths(
        pl_product9_prev=paths_map["pl_product9_prev"],
        en_product9_prev=paths_map["en_product9_prev"],
        en_product4=paths_map["en_product4"],
    )
