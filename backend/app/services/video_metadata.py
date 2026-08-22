"""Video/audio metadata extraction via FFprobe.

    Router -> VideoMetadataService -> ffprobe (system) -> structured metadata

Unlike audio_metadata.py (which uses PyAV's bundled FFmpeg libraries), video
metadata genuinely requires the system `ffprobe` executable -- there is no
in-process fallback here, by design (see spec: "Python must control FFmpeg").
"""

import json
import subprocess
from pathlib import Path
from typing import Any

from app.core.exceptions import FFmpegUnavailableError, InvalidFileError
from app.core.logging import get_logger
from app.core.video_formats import container_for_probe
from app.utils.ffmpeg import get_ffprobe_path

logger = get_logger("video_metadata")

_PROBE_TIMEOUT_SECONDS = 20


class VideoMetadataService:
    """Extracts duration/codecs/resolution/fps/bitrates/etc. from a media file."""

    def probe(self, path: Path, original_filename: str | None = None) -> dict[str, Any]:
        ffprobe_path = get_ffprobe_path()
        if not ffprobe_path:
            raise FFmpegUnavailableError("FFprobe is not available on the server.")

        cmd = [
            ffprobe_path, "-v", "quiet", "-print_format", "json",
            "-show_format", "-show_streams", str(path),
        ]
        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=_PROBE_TIMEOUT_SECONDS, check=False,
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            logger.warning("ffprobe failed to run on %s: %s", path.name, exc)
            raise InvalidFileError("Could not read the media file. It may be corrupted or unsupported.") from None

        if result.returncode != 0 or not result.stdout:
            logger.warning("ffprobe exited %s for %s: %s", result.returncode, path.name, result.stderr[:500])
            raise InvalidFileError("Could not read the media file. It may be corrupted or unsupported.") from None

        try:
            data = json.loads(result.stdout)
        except json.JSONDecodeError:
            raise InvalidFileError("Could not parse media metadata.") from None

        fmt = data.get("format", {}) or {}
        streams = data.get("streams", []) or []
        video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
        audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)

        if video_stream is None and audio_stream is None:
            raise InvalidFileError("The file does not contain any video or audio streams.")

        extension_hint = (original_filename or path.name).rsplit(".", 1)[-1] if "." in (original_filename or path.name) else None
        container = container_for_probe(fmt.get("format_name", ""), extension_hint)

        duration = self._safe_float(fmt.get("duration"))
        if duration is None and video_stream:
            duration = self._safe_float(video_stream.get("duration"))
        if duration is None and audio_stream:
            duration = self._safe_float(audio_stream.get("duration"))

        return {
            "filename": original_filename or path.name,
            "size": self._safe_int(fmt.get("size")) or (path.stat().st_size if path.exists() else 0),
            "container": container or fmt.get("format_name"),
            "format_long_name": fmt.get("format_long_name"),
            "duration": round(duration, 3) if duration is not None else None,
            "has_video": video_stream is not None,
            "has_audio": audio_stream is not None,
            "video_codec": video_stream.get("codec_name") if video_stream else None,
            "audio_codec": audio_stream.get("codec_name") if audio_stream else None,
            "width": video_stream.get("width") if video_stream else None,
            "height": video_stream.get("height") if video_stream else None,
            "fps": self._parse_frame_rate(video_stream.get("r_frame_rate")) if video_stream else None,
            "video_bitrate": self._safe_int(video_stream.get("bit_rate")) if video_stream else None,
            "audio_bitrate": self._safe_int(audio_stream.get("bit_rate")) if audio_stream else None,
            "sample_rate": self._safe_int(audio_stream.get("sample_rate")) if audio_stream else None,
            "channels": audio_stream.get("channels") if audio_stream else None,
            "overall_bitrate": self._safe_int(fmt.get("bit_rate")),
            "tags": fmt.get("tags") or {},
        }

    def duration_seconds(self, path: Path) -> float | None:
        """Fast path used by the job manager to compute progress percentages."""
        data = self.probe(path)
        return data.get("duration")

    @staticmethod
    def _safe_float(value) -> float | None:
        try:
            return float(value) if value is not None else None
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _safe_int(value) -> int | None:
        try:
            return int(float(value)) if value is not None else None
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _parse_frame_rate(rate: str | None) -> float | None:
        if not rate or "/" not in rate:
            return None
        try:
            num, den = rate.split("/")
            den_f = float(den)
            return round(float(num) / den_f, 3) if den_f else None
        except (ValueError, ZeroDivisionError):
            return None


video_metadata_service = VideoMetadataService()
