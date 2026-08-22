"""Central video container/codec configuration + dynamic FFmpeg capability detection.

Mirrors app/core/formats.py's pattern for audio: every place in the codebase
that needs to know which video containers/codecs exist, what FFmpeg encoder or
muxer name produces them, or which settings are valid for them reads from this
module instead of hard-coding format checks inline.

Nothing here is trusted blindly. `probe_ffmpeg_capabilities()` runs
`ffmpeg -encoders` / `ffmpeg -muxers` once (cached) so every "supported" list
returned by this module -- and therefore everything the API/UI ever offers --
is filtered down to what the installed FFmpeg build can actually do (spec
requirement: never display a conversion option FFmpeg can't perform).
"""

import re
import subprocess
from dataclasses import dataclass
from functools import lru_cache

from app.core.formats import COMMON_SAMPLE_RATES, parse_bitrate_to_bps  # noqa: F401  (re-exported)

QUALITY_PRESETS: tuple[str, ...] = ("fast", "balanced", "high", "maximum")
ALLOWED_FPS: tuple[int, ...] = (24, 25, 30, 50, 60)
AUDIO_BITRATES_KBPS: tuple[int, ...] = (64, 96, 128, 160, 192, 256, 320)

RESOLUTION_PRESETS: dict[str, tuple[int, int]] = {
    "360p": (640, 360),
    "480p": (854, 480),
    "720p": (1280, 720),
    "1080p": (1920, 1080),
    "1440p": (2560, 1440),
    "2160p": (3840, 2160),
}

MIN_CUSTOM_DIMENSION = 16
MAX_CUSTOM_DIMENSION = 7680  # 8K ceiling


@dataclass(frozen=True)
class VideoCodecSpec:
    key: str
    label: str
    encoder: str  # primary ffmpeg -c:v / -c:a encoder name
    kind: str  # "video" | "audio"
    fallback_encoders: tuple[str, ...] = ()
    supports_crf: bool = False
    supports_preset: bool = False
    supports_bitrate: bool = True
    lossless: bool = False


@dataclass(frozen=True)
class VideoContainerSpec:
    key: str
    label: str
    extensions: tuple[str, ...]
    mime_types: tuple[str, ...]
    muxer: str  # ffmpeg -f muxer name
    video_codecs: tuple[str, ...]  # ordered; first is the default
    audio_codecs: tuple[str, ...]
    input_supported: bool = True
    output_supported: bool = True

    @property
    def primary_extension(self) -> str:
        return self.extensions[0]

    @property
    def mime_type(self) -> str:
        return self.mime_types[0]

    @property
    def default_video_codec(self) -> str | None:
        return self.video_codecs[0] if self.video_codecs else None

    @property
    def default_audio_codec(self) -> str | None:
        return self.audio_codecs[0] if self.audio_codecs else None


# --- Video codecs -----------------------------------------------------------

VIDEO_CODECS: dict[str, VideoCodecSpec] = {
    "h264": VideoCodecSpec("h264", "H.264 / AVC", "libx264", "video", supports_crf=True, supports_preset=True),
    "h265": VideoCodecSpec("h265", "H.265 / HEVC", "libx265", "video", supports_crf=True, supports_preset=True),
    "vp8": VideoCodecSpec("vp8", "VP8", "libvpx", "video", supports_crf=True),
    "vp9": VideoCodecSpec("vp9", "VP9", "libvpx-vp9", "video", supports_crf=True),
    "av1": VideoCodecSpec(
        "av1", "AV1", "libsvtav1", "video",
        fallback_encoders=("libaom-av1", "librav1e"), supports_crf=True, supports_preset=True,
    ),
    "mpeg2video": VideoCodecSpec("mpeg2video", "MPEG-2", "mpeg2video", "video"),
    "mpeg1video": VideoCodecSpec("mpeg1video", "MPEG-1", "mpeg1video", "video"),
    "mpeg4": VideoCodecSpec("mpeg4", "MPEG-4 Part 2", "mpeg4", "video"),
    "wmv2": VideoCodecSpec("wmv2", "Windows Media Video", "wmv2", "video"),
    "theora": VideoCodecSpec("theora", "Theora", "theora", "video", supports_crf=True),
}

# --- Audio codecs, as embedded inside a video container --------------------
# (separate table from core/formats.py's standalone-audio-file registry --
# same codec names, but this one drives what can be muxed into e.g. an MP4.)

AUDIO_IN_VIDEO_CODECS: dict[str, VideoCodecSpec] = {
    "aac": VideoCodecSpec("aac", "AAC", "aac", "audio"),
    "mp3": VideoCodecSpec("mp3", "MP3", "libmp3lame", "audio"),
    "opus": VideoCodecSpec("opus", "Opus", "libopus", "audio"),
    "vorbis": VideoCodecSpec("vorbis", "Vorbis", "libvorbis", "audio"),
    "flac": VideoCodecSpec("flac", "FLAC", "flac", "audio", supports_bitrate=False, lossless=True),
    "pcm": VideoCodecSpec("pcm", "PCM", "pcm_s16le", "audio", supports_bitrate=False, lossless=True),
    "ac3": VideoCodecSpec("ac3", "Dolby Digital (AC-3)", "ac3", "audio"),
    "mp2": VideoCodecSpec("mp2", "MP2", "mp2", "audio"),
    "wmav2": VideoCodecSpec("wmav2", "WMA", "wmav2", "audio"),
}


# --- Containers --------------------------------------------------------------

VIDEO_CONTAINERS: dict[str, VideoContainerSpec] = {
    "mp4": VideoContainerSpec(
        "mp4", "MP4", ("mp4",), ("video/mp4",), "mp4",
        video_codecs=("h264", "h265", "av1", "mpeg4"),
        audio_codecs=("aac", "mp3", "ac3"),
    ),
    "mkv": VideoContainerSpec(
        "mkv", "Matroska (MKV)", ("mkv",), ("video/x-matroska",), "matroska",
        video_codecs=("h264", "h265", "vp8", "vp9", "av1", "mpeg2video", "mpeg4"),
        audio_codecs=("aac", "mp3", "opus", "vorbis", "flac", "pcm", "ac3"),
    ),
    "avi": VideoContainerSpec(
        "avi", "AVI", ("avi",), ("video/x-msvideo",), "avi",
        video_codecs=("mpeg4", "h264", "mpeg2video"),
        audio_codecs=("mp3", "pcm", "ac3"),
    ),
    "mov": VideoContainerSpec(
        "mov", "QuickTime (MOV)", ("mov",), ("video/quicktime",), "mov",
        video_codecs=("h264", "h265", "mpeg4"),
        audio_codecs=("aac", "mp3", "pcm"),
    ),
    "webm": VideoContainerSpec(
        "webm", "WebM", ("webm",), ("video/webm",), "webm",
        video_codecs=("vp9", "vp8", "av1"),
        audio_codecs=("opus", "vorbis"),
    ),
    "flv": VideoContainerSpec(
        "flv", "Flash Video (FLV)", ("flv",), ("video/x-flv",), "flv",
        video_codecs=("h264", "mpeg4"),
        audio_codecs=("aac", "mp3"),
    ),
    "wmv": VideoContainerSpec(
        "wmv", "Windows Media Video (WMV)", ("wmv",), ("video/x-ms-wmv",), "asf",
        video_codecs=("wmv2", "mpeg4", "h264"),
        audio_codecs=("wmav2", "aac", "mp3"),
    ),
    "mpeg": VideoContainerSpec(
        "mpeg", "MPEG", ("mpeg",), ("video/mpeg",), "mpeg",
        video_codecs=("mpeg2video", "mpeg1video"),
        audio_codecs=("mp2", "mp3"),
    ),
    "mpg": VideoContainerSpec(
        "mpg", "MPG", ("mpg",), ("video/mpeg",), "mpeg",
        video_codecs=("mpeg2video", "mpeg1video"),
        audio_codecs=("mp2", "mp3"),
    ),
    "mpegts": VideoContainerSpec(
        "mpegts", "MPEG-TS", ("ts", "m2ts"), ("video/mp2t",), "mpegts",
        video_codecs=("h264", "h265", "mpeg2video"),
        audio_codecs=("aac", "mp2", "ac3"),
    ),
    "3gp": VideoContainerSpec(
        "3gp", "3GP", ("3gp",), ("video/3gpp",), "3gp",
        video_codecs=("h264", "mpeg4"),
        audio_codecs=("aac",),
    ),
    "ogv": VideoContainerSpec(
        "ogv", "OGV (Ogg Video)", ("ogv",), ("video/ogg",), "ogg",
        video_codecs=("theora", "vp8", "vp9"),
        audio_codecs=("vorbis", "opus", "flac"),
    ),
}

EXTENSION_TO_CONTAINER: dict[str, str] = {
    ext: spec.key for spec in VIDEO_CONTAINERS.values() for ext in spec.extensions
}

# Best-effort mapping from an ffprobe container `format_name` token to a
# canonical container key. Some tokens are ambiguous (ffprobe reports the
# whole MOV/MP4/3GP family jointly) -- callers should prefer the filename
# extension first and fall back to this only when that's unavailable.
CONTAINER_NAME_HINTS: dict[str, str] = {
    "matroska,webm": "mkv",
    "matroska": "mkv",
    "webm": "webm",
    "avi": "avi",
    "mov,mp4,m4a,3gp,3g2,mj2": "mp4",
    "mp4": "mp4",
    "mov": "mov",
    "3gp": "3gp",
    "flv": "flv",
    "asf": "wmv",
    "mpeg": "mpeg",
    "mpegts": "mpegts",
    "ogg": "ogv",
}


def get_container(key: str) -> VideoContainerSpec | None:
    return VIDEO_CONTAINERS.get((key or "").strip().lower())


def get_video_codec(key: str) -> VideoCodecSpec | None:
    return VIDEO_CODECS.get((key or "").strip().lower())


def get_audio_codec(key: str) -> VideoCodecSpec | None:
    return AUDIO_IN_VIDEO_CODECS.get((key or "").strip().lower())


def container_for_extension(filename: str) -> str | None:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return EXTENSION_TO_CONTAINER.get(ext)


def container_for_probe(format_name: str, extension_hint: str | None = None) -> str | None:
    """Best-effort container key from an ffprobe `format_name`, preferring the
    caller's filename extension for ambiguous container families."""
    if extension_hint:
        hinted = EXTENSION_TO_CONTAINER.get(extension_hint.lower())
        if hinted:
            return hinted

    name = (format_name or "").lower()
    if name in CONTAINER_NAME_HINTS:
        return CONTAINER_NAME_HINTS[name]
    for token, key in CONTAINER_NAME_HINTS.items():
        if token in name:
            return key
    return None


# --- Quality preset -> codec-appropriate encoder settings -------------------

CRF_QUALITY_MAP: dict[str, dict[str, int]] = {
    "h264": {"fast": 28, "balanced": 23, "high": 20, "maximum": 17},
    "h265": {"fast": 30, "balanced": 26, "high": 22, "maximum": 18},
    "vp8": {"fast": 40, "balanced": 32, "high": 24, "maximum": 16},
    "vp9": {"fast": 40, "balanced": 32, "high": 24, "maximum": 16},
    "av1": {"fast": 45, "balanced": 35, "high": 28, "maximum": 20},
    "theora": {"fast": 8, "balanced": 6, "high": 4, "maximum": 2},
}

PRESET_QUALITY_MAP: dict[str, dict[str, str]] = {
    "h264": {"fast": "veryfast", "balanced": "medium", "high": "slow", "maximum": "veryslow"},
    "h265": {"fast": "veryfast", "balanced": "medium", "high": "slow", "maximum": "veryslow"},
    "av1": {"fast": "10", "balanced": "7", "high": "4", "maximum": "1"},
}

# Codecs that don't support CRF (constant-bitrate-only) fall back to a
# quality-appropriate target bitrate instead.
BITRATE_QUALITY_MAP: dict[str, dict[str, str]] = {
    "mpeg2video": {"fast": "1500k", "balanced": "3000k", "high": "5000k", "maximum": "8000k"},
    "mpeg1video": {"fast": "1200k", "balanced": "2000k", "high": "3500k", "maximum": "5000k"},
    "mpeg4": {"fast": "1000k", "balanced": "2000k", "high": "4000k", "maximum": "6000k"},
    "wmv2": {"fast": "1000k", "balanced": "2000k", "high": "4000k", "maximum": "6000k"},
}


def resolve_quality(codec: VideoCodecSpec, quality: str) -> dict:
    """Map a quality preset onto codec-appropriate ffmpeg parameters.

    Returns a dict with any of: crf (int), preset (str), bitrate (str) --
    never the same knobs blindly applied to every codec (spec requirement).
    """
    out: dict = {}
    if codec.supports_crf and codec.key in CRF_QUALITY_MAP:
        out["crf"] = CRF_QUALITY_MAP[codec.key][quality]
    if codec.supports_preset and codec.key in PRESET_QUALITY_MAP:
        out["preset"] = PRESET_QUALITY_MAP[codec.key][quality]
    if not codec.supports_crf and codec.key in BITRATE_QUALITY_MAP:
        out["bitrate"] = BITRATE_QUALITY_MAP[codec.key][quality]
    return out


# --- Dynamic FFmpeg capability detection ------------------------------------

_ENCODER_LINE_RE = re.compile(r"^\s*[VAS][F.][S.][X.][B.][D.]\s+(\S+)\s+")
# FFmpeg's `-muxers` output has varied across versions between a 1-char flag
# column (muxer-only listings just show "E") and a 2-char "DE"/".E" column
# (combined demux+mux capability) -- match either width generically.
_MUXER_LINE_RE = re.compile(r"^\s*\S{1,2}\s+(\S+)\s+")


@dataclass(frozen=True)
class FFmpegCapabilities:
    encoders: frozenset
    muxers: frozenset
    available: bool
    error: str | None = None


def _parse_names(ffmpeg_path: str, flag: str, pattern: re.Pattern) -> frozenset:
    try:
        result = subprocess.run(
            [ffmpeg_path, "-hide_banner", flag],
            capture_output=True, text=True, timeout=10, check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return frozenset()

    names = set()
    for line in (result.stdout or "").splitlines():
        match = pattern.match(line)
        if match:
            names.add(match.group(1))
    return frozenset(names)


@lru_cache(maxsize=1)
def probe_ffmpeg_capabilities() -> FFmpegCapabilities:
    from app.utils.ffmpeg import get_ffmpeg_path

    ffmpeg_path = get_ffmpeg_path()
    if not ffmpeg_path:
        return FFmpegCapabilities(frozenset(), frozenset(), available=False, error="FFmpeg was not found.")

    encoders = _parse_names(ffmpeg_path, "-encoders", _ENCODER_LINE_RE)
    muxers = _parse_names(ffmpeg_path, "-muxers", _MUXER_LINE_RE)
    return FFmpegCapabilities(encoders, muxers, available=True)


def clear_capabilities_cache() -> None:
    probe_ffmpeg_capabilities.cache_clear()


def resolve_available_encoder(codec: VideoCodecSpec) -> str | None:
    """The first of `codec`'s primary/fallback encoder names this FFmpeg build
    actually has, or None if none of them are available."""
    caps = probe_ffmpeg_capabilities()
    for candidate in (codec.encoder, *codec.fallback_encoders):
        if candidate in caps.encoders:
            return candidate
    return None


def is_muxer_available(muxer: str) -> bool:
    return muxer in probe_ffmpeg_capabilities().muxers


def list_available_containers() -> list[str]:
    caps = probe_ffmpeg_capabilities()
    if not caps.available:
        return []
    return sorted(k for k, c in VIDEO_CONTAINERS.items() if c.output_supported and c.muxer in caps.muxers)


def list_available_video_codecs(container_key: str) -> list[str]:
    container = get_container(container_key)
    if not container:
        return []
    return [c for c in container.video_codecs if (spec := VIDEO_CODECS.get(c)) and resolve_available_encoder(spec)]


def list_available_audio_codecs(container_key: str) -> list[str]:
    container = get_container(container_key)
    if not container:
        return []
    return [
        c for c in container.audio_codecs
        if (spec := AUDIO_IN_VIDEO_CODECS.get(c)) and resolve_available_encoder(spec)
    ]


def list_available_extraction_audio_formats() -> list[str]:
    """Standalone audio output formats (from core/formats.py) that this
    FFmpeg build can actually encode, used by /api/video/extract-audio."""
    from app.core.formats import SUPPORTED_AUDIO_FORMATS

    caps = probe_ffmpeg_capabilities()
    if not caps.available:
        return []
    return sorted(
        key for key, spec in SUPPORTED_AUDIO_FORMATS.items()
        if spec.output_supported and spec.encoder in caps.encoders
    )
