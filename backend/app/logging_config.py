import logging
import sys
from logging.handlers import RotatingFileHandler

from app.config import settings

_LOG_FORMAT = "%(asctime)s %(levelname)-8s %(name)s: %(message)s"
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logging() -> None:
    log_dir = settings.resolved_log_dir()
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / "backend.log"

    root = logging.getLogger()
    root.setLevel(logging.DEBUG if settings.debug else logging.INFO)

    for h in root.handlers[:]:
        root.removeHandler(h)

    stream = logging.StreamHandler(sys.stdout)
    stream.setLevel(logging.DEBUG if settings.debug else logging.INFO)
    stream.setFormatter(logging.Formatter(_LOG_FORMAT, _DATE_FORMAT))
    root.addHandler(stream)

    file_handler = RotatingFileHandler(
        log_path,
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setLevel(logging.DEBUG if settings.debug else logging.INFO)
    file_handler.setFormatter(logging.Formatter(_LOG_FORMAT, _DATE_FORMAT))
    root.addHandler(file_handler)
