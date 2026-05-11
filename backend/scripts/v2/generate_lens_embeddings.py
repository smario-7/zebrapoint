"""
Jednorazowy skrypt: generuj opisy i embeddingi dla soczewek.

    cd backend
    python -m scripts.v2.generate_lens_embeddings [--dry-run] [--no-llm] [--lens-id UUID] [--all]

Opcje:
    --dry-run       Wypisz co by zostało przetworzone, nie zapisuj
    --no-llm        Pomiń generowanie opisów (tylko embeddingi z nazwy + ewent. HPO)
    --lens-id UUID  Przetwórz tylko jedną soczewkę (debug)
    --all           Przetwórz też soczewki z istniejącym embeddingiem (re-generate)
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


async def run(
    *,
    dry_run: bool = False,
    lens_id: str | None = None,
    regenerate_all: bool = False,
) -> None:
    from uuid import UUID

    from app.core.database import database_url
    from app.models.v2.lens import Lens

    engine = create_async_engine(database_url, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    try:
        async with session_factory() as session:
            query = select(Lens).where(Lens.is_active.is_(True))
            if lens_id:
                query = query.where(Lens.id == UUID(lens_id))
            elif not regenerate_all:
                query = query.where(Lens.embedding.is_(None))

            result = await session.execute(query)
            lenses = list(result.scalars().all())

        logger.info("Soczewek do przetworzenia: %d", len(lenses))
        if not lenses:
            logger.info("Brak soczewek do przetworzenia. Koniec.")
            return

        by_type: dict[str, int] = {}
        for lens in lenses:
            by_type[lens.type] = by_type.get(lens.type, 0) + 1
        for t, cnt in sorted(by_type.items()):
            logger.info("  %s: %d soczewek", t, cnt)

        if dry_run:
            logger.info("[DRY RUN] — baza niezmieniona.")
            return

        from app.workers.v2.embedding_tasks import _generate_embeddings_async

        ids = [str(l.id) for l in lenses]
        await _generate_embeddings_async(lens_ids=ids)

    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--no-llm",
        action="store_true",
        help="Pomiń OpenAI (opisów nie generuj — tylko nazwa + HPO w tekście embeddingu)",
    )
    parser.add_argument("--lens-id", type=str, default=None)
    parser.add_argument(
        "--all",
        dest="regenerate_all",
        action="store_true",
        help="Re-generuj też istniejące embeddingi",
    )
    args = parser.parse_args()

    if args.no_llm:
        import app.services.v2.llm_service as llm_mod

        llm_mod.generate_lens_description = lambda *a, **kw: None
        logger.info("Tryb --no-llm: opisy nie będą generowane.")

    asyncio.run(
        run(
            dry_run=args.dry_run,
            lens_id=args.lens_id,
            regenerate_all=args.regenerate_all,
        )
    )


if __name__ == "__main__":
    main()
