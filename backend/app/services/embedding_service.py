import logging
from sentence_transformers import SentenceTransformer
import numpy as np

logger = logging.getLogger(__name__)

MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"

_model: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    """
    Zwraca załadowany model (singleton).
    Pierwsze wywołanie ładuje model z dysku/cache (~5–30 sekund).
    Kolejne wywołania są natychmiastowe.
    """
    global _model
    if _model is None:
        logger.info(f"Ładowanie modelu embeddingów: {MODEL_NAME}")
        _model = SentenceTransformer(MODEL_NAME)
        logger.info("Model załadowany pomyślnie")
    return _model


def generate_embedding(text: str) -> list[float]:
    """
    Generuje embedding dla podanego tekstu.

    Args:
        text: tekst do przetworzenia (opis objawów)

    Returns:
        lista 384 wartości float (wektor znormalizowany)
    """
    model = get_model()

    embedding: np.ndarray = model.encode(
        text,
        normalize_embeddings=True,
        show_progress_bar=False
    )

    return embedding.tolist()


def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """
    Generuje embeddingi dla wielu tekstów naraz (używane przy retrain w Fazie 2).
    Przetwarzanie wsadowe jest znacznie szybsze niż pętla po jednym.
    """
    model = get_model()
    embeddings = model.encode(
        texts,
        normalize_embeddings=True,
        batch_size=32,
        show_progress_bar=True
    )
    return [e.tolist() for e in embeddings]
