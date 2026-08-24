"""Helpers shared by every app/routers/pdf/* submodule.

Not itself a route module -- no `router` here, just the upload/validation/
response-shaping logic every PDF endpoint repeats.
"""

from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings
from app.db.models import PDFOperationRecord
from app.dto.pdf import PDFOperationResponse
from app.services.pdf.document import validate_upload_is_pdf
from app.utils.files import delete_file, sanitize_filename, save_upload_file


async def save_and_read_head(file: UploadFile, *, destination=None) -> tuple[Path, str, bytes]:
    """Stream the upload to storage. Returns (path, original_filename,
    file_head) -- caller is responsible for deleting the path."""
    original_filename = sanitize_filename(file.filename or "upload")
    destination_dir = destination if destination is not None else settings.temp_path
    path, _size = await save_upload_file(
        file, destination_dir, "pdf", max_bytes=settings.max_pdf_size_bytes,
    )
    with open(path, "rb") as f:
        head = f.read(16)
    return path, original_filename, head


async def receive_pdf(file: UploadFile, *, destination=None) -> tuple[Path, str]:
    """`save_and_read_head`, but hard-fails (PDFInvalidError) on a bad
    signature -- for endpoints that need a real PDF to do their job, as
    opposed to `/validate`, which reports invalidity as data instead."""
    path, original_filename, head = await save_and_read_head(file, destination=destination)
    try:
        validate_upload_is_pdf(head)
    except Exception:
        delete_file(path)
        raise
    return path, original_filename


def to_operation_response(record: PDFOperationRecord) -> PDFOperationResponse:
    return PDFOperationResponse(
        operation_id=record.operation_id,
        status=record.status.value,
        operation=record.operation.value,
        output_format=record.output_format,
        output_size=record.output_size or 0,
        processing_time=record.processing_time or 0.0,
        download_url=f"/api/pdf/download/{record.operation_id}",
        details=record.details,
    )
