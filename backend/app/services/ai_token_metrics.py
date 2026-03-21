import logging
from datetime import date, timedelta

import redis as redis_lib

from app.config import settings

logger = logging.getLogger(__name__)

KEY_PROMPT = "ai:tokens:prompt"
KEY_COMPLETION = "ai:tokens:completion"
KEY_CALLS = "ai:tokens:calls"


def record_openai_usage(
    prompt_tokens: int | None,
    completion_tokens: int | None,
) -> None:
    if prompt_tokens is None and completion_tokens is None:
        return
    pt = int(prompt_tokens or 0)
    ct = int(completion_tokens or 0)
    if pt == 0 and ct == 0:
        return
    try:
        r = redis_lib.from_url(settings.redis_url, decode_responses=True)
        if pt:
            r.incrby(KEY_PROMPT, pt)
        if ct:
            r.incrby(KEY_COMPLETION, ct)
        r.incr(KEY_CALLS, 1)
        today = date.today().isoformat()
        if pt:
            r.incrby(f"ai:tokens:daily:{today}:prompt", pt)
        if ct:
            r.incrby(f"ai:tokens:daily:{today}:completion", ct)
    except Exception as exc:
        logger.warning("Redis — nie udało się zapisać metryk tokenów OpenAI: %s", exc)


def read_token_totals(r: redis_lib.Redis) -> dict:
    def _int(key: str) -> int:
        v = r.get(key)
        return int(v) if v is not None else 0

    prompt = _int(KEY_PROMPT)
    completion = _int(KEY_COMPLETION)
    return {
        "calls": _int(KEY_CALLS),
        "prompt_tokens": prompt,
        "completion_tokens": completion,
        "total_tokens": prompt + completion,
    }


def read_daily_history(r: redis_lib.Redis, days: int = 30) -> list[dict]:
    out: list[dict] = []
    for i in range(days):
        d = (date.today() - timedelta(days=i)).isoformat()
        pk = f"ai:tokens:daily:{d}:prompt"
        ck = f"ai:tokens:daily:{d}:completion"
        p = r.get(pk)
        c = r.get(ck)
        pi = int(p) if p is not None else 0
        ci = int(c) if c is not None else 0
        out.append(
            {
                "date": d,
                "prompt_tokens": pi,
                "completion_tokens": ci,
                "total_tokens": pi + ci,
            }
        )
    return out
