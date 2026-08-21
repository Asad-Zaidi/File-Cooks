"""Audio metadata extraction, powered by PyAV.

PyAV links against its own bundled FFmpeg libraries, so metadata extraction
works even when no system FFmpeg binary is on PATH.
"""

from pathlib import Path
from typing import Any

import av

from app.core.exceptions import InvalidFileError
from app.core.formats import format_for_container_name
from app.core.logging import get_logger

logger = get_logger("audio_metadata")

_MICROSECONDS_PER_SECOND = 1_000_000


class AudioMetadataService:
    """Extracts duration/codec/sample-rate/etc. from an audio file."""

    def probe(self, path: Path) -> dict[str, Any]:
        """Open `path` with PyAV and return structured metadata.

        Raises InvalidFileError if the file can't be parsed as audio.
        """
        try:
            container = av.open(str(path))
        except (av.FFmpegError, OSError) as exc:
            logger.warning("Failed to open %s for probing: %s", path.name, exc)
            raise InvalidFileError("Could not read the audio file. It may be corrupted or in an unsupported format.") from None

        try:
            audio_streams = [s for s in container.streams if s.type == "audio"]
            if not audio_streams:
                raise InvalidFileError("The file does not contain an audio stream.")
            stream = audio_streams[0]
            codec_context = stream.codec_context

            duration_seconds = self._duration_seconds(container, stream)
            container_format = container.format.name
            detected_format = format_for_container_name(container_format, codec_context.name)

            bitrate = codec_context.bit_rate or container.bit_rate or None

            return {
                "format": detected_format or container_format,
                "container": container_format,
                "duration": round(duration_seconds, 3) if duration_seconds is not None else None,
                "codec": codec_context.name,
                "sample_rate": codec_context.sample_rate or None,
                "channels": codec_context.channels or None,
                "bitrate": bitrate,
                "tags": dict(container.metadata or {}),
            }
        finally:
            container.close()

    @staticmethod
    def _duration_seconds(container: "av.container.InputContainer", stream) -> float | None:
        if container.duration:
            return container.duration / _MICROSECONDS_PER_SECOND
        if stream.duration and stream.time_base:
            return float(stream.duration * stream.time_base)
        return None


audio_metadata_service = AudioMetadataService()
