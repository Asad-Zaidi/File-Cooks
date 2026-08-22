"""Job status/cancellation and file-download routes for background video jobs.

Thin HTTP layer only -- all job lifecycle logic lives in
app/services/job_manager.py; this file just parses the request and shapes
the response.
"""

import re
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.exceptions import ResourceNotFoundError
from app.core.formats import get_format
from app.core.video_formats import get_container
from app.dto.video import JobStatusResponse
from app.services import job_manager
from app.utils.files import safe_path

router = APIRouter(tags=["Jobs"])

_JOB_ID_RE = re.compile(r"^[0-9a-f]{32}$")


def _to_status_response(record: dict) -> JobStatusResponse:
    download_url = f"/api/files/{record['job_id']}/download" if record["status"] == "completed" else None
    return JobStatusResponse(
        job_id=record["job_id"],
        batch_id=record.get("batch_id"),
        status=record["status"],
        operation=record["operation"],
        progress=record.get("progress", 0),
        original_filename=record["original_filename"],
        input_format=record["input_format"],
        output_format=record["output_format"],
        input_size=record["input_size"],
        output_size=record.get("output_size"),
        processing_time=record.get("processing_time"),
        error=record.get("error"),
        download_url=download_url,
    )


@router.get("/api/jobs/{job_id}", response_model=JobStatusResponse, summary="Get a job's status/progress")
async def get_job_status(job_id: str):
    if not _JOB_ID_RE.match(job_id):
        raise ResourceNotFoundError("Job not found.")
    record = await job_manager.get_job(job_id)
    if record is None:
        raise ResourceNotFoundError("Job not found.")
    return _to_status_response(record)


@router.post("/api/jobs/{job_id}/cancel", response_model=JobStatusResponse, summary="Cancel a running/queued job")
async def cancel_job(job_id: str):
    if not _JOB_ID_RE.match(job_id):
        raise ResourceNotFoundError("Job not found.")
    record = await job_manager.cancel_job(job_id)
    return _to_status_response(record)


@router.get("/api/files/{job_id}/download", summary="Download a completed job's output file")
async def download_output(job_id: str):
    if not _JOB_ID_RE.match(job_id):
        raise ResourceNotFoundError("File not found.")

    record = await job_manager.get_job(job_id)
    if not record or record.get("status") != "completed" or not record.get("output_filename"):
        raise ResourceNotFoundError("Job not found or not yet completed.")

    output_path = safe_path(settings.converted_path, record["output_filename"])
    if not output_path.exists():
        raise ResourceNotFoundError("The converted file is no longer available.")

    output_format = record["output_format"]
    container = get_container(output_format)
    audio_spec = get_format(output_format) if container is None else None

    if container is not None:
        extension, media_type = container.primary_extension, container.mime_type
    elif audio_spec is not None:
        extension, media_type = audio_spec.primary_extension, audio_spec.mime_type
    else:
        extension, media_type = output_path.suffix.lstrip("."), "application/octet-stream"

    original_stem = Path(record["original_filename"]).stem or "download"
    download_name = f"{original_stem}.{extension}"

    return FileResponse(path=output_path, media_type=media_type, filename=download_name)
