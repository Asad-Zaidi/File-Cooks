"""Central audio format configuration.

Every place in the codebase that needs to know which formats exist, what
they're called on disk, which PyAV encoder/muxer produces them, or which
bitrates/sample rates are valid for them reads from this module instead of
hard-coding format checks inline. Adding a new format means adding one entry
here (see README for the checklist).
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class AudioFormatSpec:
    key: str
    label: str
    extensions: tuple[str, ...]
    mime_types: tuple[str, ...]

    input_supported: bool = True
    output_supported: bool = True
    lossless: bool = False

    # PyAV encoder ("codec") and muxer ("format") names used when this
    # format is the *output* of a conversion. None for input-only formats.
    encoder: str | None = None
    muxer: str | None = None

    supports_bitrate: bool = False
    default_bitrate: str | None = None
    allowed_bitrates: tuple[str, ...] = ()

    # Some codecs only support a fixed sample rate / channel count
    # (e.g. AMR-NB is 8kHz mono only). When set, requested values are
    # coerced rather than rejected.
    fixed_sample_rate: int | None = None
    fixed_channels: int | None = None
    allowed_sample_rates: tuple[int, ...] = ()

    # Extra encoder-context options required to unlock the codec
    # (e.g. FFmpeg's native Vorbis encoder is flagged "experimental").
    codec_options: dict = field(default_factory=dict)

    @property
    def primary_extension(self) -> str:
        return self.extensions[0]

    @property
    def mime_type(self) -> str:
        return self.mime_types[0]


COMMON_SAMPLE_RATES: tuple[int, ...] = (8000, 11025, 16000, 22050, 24000, 32000, 44100, 48000, 96000)
QUALITY_PRESETS: tuple[str, ...] = ("low", "medium", "high", "best")
_QUALITY_FRACTIONS = {"low": 0.0, "medium": 0.4, "high": 0.75, "best": 1.0}


SUPPORTED_AUDIO_FORMATS: dict[str, AudioFormatSpec] = {
    "mp3": AudioFormatSpec(
        key="mp3", label="MP3", extensions=("mp3",), mime_types=("audio/mpeg",),
        encoder="libmp3lame", muxer="mp3",
        supports_bitrate=True, default_bitrate="192k",
        allowed_bitrates=("128k", "192k", "256k", "320k"),
    ),
    "wav": AudioFormatSpec(
        key="wav", label="WAV", extensions=("wav",), mime_types=("audio/wav", "audio/x-wav"),
        encoder="pcm_s16le", muxer="wav", lossless=True,
    ),
    "m4a": AudioFormatSpec(
        key="m4a", label="M4A (AAC)", extensions=("m4a",), mime_types=("audio/mp4", "audio/x-m4a"),
        encoder="aac", muxer="ipod",
        supports_bitrate=True, default_bitrate="192k",
        allowed_bitrates=("128k", "192k", "256k", "320k"),
    ),
    "aac": AudioFormatSpec(
        key="aac", label="AAC", extensions=("aac",), mime_types=("audio/aac", "audio/x-aac"),
        encoder="aac", muxer="adts",
        supports_bitrate=True, default_bitrate="192k",
        allowed_bitrates=("128k", "192k", "256k", "320k"),
    ),
    "flac": AudioFormatSpec(
        key="flac", label="FLAC", extensions=("flac",), mime_types=("audio/flac", "audio/x-flac"),
        encoder="flac", muxer="flac", lossless=True,
    ),
    "ogg": AudioFormatSpec(
        key="ogg", label="OGG Vorbis", extensions=("ogg",), mime_types=("audio/ogg",),
        encoder="vorbis", muxer="ogg",
        supports_bitrate=True, default_bitrate="192k",
        allowed_bitrates=("128k", "192k", "256k", "320k"),
        codec_options={"strict": "-2"},  # FFmpeg's built-in Vorbis encoder is "experimental"
    ),
    "opus": AudioFormatSpec(
        key="opus", label="Opus", extensions=("opus",), mime_types=("audio/opus",),
        encoder="libopus", muxer="ogg",
        supports_bitrate=True, default_bitrate="128k",
        allowed_bitrates=("64k", "96k", "128k", "192k", "256k"),
        allowed_sample_rates=(8000, 12000, 16000, 24000, 48000),
        fixed_sample_rate=48000,
    ),
    "wma": AudioFormatSpec(
        key="wma", label="Windows Media Audio", extensions=("wma",), mime_types=("audio/x-ms-wma",),
        output_supported=False,  # decode-only: FFmpeg/PyAV don't ship a free WMA encoder
    ),
    "aiff": AudioFormatSpec(
        key="aiff", label="AIFF", extensions=("aiff", "aif"), mime_types=("audio/aiff", "audio/x-aiff"),
        encoder="pcm_s16be", muxer="aiff", lossless=True,
    ),
    "amr": AudioFormatSpec(
        key="amr", label="AMR", extensions=("amr",), mime_types=("audio/amr",),
        encoder="libopencore_amrnb", muxer="amr",
        supports_bitrate=True, default_bitrate="12.2k",
        allowed_bitrates=("4.75k", "5.15k", "5.9k", "6.7k", "7.4k", "7.95k", "10.2k", "12.2k"),
        fixed_sample_rate=8000, fixed_channels=1,
    ),
    "ac3": AudioFormatSpec(
        key="ac3", label="Dolby Digital (AC-3)", extensions=("ac3",), mime_types=("audio/ac3",),
        encoder="ac3", muxer="ac3",
        supports_bitrate=True, default_bitrate="192k",
        allowed_bitrates=("128k", "192k", "256k", "320k", "384k", "448k"),
    ),
}


EXTENSION_TO_FORMAT: dict[str, str] = {
    ext: spec.key for spec in SUPPORTED_AUDIO_FORMATS.values() for ext in spec.extensions
}

# ffprobe/PyAV container ("format_name") tokens mapped back to a canonical
# format key, used to identify the *real* input format rather than trusting
# the filename extension. ffprobe often reports several comma-separated
# aliases for one container, hence the substring-based lookup helper below.
CONTAINER_NAME_HINTS: dict[str, str] = {
    "mp3": "mp3",
    "wav": "wav",
    "flac": "flac",
    "ogg": "ogg",
    "aiff": "aiff",
    "amr": "amr",
    "ac3": "ac3",
    "asf": "wma",
    "mov,mp4,m4a,3gp,3g2,mj2": "m4a",
    "mp4": "m4a",
    "m4a": "m4a",
    "adts": "aac",
}


def get_format(key: str) -> AudioFormatSpec | None:
    return SUPPORTED_AUDIO_FORMATS.get((key or "").strip().lower())


def format_for_extension(filename: str) -> str | None:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return EXTENSION_TO_FORMAT.get(ext)


def format_for_container_name(container_format_name: str, codec_name: str | None = None) -> str | None:
    """Best-effort mapping from an ffprobe/PyAV container format name to a
    canonical format key. Falls back to codec name for ambiguous containers
    (e.g. an MP4 container may hold AAC audio -> "m4a")."""
    name = (container_format_name or "").lower()

    if name in CONTAINER_NAME_HINTS:
        return CONTAINER_NAME_HINTS[name]

    for token, key in CONTAINER_NAME_HINTS.items():
        if token in name:
            return key

    if codec_name:
        codec = codec_name.lower()
        if codec == "aac":
            return "m4a"
        if codec in ("pcm_s16le", "pcm_s24le", "pcm_s32le"):
            return "wav"
        if codec in ("pcm_s16be", "pcm_s24be"):
            return "aiff"
        if codec == "vorbis":
            return "ogg"
        if codec == "opus":
            return "opus"

    return None


def list_input_formats() -> list[str]:
    return sorted(k for k, s in SUPPORTED_AUDIO_FORMATS.items() if s.input_supported)


def list_output_formats() -> list[str]:
    return sorted(k for k, s in SUPPORTED_AUDIO_FORMATS.items() if s.output_supported)


def bitrate_for_quality(spec: AudioFormatSpec, quality: str | None) -> str | None:
    if not spec.supports_bitrate:
        return None
    if not spec.allowed_bitrates:
        return spec.default_bitrate
    fraction = _QUALITY_FRACTIONS.get((quality or "medium").lower(), _QUALITY_FRACTIONS["medium"])
    index = round(fraction * (len(spec.allowed_bitrates) - 1))
    return spec.allowed_bitrates[index]


def parse_bitrate_to_bps(bitrate: str) -> int:
    """Parse a bitrate string such as "192k" or "4.75k" into bits/second."""
    text = bitrate.strip().lower().rstrip("bps").rstrip("b")
    if text.endswith("k"):
        return int(float(text[:-1]) * 1000)
    if text.endswith("m"):
        return int(float(text[:-1]) * 1_000_000)
    return int(float(text))
