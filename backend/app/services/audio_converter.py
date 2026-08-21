"""Audio conversion service.

    Router -> AudioConverterService -> PyAV (bundled FFmpeg) -> Output file

Owns the full conversion lifecycle: validating the request, detecting the
real input format, calling PyAV to transcode, tracking timing, persisting a
MongoDB record, and cleaning up temporary files. Routers must not talk to
PyAV/PyDub or the filesystem directly — they call this service.
"""

import asyncio
import time
import uuid
from pathlib import Path

import av
from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import (
    ConversionFailedError,
    ConversionTimeoutError,
    InvalidFileError,
    InvalidOutputFormatError,
    InvalidParameterError,
)
from app.core.formats import (
    COMMON_SAMPLE_RATES,
    QUALITY_PRESETS,
    AudioFormatSpec,
    bitrate_for_quality,
    format_for_extension,
    get_format,
    parse_bitrate_to_bps,
)
from app.core.logging import get_logger, log_conversion_completed, log_conversion_failed, log_conversion_started
from app.db.models import ConversionOperation, ConversionRecord, ConversionStatus
from app.db.session import save_conversion_record, update_conversion_record
from app.services.audio_metadata import audio_metadata_service
from app.utils.files import delete_file, generate_internal_filename, safe_path, sanitize_filename, save_upload_file

logger = get_logger("audio_converter")


class ConversionOptions:
    """Parsed/raw options coming from the request; validated inside the service."""

    __slots__ = ("output_format", "quality", "bitrate", "sample_rate", "channels")

    def __init__(
        self,
        output_format: str,
        quality: str | None = None,
        bitrate: str | None = None,
        sample_rate: int | None = None,
        channels: int | None = None,
    ):
        self.output_format = output_format
        self.quality = quality
        self.bitrate = bitrate
        self.sample_rate = sample_rate
        self.channels = channels


class AudioConverterService:
    async def convert(self, upload_file: UploadFile, options: ConversionOptions) -> ConversionRecord:
        output_spec = self._validate_output_format(options.output_format)

        conversion_id = uuid.uuid4().hex
        original_filename = sanitize_filename(upload_file.filename or "upload")
        upload_ext = original_filename.rsplit(".", 1)[-1] if "." in original_filename else "bin"
        input_path, input_size = await save_upload_file(upload_file, settings.upload_path, upload_ext)

        start_time = time.monotonic()
        record = ConversionRecord(
            conversion_id=conversion_id,
            operation=ConversionOperation.CONVERT,
            original_filename=original_filename,
            input_format="unknown",
            output_format=output_spec.key,
            input_size=input_size,
            status=ConversionStatus.PROCESSING,
        )

        try:
            metadata = audio_metadata_service.probe(input_path)
            input_format = metadata["format"] or format_for_extension(original_filename) or "unknown"
            record.input_format = input_format

            bitrate_bps = self._resolve_bitrate(output_spec, options.quality, options.bitrate)
            sample_rate = self._resolve_sample_rate(output_spec, options.sample_rate)
            channels = self._resolve_channels(output_spec, options.channels)

            output_filename = generate_internal_filename(output_spec.primary_extension)
            output_path = safe_path(settings.converted_path, output_filename)

            log_conversion_started(conversion_id, input_format, output_spec.key, size=input_size)
            await save_conversion_record(record)

            await self._run_with_timeout(
                self._transcode, input_path, output_path, output_spec, bitrate_bps, sample_rate, channels,
            )

            output_size = output_path.stat().st_size
            processing_time = time.monotonic() - start_time
            record.mark_completed(output_filename, output_size, processing_time)
            log_conversion_completed(
                conversion_id, processing_time, output_size,
                input_format=input_format, output_format=output_spec.key,
            )

        except Exception as exc:
            processing_time = time.monotonic() - start_time
            message = getattr(exc, "message", str(exc))
            record.mark_failed(message, processing_time)
            log_conversion_failed(conversion_id, message)
            if "output_path" in locals():
                delete_file(output_path)  # don't leave a partial/corrupt file behind
            raise
        finally:
            delete_file(input_path)
            await update_conversion_record(conversion_id, record.to_mongo())

        return record

    # --- validation helpers (no unsafe/arbitrary values reach FFmpeg) ---

    @staticmethod
    def _validate_output_format(output_format: str) -> AudioFormatSpec:
        spec = get_format(output_format)
        if spec is None or not spec.output_supported:
            raise InvalidOutputFormatError(f"'{output_format}' is not a supported output format.")
        return spec

    @staticmethod
    def _resolve_bitrate(spec: AudioFormatSpec, quality: str | None, bitrate: str | None) -> int | None:
        if not spec.supports_bitrate:
            return None  # ignored safely for lossless/fixed formats (e.g. WAV, FLAC)

        if bitrate:
            normalized = bitrate.strip().lower()
            if spec.allowed_bitrates and normalized not in spec.allowed_bitrates:
                raise InvalidParameterError(
                    f"Invalid bitrate '{bitrate}' for {spec.key}. Allowed: {', '.join(spec.allowed_bitrates)}"
                )
            return parse_bitrate_to_bps(normalized)

        if quality:
            if quality not in QUALITY_PRESETS:
                raise InvalidParameterError(f"Invalid quality '{quality}'. Allowed: {', '.join(QUALITY_PRESETS)}")
            return parse_bitrate_to_bps(bitrate_for_quality(spec, quality))

        return parse_bitrate_to_bps(spec.default_bitrate) if spec.default_bitrate else None

    @staticmethod
    def _resolve_sample_rate(spec: AudioFormatSpec, sample_rate: int | None) -> int | None:
        if spec.fixed_sample_rate:
            return spec.fixed_sample_rate
        if sample_rate is None:
            return None
        if sample_rate not in COMMON_SAMPLE_RATES:
            raise InvalidParameterError(f"Unsupported sample_rate {sample_rate}. Allowed: {sorted(COMMON_SAMPLE_RATES)}")
        return sample_rate

    @staticmethod
    def _resolve_channels(spec: AudioFormatSpec, channels: int | None) -> int | None:
        if spec.fixed_channels:
            return spec.fixed_channels
        if channels is None:
            return None
        if channels not in (1, 2):
            raise InvalidParameterError("channels must be 1 (mono) or 2 (stereo).")
        return channels

    @staticmethod
    async def _run_with_timeout(func, *args) -> None:
        try:
            await asyncio.wait_for(asyncio.to_thread(func, *args), timeout=settings.MAX_CONVERSION_TIME_SECONDS)
        except asyncio.TimeoutError:
            raise ConversionTimeoutError() from None

    # --- the actual transcode, via PyAV ---

    @staticmethod
    def _transcode(
        input_path: Path,
        output_path: Path,
        spec: AudioFormatSpec,
        bitrate_bps: int | None,
        sample_rate: int | None,
        channels: int | None,
    ) -> None:
        input_container = None
        output_container = None
        try:
            input_container = av.open(str(input_path))
            audio_streams = [s for s in input_container.streams if s.type == "audio"]
            if not audio_streams:
                raise InvalidFileError("The input file does not contain an audio stream.")
            in_stream = audio_streams[0]

            output_container = av.open(str(output_path), mode="w", format=spec.muxer)
            target_rate = sample_rate or in_stream.codec_context.sample_rate or 44100
            out_stream = output_container.add_stream(spec.encoder, rate=target_rate)

            if spec.codec_options:
                out_stream.codec_context.options = dict(spec.codec_options)
            if channels == 1:
                out_stream.codec_context.layout = "mono"
            elif channels == 2:
                out_stream.codec_context.layout = "stereo"
            if bitrate_bps:
                out_stream.codec_context.bit_rate = bitrate_bps

            resampler = av.AudioResampler(
                format=out_stream.codec_context.format,
                layout=out_stream.codec_context.layout,
                rate=out_stream.codec_context.rate,
            )

            for frame in input_container.decode(in_stream):
                frame.pts = None
                for resampled_frame in resampler.resample(frame):
                    for packet in out_stream.encode(resampled_frame):
                        output_container.mux(packet)

            for packet in out_stream.encode(None):
                output_container.mux(packet)

        except InvalidFileError:
            raise
        except (av.FFmpegError, OSError) as exc:
            logger.warning("Transcode of %s -> %s failed: %s", input_path.name, output_path.name, exc)
            raise ConversionFailedError("Audio conversion failed. The input file may be corrupted or unsupported.") from None
        finally:
            if output_container is not None:
                output_container.close()
            if input_container is not None:
                input_container.close()


audio_converter_service = AudioConverterService()
