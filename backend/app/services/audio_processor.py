"""Audio processing service: trim / merge / volume (and room to grow into
fade in/out, normalize, resample, rechannel — see class docstring).

    Router -> AudioProcessorService -> PyDub -> FFmpeg (system) -> Output file

PyDub gives a clean high-level API for these operations but shells out to the
system FFmpeg binary, so (unlike audio_converter.py's PyAV-based transcode)
these operations genuinely require FFmpeg to be installed and on PATH.
"""

import asyncio
import time
import uuid
from pathlib import Path

from fastapi import UploadFile
from pydub import AudioSegment
from pydub.exceptions import CouldntDecodeError
from pydub.utils import which

from app.core.config import settings
from app.core.exceptions import (
    ConversionFailedError,
    ConversionTimeoutError,
    InvalidFileError,
    InvalidOutputFormatError,
    InvalidParameterError,
)
from app.core.formats import AudioFormatSpec, format_for_extension, get_format
from app.core.logging import get_logger, log_conversion_completed, log_conversion_failed, log_conversion_started
from app.db.models import ConversionOperation, ConversionRecord, ConversionStatus
from app.db.session import save_conversion_record, update_conversion_record
from app.utils.files import delete_file, delete_files, generate_internal_filename, safe_path, sanitize_filename, save_upload_file

logger = get_logger("audio_processor")

# Point PyDub at the configured FFmpeg/FFprobe executables (falls back to the
# bare command name, which still works if it's on PATH).
AudioSegment.converter = which(settings.FFMPEG_PATH) or settings.FFMPEG_PATH
AudioSegment.ffprobe = which(settings.FFPROBE_PATH) or settings.FFPROBE_PATH

_MIN_VOLUME_DB = -50.0
_MAX_VOLUME_DB = 50.0


class AudioProcessorService:
    """Supports: trim, merge, volume adjustment.

    Designed to grow into fade in/out, normalize, sample-rate/channel
    changes — each would follow the same `_do_<operation>` + `_export`
    pattern as the methods below.
    """

    # --- public operations, called by the router ---

    async def trim(self, upload_file: UploadFile, start_time: float, end_time: float | None,
                    output_format: str | None) -> ConversionRecord:
        input_path, original_filename, input_size = await self._save(upload_file)
        return await self._run_operation(
            ConversionOperation.TRIM, [input_path], [original_filename], input_size,
            lambda: self._do_trim(input_path, start_time, end_time, output_format),
        )

    async def merge(self, upload_files: list[UploadFile], output_format: str) -> ConversionRecord:
        if len(upload_files) < 2:
            raise InvalidParameterError("At least two files are required to merge.")
        saved = [await self._save(f) for f in upload_files]
        input_paths = [s[0] for s in saved]
        original_filenames = [s[1] for s in saved]
        input_size = sum(s[2] for s in saved)
        return await self._run_operation(
            ConversionOperation.MERGE, input_paths, original_filenames, input_size,
            lambda: self._do_merge(input_paths, output_format),
        )

    async def adjust_volume(self, upload_file: UploadFile, volume_db: float,
                             output_format: str | None) -> ConversionRecord:
        input_path, original_filename, input_size = await self._save(upload_file)
        return await self._run_operation(
            ConversionOperation.VOLUME, [input_path], [original_filename], input_size,
            lambda: self._do_volume(input_path, volume_db, output_format),
        )

    # --- shared orchestration: save -> record -> run (with timeout) -> persist -> cleanup ---

    @staticmethod
    async def _save(upload_file: UploadFile) -> tuple[Path, str, int]:
        original_filename = sanitize_filename(upload_file.filename or "upload")
        ext = original_filename.rsplit(".", 1)[-1] if "." in original_filename else "bin"
        path, size = await save_upload_file(upload_file, settings.upload_path, ext)
        return path, original_filename, size

    async def _run_operation(
        self, operation: ConversionOperation, input_paths: list[Path],
        original_filenames: list[str], input_size: int, work,
    ) -> ConversionRecord:
        conversion_id = uuid.uuid4().hex
        start_time = time.monotonic()
        input_format = format_for_extension(original_filenames[0]) or "unknown"

        record = ConversionRecord(
            conversion_id=conversion_id,
            operation=operation,
            original_filename=", ".join(original_filenames),
            input_format=input_format,
            output_format="",
            input_size=input_size,
            status=ConversionStatus.PROCESSING,
        )

        output_path = None
        try:
            log_conversion_started(conversion_id, input_format, operation.value, size=input_size)
            await save_conversion_record(record)

            try:
                output_path, output_filename, output_format = await asyncio.wait_for(
                    asyncio.to_thread(work), timeout=settings.MAX_CONVERSION_TIME_SECONDS,
                )
            except asyncio.TimeoutError:
                raise ConversionTimeoutError() from None

            record.output_format = output_format
            output_size = output_path.stat().st_size
            processing_time = time.monotonic() - start_time
            record.mark_completed(output_filename, output_size, processing_time)
            log_conversion_completed(conversion_id, processing_time, output_size, operation=operation.value)

        except Exception as exc:
            processing_time = time.monotonic() - start_time
            message = getattr(exc, "message", str(exc))
            record.mark_failed(message, processing_time)
            log_conversion_failed(conversion_id, message)
            delete_file(output_path)
            raise
        finally:
            delete_files(*input_paths)
            await update_conversion_record(conversion_id, record.to_mongo())

        return record

    # --- PyDub operations (sync, run in a worker thread) ---

    @staticmethod
    def _load(path: Path) -> AudioSegment:
        from app.utils.ffmpeg import ensure_ffmpeg_available

        ensure_ffmpeg_available()
        try:
            return AudioSegment.from_file(str(path))
        except CouldntDecodeError as exc:
            logger.warning("Failed to decode %s: %s", path.name, exc)
            raise InvalidFileError("Could not decode the audio file. It may be corrupted or in an unsupported format.") from None

    @staticmethod
    def _export(segment: AudioSegment, output_format: str) -> tuple[Path, str, str]:
        spec: AudioFormatSpec | None = get_format(output_format)
        if spec is None or not spec.output_supported:
            raise InvalidOutputFormatError(f"'{output_format}' is not a supported output format.")

        filename = generate_internal_filename(spec.primary_extension)
        output_path = safe_path(settings.converted_path, filename)

        export_kwargs = {}
        if spec.supports_bitrate and spec.default_bitrate:
            export_kwargs["bitrate"] = spec.default_bitrate

        try:
            segment.export(str(output_path), format=spec.muxer or spec.primary_extension, **export_kwargs)
        except Exception as exc:
            logger.warning("Export to %s failed: %s", output_path.name, exc)
            delete_file(output_path)
            raise ConversionFailedError("Audio export failed.") from None

        return output_path, filename, spec.key

    def _do_trim(self, path: Path, start_time: float, end_time: float | None, output_format: str | None):
        if start_time < 0:
            raise InvalidParameterError("start_time must be >= 0.")
        segment = self._load(path)
        start_ms = int(start_time * 1000)
        end_ms = int(end_time * 1000) if end_time is not None else None
        if end_ms is not None and end_ms <= start_ms:
            raise InvalidParameterError("end_time must be greater than start_time.")
        if start_ms >= len(segment):
            raise InvalidParameterError("start_time is beyond the end of the audio.")
        trimmed = segment[start_ms: end_ms if end_ms is not None else len(segment)]
        return self._export(trimmed, output_format or format_for_extension(path.name) or "mp3")

    def _do_merge(self, paths: list[Path], output_format: str):
        combined = self._load(paths[0])
        for p in paths[1:]:
            combined += self._load(p)
        return self._export(combined, output_format)

    def _do_volume(self, path: Path, volume_db: float, output_format: str | None):
        if not (_MIN_VOLUME_DB <= volume_db <= _MAX_VOLUME_DB):
            raise InvalidParameterError(f"volume_db must be between {_MIN_VOLUME_DB} and {_MAX_VOLUME_DB}.")
        segment = self._load(path)
        adjusted = segment.apply_gain(volume_db)
        return self._export(adjusted, output_format or format_for_extension(path.name) or "mp3")


audio_processor_service = AudioProcessorService()
