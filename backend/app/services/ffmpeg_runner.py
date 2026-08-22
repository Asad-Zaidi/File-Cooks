"""Centralized FFmpeg execution service.

Every video/audio FFmpeg subprocess invocation in the video module goes
through this file -- routers and higher-level services never build a raw
command line or call subprocess themselves (see video_converter.py /
video_audio_extractor.py, which resolve *what* to encode, and hand the
result here to actually run it).

Safety: commands are always argument arrays passed to
`asyncio.create_subprocess_exec` (never `shell=True`, never a joined string),
and every argument originates from validated config/enum values -- nothing a
user submits is ever concatenated into the command line as a raw flag.
"""

import asyncio
import re
from pathlib import Path
from typing import Any, Callable

from app.core.config import settings
from app.core.exceptions import ConversionFailedError, ConversionTimeoutError, FFmpegUnavailableError
from app.core.formats import AudioFormatSpec
from app.core.logging import get_logger
from app.core.video_formats import (
    VideoCodecSpec,
    VideoContainerSpec,
    get_audio_codec,
    get_container,
    get_video_codec,
    resolve_available_encoder,
    resolve_quality,
)
from app.utils.ffmpeg import get_ffmpeg_path

logger = get_logger("ffmpeg_runner")

ProgressCallback = Callable[[int], None]
ProcessStartedCallback = Callable[["asyncio.subprocess.Process"], None]

_OUT_TIME_RE = re.compile(rb"out_time=(\d+):(\d+):(\d+\.?\d*)")
_STDERR_TAIL_LIMIT = 8000


# --- resolution / scale filter -----------------------------------------------

def _resolution_filter(
    resolution: str | None, custom_width: int | None, custom_height: int | None,
) -> list[str]:
    from app.core.video_formats import RESOLUTION_PRESETS

    if not resolution or resolution == "original":
        return []
    if resolution == "custom":
        if not custom_width or not custom_height:
            return []
        width, height = custom_width, custom_height
    else:
        preset = RESOLUTION_PRESETS.get(resolution)
        if not preset:
            return []
        width, height = preset

    return ["-vf", f"scale=w={width}:h={height}:force_original_aspect_ratio=decrease:force_divisible_by=2"]


# --- command builders ---------------------------------------------------------

def build_convert_args(
    input_path: Path,
    output_path: Path,
    container: VideoContainerSpec,
    video_codec: VideoCodecSpec | str | None,
    audio_codec: VideoCodecSpec | str | None,
    video_bitrate: str | None,
    audio_bitrate: str | None,
    resolution: str | None,
    custom_width: int | None,
    custom_height: int | None,
    fps: int | None,
    quality: str | None,
) -> list[str]:
    args: list[str] = ["-i", str(input_path)]

    if video_codec is None:
        args += ["-vn"]
    elif video_codec == "copy":
        args += ["-c:v", "copy"]
    else:
        encoder = resolve_available_encoder(video_codec) or video_codec.encoder
        args += ["-c:v", encoder]

        quality_params = resolve_quality(video_codec, quality or "balanced")
        if "crf" in quality_params:
            args += ["-crf", str(quality_params["crf"])]
        if "preset" in quality_params:
            args += ["-preset", str(quality_params["preset"])]
        if video_bitrate:
            args += ["-b:v", video_bitrate]
        elif "bitrate" in quality_params:
            args += ["-b:v", quality_params["bitrate"]]

        args += _resolution_filter(resolution, custom_width, custom_height)
        if fps:
            args += ["-r", str(fps)]

    if audio_codec is None:
        args += ["-an"]
    elif audio_codec == "copy":
        args += ["-c:a", "copy"]
    else:
        encoder = resolve_available_encoder(audio_codec) or audio_codec.encoder
        args += ["-c:a", encoder]
        if audio_bitrate and audio_codec.supports_bitrate:
            args += ["-b:a", audio_bitrate]

    args += ["-movflags", "+faststart"] if container.key == "mp4" else []
    args += ["-f", container.muxer, str(output_path)]
    return args


def build_extract_audio_args(
    input_path: Path,
    output_path: Path,
    spec: AudioFormatSpec,
    stream_copy: bool,
    bitrate_bps: int | None,
    sample_rate: int | None,
    channels: int | None,
) -> list[str]:
    # -vn: never decode/process the video stream. "0:a:0?" selects only the
    # first audio stream (the "?" keeps ffmpeg from hard-erroring on the map
    # -- absence of an audio stream is already validated before this runs).
    args: list[str] = ["-i", str(input_path), "-vn", "-map", "0:a:0?"]

    if stream_copy:
        args += ["-c:a", "copy"]
    else:
        args += ["-c:a", spec.encoder]
        for flag, value in (spec.codec_options or {}).items():
            args += [f"-{flag}", str(value)]
        if bitrate_bps and spec.supports_bitrate:
            args += ["-b:a", f"{bitrate_bps // 1000}k"]
        if sample_rate:
            args += ["-ar", str(sample_rate)]
        if channels:
            args += ["-ac", str(channels)]

    args += ["-f", spec.muxer, str(output_path)]
    return args


import inspect
import subprocess
import threading


# --- the actual subprocess run -----------------------------------------------

async def terminate_process(process: Any) -> None:
    if process is None:
        return
    if getattr(process, "returncode", None) is not None:
        return
    try:
        process.terminate()
    except Exception:
        return
    try:
        if hasattr(process, "wait") and inspect.iscoroutinefunction(process.wait):
            await asyncio.wait_for(process.wait(), timeout=5)
        elif hasattr(process, "wait"):
            process.wait(timeout=5)
    except Exception:
        try:
            process.kill()
        except Exception:
            pass


def _run_ffmpeg_sync(
    cmd: list[str],
    duration_seconds: float | None,
    on_progress: ProgressCallback | None,
    on_process_started: ProcessStartedCallback | None,
    timeout_seconds: int,
    loop: asyncio.AbstractEventLoop,
) -> tuple[int, str]:
    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if on_process_started:
        loop.call_soon_threadsafe(on_process_started, proc)

    stderr_tail = bytearray()

    def read_stderr():
        assert proc.stderr is not None
        while True:
            chunk = proc.stderr.read(4096)
            if not chunk:
                break
            stderr_tail.extend(chunk)
            del stderr_tail[:-_STDERR_TAIL_LIMIT]

    stderr_thread = threading.Thread(target=read_stderr, daemon=True)
    stderr_thread.start()

    last_reported = -1
    if proc.stdout:
        for line in iter(proc.stdout.readline, b""):
            if duration_seconds and duration_seconds > 0 and on_progress:
                match = _OUT_TIME_RE.search(line)
                if match:
                    hours, minutes, secs = match.groups()
                    current = int(hours) * 3600 + int(minutes) * 60 + float(secs)
                    pct = max(0, min(99, int((current / duration_seconds) * 100)))
                    if pct != last_reported:
                        last_reported = pct
                        loop.call_soon_threadsafe(on_progress, pct)

    try:
        retcode = proc.wait(timeout=timeout_seconds)
    except subprocess.TimeoutExpired:
        proc.kill()
        raise ConversionTimeoutError() from None

    stderr_thread.join(timeout=2)
    return retcode, bytes(stderr_tail).decode(errors="replace").strip()


async def run_ffmpeg(
    args: list[str],
    duration_seconds: float | None,
    on_progress: ProgressCallback | None,
    on_process_started: ProcessStartedCallback | None,
    timeout_seconds: int,
) -> None:
    ffmpeg_path = get_ffmpeg_path()
    if not ffmpeg_path:
        raise FFmpegUnavailableError()

    cmd = [ffmpeg_path, "-y", "-hide_banner", "-loglevel", "error", "-progress", "pipe:1", "-nostats", *args]

    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
    except NotImplementedError:
        # Fallback when current event loop doesn't implement subprocesses (e.g. Windows SelectorEventLoop)
        loop = asyncio.get_running_loop()
        retcode, message = await asyncio.to_thread(
            _run_ffmpeg_sync, cmd, duration_seconds, on_progress, on_process_started, timeout_seconds, loop,
        )
        if retcode != 0:
            logger.warning("ffmpeg exited with code %s: %s", retcode, message[-1500:])
            raise ConversionFailedError(
                "The video conversion failed. The input file may be corrupted or use an unsupported codec."
            )
        return

    if on_process_started:
        on_process_started(process)

    stderr_tail = bytearray()
    last_reported = -1

    async def read_stderr() -> None:
        assert process.stderr is not None
        while True:
            chunk = await process.stderr.read(4096)
            if not chunk:
                break
            stderr_tail.extend(chunk)
            del stderr_tail[:-_STDERR_TAIL_LIMIT]

    async def read_progress() -> None:
        nonlocal last_reported
        assert process.stdout is not None
        while True:
            line = await process.stdout.readline()
            if not line:
                break
            if duration_seconds and duration_seconds > 0 and on_progress:
                match = _OUT_TIME_RE.search(line)
                if match:
                    hours, minutes, secs = match.groups()
                    current = int(hours) * 3600 + int(minutes) * 60 + float(secs)
                    pct = max(0, min(99, int((current / duration_seconds) * 100)))
                    if pct != last_reported:
                        last_reported = pct
                        on_progress(pct)

    try:
        await asyncio.wait_for(
            asyncio.gather(read_progress(), read_stderr(), process.wait()),
            timeout=timeout_seconds,
        )
    except asyncio.TimeoutError:
        await terminate_process(process)
        raise ConversionTimeoutError() from None

    if process.returncode != 0:
        message = bytes(stderr_tail).decode(errors="replace").strip()
        logger.warning("ffmpeg exited with code %s: %s", process.returncode, message[-1500:])
        raise ConversionFailedError(
            "The video conversion failed. The input file may be corrupted or use an unsupported codec."
        )


# --- public entry points (match the spec's requested signatures) ------------

async def convert_video(
    input_path: Path,
    output_path: Path,
    output_format: str,
    video_codec: str | None = None,
    audio_codec: str | None = None,
    bitrate: str | None = None,
    audio_bitrate: str | None = None,
    resolution: str | None = None,
    custom_width: int | None = None,
    custom_height: int | None = None,
    fps: int | None = None,
    quality: str | None = "balanced",
    duration_seconds: float | None = None,
    on_progress: ProgressCallback | None = None,
    on_process_started: ProcessStartedCallback | None = None,
    timeout_seconds: int | None = None,
) -> None:
    container = get_container(output_format)
    if container is None:
        raise ConversionFailedError(f"'{output_format}' is not a supported video container.")

    video_spec: VideoCodecSpec | str | None
    if video_codec in (None, "none"):
        video_spec = None if video_codec == "none" else get_video_codec(container.default_video_codec or "")
    elif video_codec == "copy":
        video_spec = "copy"
    else:
        video_spec = get_video_codec(video_codec)

    audio_spec: VideoCodecSpec | str | None
    if audio_codec in (None,):
        audio_spec = get_audio_codec(container.default_audio_codec or "")
    elif audio_codec == "none":
        audio_spec = None
    elif audio_codec == "copy":
        audio_spec = "copy"
    else:
        audio_spec = get_audio_codec(audio_codec)

    args = build_convert_args(
        input_path, output_path, container,
        video_spec, audio_spec, bitrate, audio_bitrate,
        resolution, custom_width, custom_height, fps, quality,
    )
    await run_ffmpeg(
        args, duration_seconds, on_progress, on_process_started,
        timeout_seconds or settings.CONVERSION_TIMEOUT_SECONDS,
    )


async def extract_audio(
    input_path: Path,
    output_path: Path,
    spec: AudioFormatSpec,
    stream_copy: bool = False,
    bitrate_bps: int | None = None,
    sample_rate: int | None = None,
    channels: int | None = None,
    duration_seconds: float | None = None,
    on_progress: ProgressCallback | None = None,
    on_process_started: ProcessStartedCallback | None = None,
    timeout_seconds: int | None = None,
) -> None:
    args = build_extract_audio_args(input_path, output_path, spec, stream_copy, bitrate_bps, sample_rate, channels)
    await run_ffmpeg(
        args, duration_seconds, on_progress, on_process_started,
        timeout_seconds or settings.CONVERSION_TIMEOUT_SECONDS,
    )
