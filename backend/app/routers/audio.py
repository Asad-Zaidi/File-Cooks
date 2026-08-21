"""Audio API routes.

Thin HTTP layer only — validation, format detection, encoding and file
handling all live in app/services/*. Routes just parse the request, call the
right service, and shape the response.
"""

import re
from pathlib import Path

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.exceptions import ResourceNotFoundError
from app.core.formats import QUALITY_PRESETS, get_format, list_input_formats, list_output_formats
from app.db.models import ConversionRecord, ConversionStatus
from app.db.session import get_conversion_record
from app.dto.audio import AudioMetadataResponse, ConvertResponse, ProcessResponse, SupportedFormatsResponse
from app.services.audio_converter import ConversionOptions, audio_converter_service
from app.services.audio_metadata import audio_metadata_service
from app.services.audio_processor import audio_processor_service
from app.utils.files import delete_file, safe_path, sanitize_filename, save_upload_file

router = APIRouter(prefix="/api/audio", tags=["Audio"])

_CONVERSION_ID_RE = re.compile(r"^[0-9a-f]{32}$")


def _to_process_response(record: ConversionRecord) -> ProcessResponse:
    return ProcessResponse(
        conversion_id=record.conversion_id,
        status=record.status.value,
        operation=record.operation.value,
        output_format=record.output_format,
        output_size=record.output_size or 0,
        processing_time=record.processing_time or 0.0,
        download_url=f"/api/audio/download/{record.conversion_id}",
    )


@router.get("/formats", response_model=SupportedFormatsResponse, summary="List supported audio formats")
async def get_supported_formats():
    return SupportedFormatsResponse(
        input_formats=list_input_formats(),
        output_formats=list_output_formats(),
        quality_presets=list(QUALITY_PRESETS),
    )


@router.post("/convert", response_model=ConvertResponse, summary="Convert an audio file to another format")
async def convert_audio(
    file: UploadFile = File(..., description="The audio file to convert"),
    output_format: str = Form(..., description="Target format, e.g. mp3, wav, flac, m4a"),
    quality: str | None = Form(None, description="One of: low, medium, high, best"),
    bitrate: str | None = Form(None, description="Explicit bitrate, e.g. 192k (overrides quality)"),
    sample_rate: int | None = Form(None, description="Target sample rate in Hz, e.g. 44100"),
    channels: int | None = Form(None, description="1 = mono, 2 = stereo"),
):
    options = ConversionOptions(
        output_format=output_format, quality=quality, bitrate=bitrate,
        sample_rate=sample_rate, channels=channels,
    )
    record = await audio_converter_service.convert(file, options)
    return ConvertResponse(
        conversion_id=record.conversion_id,
        status=record.status.value,
        original_filename=record.original_filename,
        input_format=record.input_format,
        output_format=record.output_format,
        input_size=record.input_size,
        output_size=record.output_size or 0,
        processing_time=record.processing_time or 0.0,
        download_url=f"/api/audio/download/{record.conversion_id}",
    )


@router.post("/metadata", response_model=AudioMetadataResponse, summary="Extract audio metadata")
async def extract_metadata(file: UploadFile = File(..., description="The audio file to inspect")):
    original_filename = sanitize_filename(file.filename or "upload")
    ext = original_filename.rsplit(".", 1)[-1] if "." in original_filename else "bin"
    path, size = await save_upload_file(file, settings.temp_path, ext)
    try:
        data = audio_metadata_service.probe(path)
    finally:
        delete_file(path)

    return AudioMetadataResponse(
        filename=original_filename,
        format=data["format"] or "unknown",
        duration=data["duration"],
        codec=data["codec"],
        sample_rate=data["sample_rate"],
        channels=data["channels"],
        bitrate=data["bitrate"],
        size=size,
        container=data["container"],
        tags=data["tags"],
    )


@router.post("/trim", response_model=ProcessResponse, summary="Trim an audio file to a time range")
async def trim_audio(
    file: UploadFile = File(..., description="The audio file to trim"),
    start_time: float = Form(..., description="Trim start, in seconds"),
    end_time: float | None = Form(None, description="Trim end, in seconds (defaults to end of file)"),
    output_format: str | None = Form(None, description="Defaults to the input file's format"),
):
    record = await audio_processor_service.trim(file, start_time, end_time, output_format)
    return _to_process_response(record)


@router.post("/merge", response_model=ProcessResponse, summary="Merge two or more audio files")
async def merge_audio(
    files: list[UploadFile] = File(..., description="Two or more audio files to concatenate, in order"),
    output_format: str = Form(..., description="Target format for the merged output"),
):
    record = await audio_processor_service.merge(files, output_format)
    return _to_process_response(record)


@router.post("/volume", response_model=ProcessResponse, summary="Adjust an audio file's volume")
async def adjust_volume(
    file: UploadFile = File(..., description="The audio file to adjust"),
    volume_db: float = Form(..., description="Gain to apply in dB, e.g. 6 (louder) or -6 (quieter)"),
    output_format: str | None = Form(None, description="Defaults to the input file's format"),
):
    record = await audio_processor_service.adjust_volume(file, volume_db, output_format)
    return _to_process_response(record)


@router.get("/download/{conversion_id}", summary="Download a converted/processed audio file")
async def download(conversion_id: str):
    if not _CONVERSION_ID_RE.match(conversion_id):
        raise ResourceNotFoundError("Conversion not found.")

    record = await get_conversion_record(conversion_id)
    if not record or record.get("status") != ConversionStatus.COMPLETED.value or not record.get("output_filename"):
        raise ResourceNotFoundError("Conversion not found or not yet completed.")

    output_path = safe_path(settings.converted_path, record["output_filename"])
    if not output_path.exists():
        raise ResourceNotFoundError("The converted file is no longer available.")

    spec = get_format(record["output_format"])
    extension = spec.primary_extension if spec else output_path.suffix.lstrip(".")
    media_type = spec.mime_type if spec else "application/octet-stream"

    original_stem = Path(record["original_filename"].split(",")[0].strip()).stem or "download"
    download_name = f"{original_stem}.{extension}"

    return FileResponse(path=output_path, media_type=media_type, filename=download_name)
