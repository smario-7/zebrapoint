"""
Uzupełnia label_pl dla wierszy hpo_terms, gdzie label_pl IS NULL.

MyMemory ma limity — uruchamiaj codziennie z umiarkowanym --limit i --delay.
Z katalogu backend:

    python -m scripts.v2.backfill_hpo_labels_pl --limit 400 --delay 0.3
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path

from redis.asyncio import Redis
from sqlalchemy import func, select, update
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


async def count_missing(session) -> int:
    r = await session.execute(select(func.count()).select_from(HpoTerm).where(HpoTerm.label_pl.is_(None)))
    return int(r.scalar_one())


async def run_backfill(*, limit: int, delay: float, dry_run: bool) -> None:
    engine = create_async_engine(database_url, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    redis: Redis | None = None
    if not dry_run:
        redis = Redis.from_url(settings.redis_cache_url, decode_responses=True)

    try:
        async with session_factory() as session:
            total_missing = await count_missing(session)
            logger.info("Terminów bez label_pl: %d", total_missing)

            if total_missing == 0:
                logger.info("Nic do zrobienia.")
                return

            stmt = (
                select(HpoTerm.hpo_id, HpoTerm.label_en)
                .where(HpoTerm.label_pl.is_(None))
                .order_by(HpoTerm.hpo_id)
                .limit(limit)
            )
            result = await session.execute(stmt)
            rows = result.all()

            if dry_run:
                logger.info("[DRY RUN] Przetworzyłbym %d wierszy (limit=%d).", len(rows), limit)
                for hpo_id, label_en in rows[:5]:
                    logger.info("  przykład: %s | %s", hpo_id, (label_en or "")[:60])
                return

            assert redis is not None
            updated = 0
            skipped = 0
            for i, (hpo_id, label_en) in enumerate(rows, start=1):
                label_pl = await translate_to_polish(label_en, redis)
                if label_pl:
                    await session.execute(
                        update(HpoTerm).where(HpoTerm.hpo_id == hpo_id).values(label_pl=label_pl)
                    )
                    await session.commit()
                    updated += 1
                else:
                    skipped += 1

                if delay > 0 and i < len(rows):
                    await asyncio.sleep(delay)

                if i % 50 == 0 or i == len(rows):
                    logger.info("Postęp: %d / %d (zapisano PL: %d, pominięto: %d)", i, len(rows), updated, skipped)

            remaining = await count_missing(session)
            logger.info(
                "Zakończono partię: zapisano %d tłumaczeń, bez wyniku API/cache: %d. Nadal bez PL: %d",
                updated,
                skipped,
                remaining,
            )
    finally:
        if redis is not None:
            await redis.close()
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Stopniowe uzupełnianie label_pl w hpo_terms (MyMemory + Redis cache)"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=500,
        help="Maks. liczba wierszy z NULL label_pl w tej jednej sesji (domyślnie 500)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.25,
        help="Pauza w sekundach między kolejnymi terminami (0 = bez pauzy; domyślnie 0.25)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Tylko policz i pokaż przykłady, bez API i zapisu")
    args = parser.parse_args()

    if args.limit < 1:
        raise SystemExit("--limit musi być >= 1")

    asyncio.run(
        run_backfill(
            limit=args.limit,
            delay=max(0.0, args.delay),
            dry_run=args.dry_run,
        )
    )


if __name__ == "__main__":
    main()
