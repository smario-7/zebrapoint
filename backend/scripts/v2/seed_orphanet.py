"""
Seed z Orphadata (XML): ``orpha_diseases`` + soczewki diagnostyczne (``lenses``).

    cd backend
    python -m scripts.v2.seed_orphanet [--dry-run] [--refresh-xml] [--limit N]
        [--lenses-limit N] [--lenses-all]

Wymagane w .env: ``DATABASE_URL`` (odczyt ``hpo_terms`` do statystyk pokrycia HPO;
przy ``--dry-run`` nie ma zapisu do ``orpha_diseases`` / ``lenses``).

Nazwy PL/EN i prewalencja: ``pl_product9_prev.xml`` + ``en_product9_prev.xml``.
HPO: ``en_product4.xml``. Pobranie plików: ``app.services.v2.orphadata_files``.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.config import settings
from app.core.database import database_url
from app.models.v2.hpo import HpoTerm, OrphaDisease as OrphaDiseaseModel
from app.models.v2.lens import Lens
from app.services.v2.orphadata_files import ensure_orphadata_xml_files
from app.services.v2.orphadata_product4 import parse_product4_hpo
from app.services.v2.orphadata_product9 import DiseaseRow, parse_product9_prev

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

DIAGNOSTIC_EMOJI = "🧬"
_COMMIT_EVERY = 250


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _source_url(orpha_id: int) -> str:
    return f"https://www.orpha.net/en/disease/detail/{orpha_id}"


@dataclass(frozen=True)
class MergedSeedRow:
    orpha_id: int
    orpha_code: str
    name_pl: str
    name_en: str
    prevalence_rank: int
    prevalence_label_raw: str | None
    hpo_associations: list[str]
    source_url: str


def merge_product9_product4(
    diseases: list[DiseaseRow],
    hpo_by_orpha: dict[int, list[str]],
) -> list[MergedSeedRow]:
    out: list[MergedSeedRow] = []
    for d in diseases:
        hpo = list(hpo_by_orpha.get(d.orpha_id, []))
        out.append(
            MergedSeedRow(
                orpha_id=d.orpha_id,
                orpha_code=d.orpha_code,
                name_pl=d.name_pl,
                name_en=d.name_en,
                prevalence_rank=d.prevalence_rank,
                prevalence_label_raw=d.prevalence_label_raw,
                hpo_associations=hpo,
                source_url=_source_url(d.orpha_id),
            )
        )
    return out


def _unique_hpo_ids_from_map(hpo_by_orpha: dict[int, list[str]]) -> set[str]:
    u: set[str] = set()
    for lst in hpo_by_orpha.values():
        u.update(lst)
    return u


async def _load_hpo_term_ids(session) -> set[str]:
    result = await session.execute(select(HpoTerm.hpo_id))
    return {row[0] for row in result}


def _log_hpo_coverage(
    *,
    known_hpo: set[str],
    hpo_by_orpha: dict[int, list[str]],
    batch_rows: list[MergedSeedRow],
) -> None:
    all_from_p4 = _unique_hpo_ids_from_map(hpo_by_orpha)
    missing_global = sorted(x for x in all_from_p4 if x not in known_hpo)
    logger.info(
        "HPO (product4): %d unikalnych identyfikatorów w pliku; %d nie występuje w hpo_terms",
        len(all_from_p4),
        len(missing_global),
    )
    if missing_global and len(missing_global) <= 30:
        logger.info("  Brakujące w hpo_terms: %s", ", ".join(missing_global))
    elif missing_global:
        logger.info("  Przykład brakujących (pierwsze 20): %s", ", ".join(missing_global[:20]))

    with_gap = sum(1 for r in batch_rows if any(h not in known_hpo for h in r.hpo_associations))
    logger.info(
        "W tym zapisie: %d / %d chorób ma co najmniej jeden HPO spoza hpo_terms",
        with_gap,
        len(batch_rows),
    )


async def run_seed(
    *,
    dry_run: bool = False,
    refresh_xml: bool = False,
    limit: int | None = None,
    lenses_limit: int = 200,
    lenses_all: bool = False,
) -> None:
    logging.getLogger("httpx").setLevel(logging.WARNING)

    paths = ensure_orphadata_xml_files(refresh_xml=refresh_xml)
    logger.info("Parsowanie product9 (PL+EN)…")
    diseases = parse_product9_prev(paths.pl_product9_prev, paths.en_product9_prev)
    logger.info("Parsowanie product4 (HPO)…")
    hpo_by_orpha = parse_product4_hpo(paths.en_product4)

    merged_all = merge_product9_product4(diseases, hpo_by_orpha)
    if limit is not None and limit >= 0:
        batch = merged_all[:limit]
    else:
        batch = merged_all

    lens_cap = len(batch) if lenses_all else min(lenses_limit, len(batch))

    logger.info(
        "Rekordy chorób (po sortowaniu rank,id): w pliku %d, do zapisu w tej sesji %d; soczewki: %d",
        len(merged_all),
        len(batch),
        lens_cap,
    )

    engine = create_async_engine(database_url, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    try:
        async with session_factory() as session:
            known_hpo = await _load_hpo_term_ids(session)
            _log_hpo_coverage(known_hpo=known_hpo, hpo_by_orpha=hpo_by_orpha, batch_rows=batch)

            if dry_run:
                for r in batch[:5]:
                    logger.info(
                        "  ORPHA:%d | %s | HPO: %d | rank=%s",
                        r.orpha_id,
                        r.name_pl[:60] + ("…" if len(r.name_pl) > 60 else ""),
                        len(r.hpo_associations),
                        r.prevalence_rank,
                    )
                logger.info("[DRY RUN] Brak zapisu do bazy.")
                return

            for i, row in enumerate(batch, 1):
                now = _now()
                orpha_stmt = pg_insert(OrphaDiseaseModel).values(
                    orpha_id=row.orpha_id,
                    orpha_code=row.orpha_code,
                    name_en=row.name_en,
                    name_pl=row.name_pl,
                    hpo_associations=row.hpo_associations,
                    source_url=row.source_url,
                    last_synced_at=now,
                    created_at=now,
                )
                orpha_stmt = orpha_stmt.on_conflict_do_update(
                    index_elements=[OrphaDiseaseModel.orpha_id],
                    set_={
                        "name_en": orpha_stmt.excluded.name_en,
                        "name_pl": orpha_stmt.excluded.name_pl,
                        "hpo_associations": orpha_stmt.excluded.hpo_associations,
                        "source_url": orpha_stmt.excluded.source_url,
                        "last_synced_at": orpha_stmt.excluded.last_synced_at,
                    },
                )
                await session.execute(orpha_stmt)

                if (i - 1) < lens_cap:
                    name_lens = row.name_pl
                    lens_id = uuid.uuid4()
                    lens_stmt = pg_insert(Lens).values(
                        id=lens_id,
                        name=name_lens,
                        description=None,
                        type="diagnostic",
                        emoji=DIAGNOSTIC_EMOJI,
                        embedding=None,
                        hpo_cluster=row.hpo_associations,
                        orpha_id=row.orpha_id,
                        data_source="orphanet",
                        source_url=row.source_url,
                        last_synced_at=now,
                        is_active=True,
                        activity_level="low",
                        post_count=0,
                        created_by=None,
                        created_at=now,
                        updated_at=now,
                    )
                    lens_stmt = lens_stmt.on_conflict_do_update(
                        index_elements=[Lens.orpha_id],
                        set_={
                            "name": lens_stmt.excluded.name,
                            "hpo_cluster": lens_stmt.excluded.hpo_cluster,
                            "source_url": lens_stmt.excluded.source_url,
                            "last_synced_at": lens_stmt.excluded.last_synced_at,
                            "updated_at": lens_stmt.excluded.updated_at,
                        },
                    )
                    await session.execute(lens_stmt)

                if i % _COMMIT_EVERY == 0:
                    await session.commit()
                    logger.info("Zapisano: %d / %d chorób", i, len(batch))

            await session.commit()
            logger.info(
                "=== Seed zakończony: %d chorób w orpha_diseases, %d soczewek (limit %s) ===",
                len(batch),
                lens_cap,
                "wszystkie" if lenses_all else str(lenses_limit),
            )
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed Orphanet z XML Orphadata → orpha_diseases + soczewki diagnostyczne",
    )
    parser.add_argument("--dry-run", action="store_true", help="Parsowanie + logi, bez zapisu")
    parser.add_argument(
        "--refresh-xml",
        action="store_true",
        help="Wymuś ponowne pobranie plików XML z orphadata.com",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        metavar="N",
        help="Maks. liczba chorób po sortowaniu (test / szybki przebieg)",
    )
    parser.add_argument(
        "--lenses-limit",
        type=int,
        default=200,
        metavar="N",
        help="Maks. liczba soczewek (pierwsze N po sortowaniu w obrębie batcha); domyślnie 200",
    )
    parser.add_argument(
        "--lenses-all",
        action="store_true",
        help="Soczewka dla każdej choroby z zapisywanego batcha (ignoruje --lenses-limit)",
    )
    args = parser.parse_args()

    if args.lenses_limit < 0:
        parser.error("--lenses-limit nie może być ujemne")
    if args.limit is not None and args.limit < 0:
        parser.error("--limit nie może być ujemny")

    asyncio.run(
        run_seed(
            dry_run=args.dry_run,
            refresh_xml=args.refresh_xml,
            limit=args.limit,
            lenses_limit=args.lenses_limit,
            lenses_all=args.lenses_all,
        )
    )


if __name__ == "__main__":
    main()
