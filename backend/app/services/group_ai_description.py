import json
import logging
import re

from app.config import settings
from app.services.ai_token_metrics import record_openai_usage

logger = logging.getLogger(__name__)

MODEL = "gpt-4o-mini"


def generate_group_ai_description(
    keywords: list[str] | None,
    sample_texts: list[str],
    current_category: str | None,
) -> tuple[str | None, str | None]:
    """
    Generuje wypunktowany opis objawów grupy (max 5 punktów) oraz precyzyjną kategorię.
    Zwraca (tekst z liniami zaczynającymi się od „- ”, kategoria) lub (None, None) przy błędzie.
    """
    if not settings.openai_api_key:
        return None, None

    from app.services.group_characteristics import CATEGORY_KEYWORDS

    allowed_categories = tuple(CATEGORY_KEYWORDS.keys()) + ("Inne",)

    kws = keywords or []
    texts = [t.strip() for t in sample_texts if t and t.strip()]
    if not texts and not kws:
        return None, None

    try:
        from openai import OpenAI
    except ImportError:
        logger.warning("Pakiet openai nie jest zainstalowany — pomijam generowanie opisu grupy")
        return None, None

    client = OpenAI(api_key=settings.openai_api_key)

    kw_block = ", ".join(kws) if kws else "(brak)"
    texts_block = "\n---\n".join(texts[:10])
    cat_hint = current_category or "nieokreślona"
    cats_list = ", ".join(allowed_categories)

    user_content = f"""Słowa kluczowe grupy: {kw_block}
Obecna kategoria (heurystyczna): {cat_hint}

Fragmenty opisów opiekunów (anonimizowane, po polsku):
{texts_block}

Zwróć WYŁĄCZNIE obiekt JSON o kluczach:
- "symptoms": tablica od 1 do 5 krótkich fraz opisujących najważniejsze objawy/choroby w tej grupie (po polsku, bez numeracji w tekście)
- "category": dokładnie jedna z wartości: [{cats_list}] — wybierz najlepiej pasującą do treści."""

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Jesteś asystentem medycznym wspierającym platformę dla opiekunów osób z rzadkimi chorobami. "
                        "Odpowiadasz wyłącznie poprawnym JSON bez markdown."
                    ),
                },
                {"role": "user", "content": user_content},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
    except Exception as exc:
        logger.warning("OpenAI — błąd wywołania: %s", exc)
        return None, None

    usage = getattr(completion, "usage", None)
    if usage is not None:
        record_openai_usage(
            getattr(usage, "prompt_tokens", None),
            getattr(usage, "completion_tokens", None),
        )

    raw = completion.choices[0].message.content
    if not raw:
        return None, None

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("OpenAI — niepoprawny JSON: %s", raw[:200])
        return None, None

    symptoms = data.get("symptoms")
    category = data.get("category")

    if not isinstance(symptoms, list):
        return None, None

    lines: list[str] = []
    for item in symptoms[:5]:
        if isinstance(item, str) and item.strip():
            line = item.strip()
            line = re.sub(r"^[\-\•\*]\s*", "", line)
            lines.append(f"- {line}")

    if not lines:
        return None, None

    ai_description = "\n".join(lines)

    improved_category: str | None = None
    if isinstance(category, str) and category.strip():
        c = category.strip()
        if c in allowed_categories:
            improved_category = c
        else:
            for allowed in allowed_categories:
                if allowed.lower() == c.lower():
                    improved_category = allowed
                    break
            if improved_category is None:
                improved_category = "Inne"

    return ai_description, improved_category
