"""Video-to-audio extraction service.

    Router -> job_manager -> VideoAudioExtractorService -> ffmpeg_runner -> Output file

Extracts only the audio stream from a video file; the video stream is never
decoded (`-vn`, plus mapping only the first audio stream). If the source
audio stream is already bit-compatible with the requested output format and
no bitrate/sample-rate/channel override was requested, the audio is
stream-copied instead of re-encoded.
"""

from pathlib import Path

from app.core.exceptions import InvalidOutputFormatError, InvalidParameterError, MissingAudioStreamError
from app.core.formats import COMMON_SAMPLE_RATES, get_format, parse_bitrate_to_bps
from app.core.video_formats import AUDIO_BITRATES_KBPS
from app.services import ffmpeg_runner

# ffprobe codec_name -> the standalone audio format key(s) it's already
# natively compatible with. Drives the stream-copy decision below.
_CODEC_TO_COMPATIBLE_FORMATS: dict[str, set[str]] = {
    "aac": {"aac", "m4a"},
    "mp3": {"mp3"},
    "opus": {"opus"},
    "vorbis": {"ogg"},
    "flac": {"flac"},
    "ac3": {"ac3"},
    "pcm_s16le": {"wav"},
    "pcm_s24le": {"wav"},
    "pcm_s16be": {"aiff"},
}


class ExtractOptions:
    __slots__ = ("output_format", "bitrate_kbps", "sample_rate", "channels")

    def __init__(
        self,
        output_format: str,
        bitrate_kbps: int | None = None,
        sample_rate: int | None = None,
        channels: int | None = None,
    ):
        self.output_format = output_format
        self.bitrate_kbps = bitrate_kbps
        self.sample_rate = sample_rate
        self.channels = channels


class VideoAudioExtractorService:
    @staticmethod
    def validate(options: ExtractOptions, has_audio: bool):
        if not has_audio:
            raise MissingAudioStreamError()

        spec = get_format(options.output_format)
        if spec is None or not spec.output_supported:
            raise InvalidOutputFormatError(f"'{options.output_format}' is not a supported output audio format.")

        if options.bitrate_kbps is not None and options.bitrate_kbps not in AUDIO_BITRATES_KBPS:
            raise InvalidParameterError(
                f"Unsupported bitrate {options.bitrate_kbps}kbps. Allowed: {list(AUDIO_BITRATES_KBPS)}"
            )
        if options.sample_rate is not None and options.sample_rate not in COMMON_SAMPLE_RATES:
            raise InvalidParameterError(
                f"Unsupported sample_rate {options.sample_rate}. Allowed: {sorted(COMMON_SAMPLE_RATES)}"
            )
        if options.channels is not None and options.channels not in (1, 2):
            raise InvalidParameterError("channels must be 1 (mono) or 2 (stereo).")

        return spec

    @staticmethod
    def should_stream_copy(source_audio_codec: str | None, options: ExtractOptions) -> bool:
        """Only eligible when the codec already matches the target container
        *and* the caller isn't asking for a different bitrate/rate/channel
        layout (which a raw stream copy can't apply)."""
        if options.bitrate_kbps is not None or options.sample_rate is not None or options.channels is not None:
            return False
        if not source_audio_codec:
            return False
        return options.output_format in _CODEC_TO_COMPATIBLE_FORMATS.get(source_audio_codec, set())

    async def run(
        self,
        input_path: Path,
        output_path: Path,
        options: ExtractOptions,
        source_audio_codec: str | None,
        has_audio: bool,
        *,
        duration_seconds: float | None = None,
        on_progress=None,
        on_process_started=None,
    ) -> None:
        spec = self.validate(options, has_audio)
        stream_copy = self.should_stream_copy(source_audio_codec, options)

        bitrate_bps = None
        if not stream_copy and spec.supports_bitrate:
            if options.bitrate_kbps:
                bitrate_bps = parse_bitrate_to_bps(f"{options.bitrate_kbps}k")
            elif spec.default_bitrate:
                bitrate_bps = parse_bitrate_to_bps(spec.default_bitrate)

        sample_rate = spec.fixed_sample_rate or options.sample_rate
        channels = spec.fixed_channels or options.channels

        await ffmpeg_runner.extract_audio(
            input_path, output_path, spec,
            stream_copy=stream_copy, bitrate_bps=bitrate_bps,
            sample_rate=sample_rate, channels=channels,
            duration_seconds=duration_seconds, on_progress=on_progress, on_process_started=on_process_started,
        )


video_audio_extractor_service = VideoAudioExtractorService()
