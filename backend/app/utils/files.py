"""Filesystem helpers: safe naming, upload persistence and cleanup.

Rules enforced here (see architecture rules in the project spec):
  * User-supplied filenames are never used to build a path on disk — every
    stored file gets a fresh UUID-based name.
  * Every path we hand back to a caller is validated to stay inside the
    directory it's supposed to be in (path traversal guard).
"""

import re
import time
import unicodedata
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import FileTooLargeError, InvalidFileError
from app.core.logging import get_logger

logger = get_logger("files")

_SAFE_NAME_RE = re.compile(r"[^A-Za-z0-9._-]+")
_MAX_DISPLAY_NAME_LENGTH = 150


def sanitize_filename(filename: str) -> str:
    """Return a display-safe version of a user-supplied filename.

    Strips any directory components, normalizes unicode, and drops any
    character that isn't alphanumeric/dot/dash/underscore. Used only for
    display / download-as filenames — never to build a filesystem path.
    """
    name = Path(filename or "upload").name
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    name = _SAFE_NAME_RE.sub("_", name).strip("._")
    return (name or "upload")[:_MAX_DISPLAY_NAME_LENGTH]


def generate_internal_filename(extension: str) -> str:
    """A random, collision-proof filename for storing a file on disk."""
    ext = (extension or "bin").lower().lstrip(".")
    return f"{uuid.uuid4().hex}.{ext}"


def safe_path(base_dir: Path, filename: str) -> Path:
    """Resolve `filename` under `base_dir`, rejecting any path traversal."""
    base_dir = base_dir.resolve()
    candidate = (base_dir / Path(filename).name).resolve()
    if candidate.parent != base_dir:
        raise InvalidFileError("Invalid file path.")
    return candidate


async def save_upload_file(upload_file: UploadFile, destination_dir: Path, extension: str) -> tuple[Path, int]:
    """Stream an UploadFile to disk under a fresh UUID name, enforcing the
    configured max upload size. Returns (path, size_in_bytes)."""
    destination_dir.mkdir(parents=True, exist_ok=True)
    destination_path = safe_path(destination_dir, generate_internal_filename(extension))

    max_bytes = settings.max_upload_size_bytes
    chunk_size = 1024 * 1024
    size = 0

    try:
        with open(destination_path, "wb") as out_file:
            while chunk := await upload_file.read(chunk_size):
                size += len(chunk)
                if size > max_bytes:
                    raise FileTooLargeError(settings.MAX_UPLOAD_SIZE_MB)
                out_file.write(chunk)
    except FileTooLargeError:
        delete_file(destination_path)
        raise
    except Exception:
        delete_file(destination_path)
        raise
    finally:
        await upload_file.close()

    if size == 0:
        delete_file(destination_path)
        raise InvalidFileError("The uploaded file is empty.")

    return destination_path, size


def delete_file(path) -> None:
    if not path:
        return
    p = Path(path)
    try:
        if p.is_file():
            p.unlink()
    except OSError as exc:
        logger.warning("Could not delete file %s: %s", p.name, exc)


def delete_files(*paths) -> None:
    for path in paths:
        delete_file(path)


def cleanup_expired_files(directory: Path, max_age_hours: float) -> int:
    """Remove files older than `max_age_hours` from `directory`. Returns the
    number of files removed. Safe to call periodically."""
    if not directory.exists():
        return 0

    cutoff = time.time() - (max_age_hours * 3600)
    removed = 0
    for entry in directory.iterdir():
        try:
            if entry.is_file() and entry.stat().st_mtime < cutoff:
                entry.unlink()
                removed += 1
        except OSError as exc:
            logger.warning("Cleanup could not remove %s: %s", entry.name, exc)
    return removed


def cleanup_all_expired(max_age_hours: float | None = None) -> dict:
    """Run the retention-based cleanup across uploads/, converted/ and temp/.

    Designed to be safe to call from a periodic scheduler later on.
    """
    max_age = settings.FILE_RETENTION_HOURS if max_age_hours is None else max_age_hours
    result = {
        "uploads": cleanup_expired_files(settings.upload_path, max_age),
        "converted": cleanup_expired_files(settings.converted_path, max_age),
        "temp": cleanup_expired_files(settings.temp_path, max_age),
    }
    logger.info("Cleanup run | removed=%s", result)
    return result
