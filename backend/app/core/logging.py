"""Structured logging configuration.

Every log record is emitted as a single line with a timestamp, level, logger
name and message, plus any structured ``extra=`` fields. Never log secrets
(Mongo URL/credentials, API keys, raw file contents, user PII) — pass only
identifiers such as conversion_id, filenames, formats, sizes and durations.
"""

import logging
import sys
from typing import Any

from app.core.config import settings

_LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

_CONFIGURED = False


def configure_logging() -> None:
    """Idempotently configure the root "filecooks" logger."""
    global _CONFIGURED
    if _CONFIGURED:
        return

    level = logging.DEBUG if settings.DEBUG else logging.INFO

    root = logging.getLogger("filecooks")
    root.setLevel(level)
    root.propagate = False

    if not root.handlers:
        handler = logging.StreamHandler(stream=sys.stdout)
        handler.setFormatter(logging.Formatter(_LOG_FORMAT, datefmt=_DATE_FORMAT))
        root.addHandler(handler)

    # Keep third-party loggers reasonably quiet.
    logging.getLogger("pymongo").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)

    _CONFIGURED = True


def get_logger(name: str) -> logging.Logger:
    configure_logging()
    return logging.getLogger(f"filecooks.{name}")


# --- Convenience helpers for the events the spec explicitly calls out ---

_logger = get_logger("audio")


def _safe_extra(**fields: Any) -> dict:
    """Drop None values so log lines stay compact."""
    return {k: v for k, v in fields.items() if v is not None}


def log_request(method: str, path: str, **fields: Any) -> None:
    _logger.info("request %s %s | %s", method, path, _safe_extra(**fields))


def log_conversion_started(conversion_id: str, input_format: str, output_format: str, **fields: Any) -> None:
    _logger.info(
        "conversion started | id=%s %s->%s | %s",
        conversion_id, input_format, output_format, _safe_extra(**fields),
    )


def log_conversion_completed(conversion_id: str, processing_time: float, output_size: int, **fields: Any) -> None:
    _logger.info(
        "conversion completed | id=%s duration=%.2fs output_size=%d | %s",
        conversion_id, processing_time, output_size, _safe_extra(**fields),
    )


def log_conversion_failed(conversion_id: str, error: str, **fields: Any) -> None:
    _logger.error("conversion failed | id=%s error=%s | %s", conversion_id, error, _safe_extra(**fields))
