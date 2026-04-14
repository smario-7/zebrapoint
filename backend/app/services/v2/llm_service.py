"""
Serwis LLM v2 — generowanie opisów soczewek przez OpenAI (gpt-4o-mini).

Wymaga OPENAI_API_KEY oraz włączonej flagi hpo_extraction_enabled (jak w ekstrakcji HPO).
Przy braku klucza lub błędzie API zwracane jest None — embedding może powstać z samej nazwy.
"""

from __future__ import annotations

import logging

from openai import OpenAI

from app.config import settings

logger = logging.getLogger(__name__)

_LENS_DESCRIPTION_PROMPT = """\
Napisz krótki opis (2-3 zdania, max 150 słów) dla sekcji tematycznej portalu \
wsparcia dla rodziców dzieci z rzadkimi chorobami. Sekcja nazywa się: "{name}".

Dodatkowy kontekst (jeśli dostępny):
{context}

Opis powinien:
- być napisany po polsku, ciepłym i przystępnym językiem
- wyjaśnić czego dotyczy ta sekcja i kto może tu znaleźć pomoc
- NIE zawierać kodów medycznych ani skrótów niezrozumiałych dla rodziców
- NIE zaczynać się od nazwy sekcji

Odpowiedz TYLKO opisem, bez żadnych dodatkowych komentarzy.\
"""


def generate_lens_description(
    name: str,
    *,
    hpo_labels: list[str] | None = None,
    orpha_name_en: str | None = None,
) -> str | None:
    """
    Generuje opis soczewki przez gpt-4o-mini.
    Zwraca None jeśli: brak klucza API, flaga wyłączona, błąd API.
    """
    if not settings.hpo_extraction_enabled:
        logger.debug("LLM wyłączony (hpo_extraction_enabled=False) — pomijam opis dla '%s'", name)
        return None

    if not settings.openai_api_key:
        logger.warning("Brak OPENAI_API_KEY — pomijam opis dla '%s'", name)
        return None

    context_parts = []
    if orpha_name_en:
        context_parts.append(f"Choroba (EN): {orpha_name_en}")
    if hpo_labels:
        context_parts.append(f"Powiązane objawy: {', '.join(hpo_labels[:10])}")
    context = "\n".join(context_parts) if context_parts else "brak dodatkowego kontekstu"

    prompt = _LENS_DESCRIPTION_PROMPT.format(name=name, context=context)

    try:
        client = OpenAI(api_key=settings.openai_api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=200,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.choices[0].message.content
        if not raw:
            return None
        description = raw.strip()
        logger.debug("Wygenerowano opis dla '%s': %d znaków", name, len(description))
        return description

    except Exception as e:
        logger.warning("Błąd OpenAI API dla '%s': %s", name, e)
        return None
