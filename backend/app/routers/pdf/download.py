"""Download route for completed PDF operations.

Thin HTTP layer only -- mirrors app/routers/audio.py's `/download/{id}` and
app/routers/jobs.py's `/api/files/{job_id}/download`.
"""

import re
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.exceptions import ResourceNotFoundError
from app.db.session import get_pdf_operation
from app.utils.files import safe_path

router = APIRouter(prefix="/api/pdf", tags=["PDF"])

_OPERATION_ID_RE = re.compile(r"^[0-9a-f]{32}$")

_MEDIA_TYPES = {"pdf": "application/pdf", "zip": "application/zip"}


@router.get("/download/{operation_id}", summary="Download a completed PDF operation's output file")
async def download(operation_id: str):
    if not _OPERATION_ID_RE.match(operation_id):
        raise ResourceNotFoundError("Operation not found.")

    record = await get_pdf_operation(operation_id)
    if not record or record.get("status") != "completed" or not record.get("output_filename"):
        raise ResourceNotFoundError("Operation not found or not yet completed.")

    output_path = safe_path(settings.converted_path, record["output_filename"])
    if not output_path.exists():
        raise ResourceNotFoundError("The output file is no longer available.")

    output_format = record.get("output_format", "pdf")
    media_type = _MEDIA_TYPES.get(output_format, "application/octet-stream")
    extension = output_path.suffix.lstrip(".") or output_format

    original_stem = Path(record["original_filename"]).stem or "download"
    suffix = "" if output_format == "pdf" else f"-{record['operation']}"
    download_name = f"{original_stem}{suffix}.{extension}"

    return FileResponse(path=output_path, media_type=media_type, filename=download_name)
