"""
Import HPO (hp.obo) do tabeli hpo_terms.

Uruchomienie z katalogu backend:
    python -m scripts.v2.import_hpo [--file data/hpo/hp.obo] [--no-translate] [--dry-run]
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import re
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

from redis.asyncio import Redis
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.config import settings
from app.core.database import database_url
from app.models.v2.hpo import HpoTerm
from app.services.v2.translation_service import translate_to_polish

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

HPO_DOWNLOAD_URL = (
    "https://github.com/obophenotype/human-phenotype-ontology/releases/latest/download/hp.obo"
)
CLINICAL_ROOT_ID = "HP:0000118"
SYNONYM_EXACT_RE = re.compile(r'^"(.+)"\s+EXACT')
IS_A_ID_RE = re.compile(r"^(HP:\d+)")


@dataclass
class RawTerm:
    hpo_id: str
    label_en: str
    synonyms_en: list[str] = field(default_factory=list)
    parent_ids: list[str] = field(default_factory=list)
    is_obsolete: bool = False


def parse_obo(content: str) -> tuple[str, list[RawTerm]]:
    source_version = "unknown"
    terms: list[RawTerm] = []
    current: dict | None = None

    for line in content.splitlines():
        line = line.strip()

        if line.startswith("data-version:"):
            source_version = line.split(":", 1)[1].strip()
            continue

        if line == "[Term]":
            if current and current.get("id"):
                terms.append(_dict_to_term(current))
            current = {"synonyms": [], "parents": [], "obsolete": False}
            continue

        if line == "" or current is None:
            continue

        if ":" not in line:
            continue

        key, _, value = line.partition(":")
        value = value.strip()

        if key == "id":
            current["id"] = value
        elif key == "name":
            current["name"] = value
        elif key == "is_obsolete":
            current["obsolete"] = value.lower() == "true"
        elif key == "synonym":
            m = SYNONYM_EXACT_RE.match(value)
            if m:
                current["synonyms"].append(m.group(1))
        elif key == "is_a":
            m = IS_A_ID_RE.match(value)
            if m:
                current["parents"].append(m.group(1))

    if current and current.get("id"):
        terms.append(_dict_to_term(current))

    return source_version, terms


def _dict_to_term(d: dict) -> RawTerm:
    return RawTerm(
        hpo_id=d.get("id", ""),
        label_en=d.get("name", ""),
        synonyms_en=d.get("synonyms", []),
        parent_ids=d.get("parents", []),
        is_obsolete=d.get("obsolete", False),
    )


def filter_clinical(terms: list[RawTerm]) -> list[RawTerm]:
    by_id = {t.hpo_id: t for t in terms if not t.is_obsolete}
    memo: dict[str, bool] = {}

    def under_clinical(term_id: str, visiting: set[str]) -> bool:
        if term_id == CLINICAL_ROOT_ID:
            return True
        if term_id in memo:
            return memo[term_id]
        if term_id in visiting:
            return False
        visiting.add(term_id)
        term = by_id.get(term_id)
        if not term:
            memo[term_id] = False
            visiting.discard(term_id)
            return False
        for parent_id in term.parent_ids:
            if under_clinical(parent_id, visiting):
                memo[term_id] = True
                visiting.discard(term_id)
                return True
        memo[term_id] = False
        visiting.discard(term_id)
        return False

    return [t for t in by_id.values() if under_clinical(t.hpo_id, set())]


def compute_depths(terms: list[RawTerm]) -> dict[str, int]:
    by_id = {t.hpo_id: t for t in terms}
    memo: dict[str, int] = {}

    def depth(hpo_id: str, visiting: set[str]) -> int:
        if hpo_id in memo:
            return memo[hpo_id]
        if hpo_id in visiting:
            return 0
        term = by_id.get(hpo_id)
        if not term or not term.parent_ids:
            memo[hpo_id] = 0
            return 0
        visiting.add(hpo_id)
        d = 1 + max(depth(pid, visiting) for pid in term.parent_ids)
        visiting.discard(hpo_id)
        memo[hpo_id] = d
        return d

    for term in terms:
        depth(term.hpo_id, set())

    return memo


def download_obo(target_path: Path) -> Path:
    if target_path.exists():
        logger.info("Używam lokalnego pliku: %s", target_path)
        return target_path

    target_path.parent.mkdir(parents=True, exist_ok=True)
    logger.info("Pobieram hp.obo z %s ...", HPO_DOWNLOAD_URL)
    try:
        urllib.request.urlretrieve(HPO_DOWNLOAD_URL, target_path)
    except (urllib.error.URLError, OSError) as e:
        raise SystemExit(
            f"Nie udało się pobrać hp.obo: {e}. "
            f"Umieść plik ręcznie w ścieżce: {target_path}"
        ) from e

    logger.info("Zapisano: %s (%.1f MB)", target_path, target_path.stat().st_size / 1e6)
    return target_path


async def _upsert_batch(session, batch: list[dict]) -> None:
    stmt = pg_insert(HpoTerm).values(batch)
    stmt = stmt.on_conflict_do_update(
        index_elements=["hpo_id"],
        set_={
            "label_en": stmt.excluded.label_en,
            "label_pl": stmt.excluded.label_pl,
            "synonyms_en": stmt.excluded.synonyms_en,
            "parent_ids": stmt.excluded.parent_ids,
            "depth": stmt.excluded.depth,
            "source_version": stmt.excluded.source_version,
            "is_clinical": stmt.excluded.is_clinical,
        },
    )
    await session.execute(stmt)
    await session.commit()


async def run_import(
    obo_path: Path,
    *,
    translate: bool = True,
    dry_run: bool = False,
    batch_size: int = 200,
) -> None:
    logger.info("=== HPO Import Start ===")

    content = obo_path.read_text(encoding="utf-8")
    source_version, all_terms = parse_obo(content)
    logger.info("Sparsowano %d terminów. Wersja HPO: %s", len(all_terms), source_version)

    clinical_terms = filter_clinical(all_terms)
    logger.info("Terminów klinicznych (pod %s): %d", CLINICAL_ROOT_ID, len(clinical_terms))

    depths = compute_depths(clinical_terms)

    if dry_run:
        logger.info("[DRY RUN] Przykładowe terminy:")
        for t in clinical_terms[:5]:
            logger.info(
                "  %s | %s | głębokość: %d | rodziców: %d",
                t.hpo_id,
                t.label_en,
                depths.get(t.hpo_id, 0),
                len(t.parent_ids),
            )
        logger.info("[DRY RUN] Zakończono — baza niezmieniona.")
        return

    engine = create_async_engine(database_url, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    redis: Redis | None = None
    if translate:
        redis = Redis.from_url(settings.redis_cache_url, decode_responses=True)

    imported = 0
    try:
        async with session_factory() as session:
            batch: list[dict] = []
            for term in clinical_terms:
                label_pl = None
                if translate and redis is not None:
                    label_pl = await translate_to_polish(term.label_en, redis)

                batch.append(
                    {
                        "hpo_id": term.hpo_id,
                        "label_en": term.label_en,
                        "label_pl": label_pl,
                        "synonyms_en": term.synonyms_en or [],
                        "parent_ids": term.parent_ids or [],
                        "depth": depths.get(term.hpo_id, 0),
                        "source_version": source_version,
                        "is_clinical": True,
                    }
                )

                if len(batch) >= batch_size:
                    await _upsert_batch(session, batch)
                    imported += len(batch)
                    batch = []
                    logger.info("Zaimportowano: %d / %d", imported, len(clinical_terms))

            if batch:
                await _upsert_batch(session, batch)
                imported += len(batch)

        logger.info("=== Import zakończony: %d terminów ===", imported)
    finally:
        if redis is not None:
            await redis.close()
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Import HPO Ontology do ZebraPoint v2")
    parser.add_argument(
        "--file",
        type=Path,
        default=Path("data/hpo/hp.obo"),
        help="Ścieżka do hp.obo (jeśli brak pliku — pobranie z internetu)",
    )
    parser.add_argument("--no-translate", action="store_true", help="Pomiń tłumaczenie PL")
    parser.add_argument("--dry-run", action="store_true", help="Tylko parsuj, nie zapisuj do bazy")
    parser.add_argument("--batch-size", type=int, default=200)
    args = parser.parse_args()

    obo_path = download_obo(args.file)
    asyncio.run(
        run_import(
            obo_path,
            translate=not args.no_translate,
            dry_run=args.dry_run,
            batch_size=args.batch_size,
        )
    )


if __name__ == "__main__":
    main()
