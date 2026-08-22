"""Video-to-video conversion service.

    Router -> job_manager -> VideoConverterService -> ffmpeg_runner -> Output file

Validates the request against the dynamically-detected FFmpeg capabilities in
core/video_formats.py (never trusting that a codec/container exists just
because it's in the static tables), then delegates the actual encode to
ffmpeg_runner. Routers and job_manager never build FFmpeg arguments directly.
"""

from pathlib import Path

from app.core.exceptions import InvalidOutputFormatError, InvalidParameterError, UnsupportedCodecError
from app.core.video_formats import (
    ALLOWED_FPS,
    MAX_CUSTOM_DIMENSION,
    MIN_CUSTOM_DIMENSION,
    QUALITY_PRESETS,
    RESOLUTION_PRESETS,
    VideoContainerSpec,
    get_container,
    list_available_audio_codecs,
    list_available_containers,
    list_available_video_codecs,
)
from app.services import ffmpeg_runner


class ConvertOptions:
    """Parsed/raw options coming from the request; validated inside the service."""

    __slots__ = (
        "output_format", "video_codec", "audio_codec", "video_bitrate", "audio_bitrate",
        "resolution", "custom_width", "custom_height", "fps", "quality",
    )

    def __init__(
        self,
        output_format: str,
        video_codec: str | None = None,
        audio_codec: str | None = None,
        video_bitrate: str | None = None,
        audio_bitrate: str | None = None,
        resolution: str | None = None,
        custom_width: int | None = None,
        custom_height: int | None = None,
        fps: int | None = None,
        quality: str | None = None,
    ):
        self.output_format = output_format
        self.video_codec = video_codec
        self.audio_codec = audio_codec
        self.video_bitrate = video_bitrate
        self.audio_bitrate = audio_bitrate
        self.resolution = resolution
        self.custom_width = custom_width
        self.custom_height = custom_height
        self.fps = fps
        self.quality = quality


class VideoConverterService:
    # --- validation helpers (no unsafe/arbitrary values reach FFmpeg) -------

    @staticmethod
    def validate_container(output_format: str) -> VideoContainerSpec:
        container = get_container(output_format)
        if container is None or not container.output_supported:
            raise InvalidOutputFormatError(f"'{output_format}' is not a supported output format.")
        if container.key not in list_available_containers():
            raise InvalidOutputFormatError(f"'{output_format}' is not supported by the installed FFmpeg build.")
        return container

    @staticmethod
    def validate_video_codec(container: VideoContainerSpec, video_codec: str | None) -> str | None:
        if not video_codec or video_codec in ("auto", "default"):
            return None
        if video_codec == "copy":
            return "copy"
        available = list_available_video_codecs(container.key)
        if video_codec not in available:
            raise UnsupportedCodecError(
                f"Video codec '{video_codec}' is not supported for {container.label} by the "
                f"installed FFmpeg build. Available: {', '.join(available) or 'none'}."
            )
        return video_codec

    @staticmethod
    def validate_audio_codec(container: VideoContainerSpec, audio_codec: str | None) -> str | None:
        if audio_codec == "none":
            return "none"
        if not audio_codec or audio_codec in ("auto", "default"):
            return None
        if audio_codec == "copy":
            return "copy"
        available = list_available_audio_codecs(container.key)
        if audio_codec not in available:
            raise UnsupportedCodecError(
                f"Audio codec '{audio_codec}' is not supported for {container.label} by the "
                f"installed FFmpeg build. Available: {', '.join(available) or 'none'}."
            )
        return audio_codec

    @staticmethod
    def validate_resolution(resolution: str | None, custom_width: int | None, custom_height: int | None) -> None:
        if not resolution or resolution == "original":
            return
        if resolution == "custom":
            for value, name in ((custom_width, "custom_width"), (custom_height, "custom_height")):
                if not value or not (MIN_CUSTOM_DIMENSION <= value <= MAX_CUSTOM_DIMENSION):
                    raise InvalidParameterError(
                        f"{name} must be between {MIN_CUSTOM_DIMENSION} and {MAX_CUSTOM_DIMENSION} pixels."
                    )
            return
        if resolution not in RESOLUTION_PRESETS:
            raise InvalidParameterError(f"Unsupported resolution '{resolution}'.")

    @staticmethod
    def validate_fps(fps: int | None) -> None:
        if fps is not None and fps not in ALLOWED_FPS:
            raise InvalidParameterError(f"Unsupported fps {fps}. Allowed: {sorted(ALLOWED_FPS)}")

    @staticmethod
    def validate_quality(quality: str | None) -> str:
        if quality is None:
            return "balanced"
        if quality not in QUALITY_PRESETS:
            raise InvalidParameterError(f"Invalid quality '{quality}'. Allowed: {', '.join(QUALITY_PRESETS)}")
        return quality

    def validate(self, options: ConvertOptions):
        container = self.validate_container(options.output_format)
        video_codec = self.validate_video_codec(container, options.video_codec)
        audio_codec = self.validate_audio_codec(container, options.audio_codec)
        self.validate_resolution(options.resolution, options.custom_width, options.custom_height)
        self.validate_fps(options.fps)
        quality = self.validate_quality(options.quality)
        return container, video_codec, audio_codec, quality

    # --- the actual conversion, via ffmpeg_runner ----------------------------

    async def run(
        self,
        input_path: Path,
        output_path: Path,
        options: ConvertOptions,
        *,
        duration_seconds: float | None = None,
        on_progress=None,
        on_process_started=None,
    ) -> None:
        container, video_codec, audio_codec, quality = self.validate(options)

        await ffmpeg_runner.convert_video(
            input_path, output_path, container.key,
            video_codec=video_codec, audio_codec=audio_codec,
            bitrate=options.video_bitrate, audio_bitrate=options.audio_bitrate,
            resolution=options.resolution, custom_width=options.custom_width, custom_height=options.custom_height,
            fps=options.fps, quality=quality,
            duration_seconds=duration_seconds, on_progress=on_progress, on_process_started=on_process_started,
        )


video_converter_service = VideoConverterService()
