import os

from slowapi import Limiter
from slowapi.util import get_remote_address

_rate_limit_off = os.environ.get("ZP_DISABLE_RATE_LIMIT", "").lower() in (
    "1",
    "true",
    "yes",
)

limiter = Limiter(
    key_func=get_remote_address,
    enabled=not _rate_limit_off,
)
