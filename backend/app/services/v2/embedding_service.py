"""
Serwis embeddingów v2.
Model: paraphrase-multilingual-MiniLM-L12-v2 (384 wymiary)
Singleton — model ładowany raz przy pierwszym użyciu (lazy).
"""

from __future__ import annotations

import logging
from functools import lru_cache

import numpy as np

logger = logging.getLogger(__name__)

MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
EMBEDDING_DIM = 384


@lru_cache(maxsize=1)
def _get_model():
    """Lazy singleton — model ładowany raz na proces."""
    from sentence_transformers import SentenceTransformer

    logger.info("Ładowanie modelu embeddingów: %s", MODEL_NAME)
    model = SentenceTransformer(MODEL_NAME)
    logger.info("Model załadowany.")
    return model


def encode(texts: str | list[str]) -> np.ndarray:
    """
    Enkoduje tekst(y) do wektorów 384D.
    Zwraca ndarray shape (384,) dla stringa, (N, 384) dla listy.
    """
    model = _get_model()
    if isinstance(texts, str):
        texts = [texts]
        result = model.encode(texts, normalize_embeddings=True)
        return result[0]
    return model.encode(texts, normalize_embeddings=True)


def encode_batch(texts: list[str], batch_size: int = 32) -> list[list[float]]:
    """
    Enkoduje listę tekstów w batchach.
    Zwraca listę wektorów jako list[float] — kompatybilne z pgvector.
    """
    model = _get_model()
    vectors = model.encode(
        texts,
        batch_size=batch_size,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return [v.tolist() for v in vectors]
