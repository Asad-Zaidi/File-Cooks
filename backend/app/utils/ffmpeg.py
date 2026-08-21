"""FFmpeg / FFprobe detection utilities.

Audio *conversion* and *metadata extraction* in this backend are performed
through PyAV, which links against its own bundled FFmpeg libraries and
therefore works even when no system FFmpeg install is on PATH. The system
`ffmpeg`/`ffprobe` executables checked here are still required for the
PyDub-based processing operations (trim/merge/volume, see
``app/services/audio_processor.py``) and are reported on `/health` so the
backend never *silently* fails when they're missing — callers get a clear
FFMPEG_UNAVAILABLE error instead of a confusing crash.
"""

import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

from app.core.config import settings


@dataclass(frozen=True)
class ToolStatus:
    available: bool
    path: str | None = None
    version: str | None = None
    error: str | None = None

    def as_dict(self) -> dict:
        return {"available": self.available, "path": self.path, "version": self.version, "error": self.error}


def _resolve_executable(configured_path: str) -> str | None:
    found = shutil.which(configured_path)
    if found:
        return found
    candidate = Path(configured_path)
    if candidate.is_file():
        return str(candidate)
    return None


def _probe_version(executable_path: str) -> str | None:
    try:
        result = subprocess.run(
            [executable_path, "-version"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None

    output = (result.stdout or result.stderr or "").strip()
    if not output:
        return None
    first_line = output.splitlines()[0]
    match = re.search(r"version\s+(\S+)", first_line)
    return match.group(1) if match else first_line


def check_ffmpeg() -> ToolStatus:
    path = _resolve_executable(settings.FFMPEG_PATH)
    if not path:
        return ToolStatus(False, error=f"FFmpeg executable ('{settings.FFMPEG_PATH}') was not found on PATH.")
    version = _probe_version(path)
    return ToolStatus(True, path=path, version=version)


def check_ffprobe() -> ToolStatus:
    path = _resolve_executable(settings.FFPROBE_PATH)
    if not path:
        return ToolStatus(False, error=f"FFprobe executable ('{settings.FFPROBE_PATH}') was not found on PATH.")
    version = _probe_version(path)
    return ToolStatus(True, path=path, version=version)


def ensure_ffmpeg_available() -> None:
    """Raise FFmpegUnavailableError if the system FFmpeg binary is missing.

    Used by processing operations (trim/merge/volume) that shell out via
    PyDub and therefore genuinely need the system executable.
    """
    from app.core.exceptions import FFmpegUnavailableError

    status = check_ffmpeg()
    if not status.available:
        raise FFmpegUnavailableError(status.error)
