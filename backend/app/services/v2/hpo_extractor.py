"""
Ekstrakcja terminów HPO i tagów kontekstowych z tekstu posta.
Model: gpt-4o-mini (jeden request — dwa wyniki).
"""

from __future__ import annotations

import json
import logging

from openai import OpenAI

from app.config import settings

logger = logging.getLogger(__name__)

_EXTRACTION_PROMPT = """\
Przeanalizuj poniższy tekst napisany przez rodzica dziecka z rzadką chorobą.

Wyodrębnij:
1. "hpo_terms" — listę kodów HPO (format "HP:XXXXXXX") opisujących objawy wymienione w tekście.
   Używaj tylko rzeczywistych kodów HPO. Jeśli nie ma objawów — pusta lista.
   Maksymalnie 15 kodów.

2. "context_tags" — listę słów kluczowych opisujących kontekst (nie objawy medyczne).
   Przykłady: "szkoła", "lekarz", "rehabilitacja", "leki", "PFRON", "diagnoza", "szpital", "terapia".
   Maksymalnie 10 tagów. Tylko po polsku, małymi literami.

Odpowiedz WYŁĄCZNIE poprawnym JSON bez żadnego dodatkowego tekstu:
{{"hpo_terms": [...], "context_tags": [...]}}

Tekst do analizy:
---
{text}
---\
"""


def extract_hpo_and_tags(
    title: str,
    content: str,
) -> tuple[list[str], list[str]]:
    """
    Ekstrahuje HPO terms i context_tags z tytułu + treści posta.
    Zwraca (hpo_terms, context_tags) — obie listy mogą być puste.
    Nigdy nie rzuca wyjątku.
    """
    if not settings.hpo_extraction_enabled or not settings.openai_api_key:
        logger.debug("HPO extraction wyłączona lub brak klucza.")
        return [], []

    text = f"{title}\n\n{content}"
    text = text[:2000]

    prompt = _EXTRACTION_PROMPT.format(text=text)

    try:
        client = OpenAI(api_key=settings.openai_api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=300,
            temperature=0.0,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content
        if not raw:
            return [], []
        raw = raw.strip()
        data = json.loads(raw)

        hpo_terms = [
            t for t in data.get("hpo_terms", [])
            if isinstance(t, str) and t.startswith("HP:")
        ][:15]

        context_tags = [
            t.lower().strip() for t in data.get("context_tags", [])
            if isinstance(t, str) and t.strip()
        ][:10]

        logger.debug(
            "Ekstrahowano: %d HPO terms, %d context_tags",
            len(hpo_terms),
            len(context_tags),
        )
        return hpo_terms, context_tags

    except (json.JSONDecodeError, KeyError) as e:
        logger.warning("Błąd parsowania odpowiedzi LLM: %s", e)
        return [], []
    except Exception as e:
        logger.warning("Błąd HPO extraction: %s", e)
        return [], []
