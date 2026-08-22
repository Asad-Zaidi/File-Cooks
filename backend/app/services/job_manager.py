"""Background job orchestration for video conversion / audio extraction.

Long-running FFmpeg conversions never run inside the HTTP request that
started them: `create_job()` persists a `queued` job document and launches an
`asyncio.Task` to run it; the caller immediately gets back `{job_id, status}`
and polls `GET /api/jobs/{job_id}` for progress.

Concurrency is bounded by a semaphore (MAX_CONCURRENT_CONVERSIONS) -- extra
jobs simply wait in the `queued` state until a slot frees up. This is
intentionally the simplest thing that could work (plain asyncio, no
Celery/RQ); `_run_job()` is the one seam a real task queue would replace
later without touching any router or service code.

Live progress is tracked only in-memory (`_registry`) to avoid hammering
MongoDB on every FFmpeg progress tick; `get_job()` overlays that live state
on top of the persisted document, which only gets written at state
transitions (queued -> processing -> completed/failed/cancelled).
"""

import asyncio
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Awaitable, Callable

from app.core.config import settings
from app.core.exceptions import JobNotCancellableError, ResourceNotFoundError
from app.core.logging import get_logger, log_conversion_completed, log_conversion_failed, log_conversion_started
from app.db.models import JobOperation, JobStatus, VideoJob
from app.db.session import delete_video_job, find_stale_video_jobs, get_video_job, save_video_job, update_video_job
from app.services.ffmpeg_runner import terminate_process
from app.utils.files import delete_file, generate_internal_filename, safe_path

logger = get_logger("job_manager")

RunConversion = Callable[[Path, Callable[[int], None], Callable], Awaitable[None]]

# Bounds how many FFmpeg processes run at once; extra jobs wait in `queued`.
_semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_CONVERSIONS)

# job_id -> {"status", "progress", "process", "cancel_requested"}
_registry: dict[str, dict] = {}

_ACTIVE_STATUSES = (JobStatus.QUEUED.value, JobStatus.PROCESSING.value)


async def create_job(
    *,
    operation: JobOperation,
    input_path: Path,
    original_filename: str,
    input_format: str,
    output_format: str,
    output_extension: str,
    input_size: int,
    settings_snapshot: dict,
    run_conversion: RunConversion,
    batch_id: str | None = None,
) -> VideoJob:
    job_id = uuid.uuid4().hex
    job = VideoJob(
        job_id=job_id,
        batch_id=batch_id,
        operation=operation,
        original_filename=original_filename,
        input_format=input_format,
        output_format=output_format,
        input_size=input_size,
        settings=settings_snapshot,
        status=JobStatus.QUEUED,
    )
    _registry[job_id] = {"status": JobStatus.QUEUED.value, "progress": 0, "process": None, "cancel_requested": False}
    await save_video_job(job)

    asyncio.create_task(_run_job(job, input_path, output_extension, run_conversion))
    return job


async def _run_job(
    job: VideoJob,
    input_path: Path,
    output_extension: str,
    run_conversion: RunConversion,
) -> None:
    entry = _registry[job.job_id]
    start = time.monotonic()
    output_filename = generate_internal_filename(output_extension)
    output_path = safe_path(settings.converted_path, output_filename)
    part_path = output_path.with_name(output_path.name + ".part")

    try:
        async with _semaphore:
            if entry["cancel_requested"]:
                job.mark_cancelled(time.monotonic() - start)
                entry["status"] = JobStatus.CANCELLED.value
                await update_video_job(job.job_id, job.to_mongo())
                return

            job.mark_processing()
            entry["status"] = JobStatus.PROCESSING.value
            await update_video_job(job.job_id, job.to_mongo())
            log_conversion_started(job.job_id, job.input_format, job.output_format, operation=job.operation.value)

            def on_progress(pct: int) -> None:
                entry["progress"] = pct

            def on_process_started(process) -> None:
                entry["process"] = process
                if entry["cancel_requested"]:
                    asyncio.create_task(terminate_process(process))

            try:
                await run_conversion(part_path, on_progress, on_process_started)

                if entry["cancel_requested"]:
                    raise _Cancelled()

                part_path.replace(output_path)
                output_size = output_path.stat().st_size
                processing_time = time.monotonic() - start
                job.mark_completed(output_filename, output_size, processing_time)
                entry["status"] = JobStatus.COMPLETED.value
                entry["progress"] = 100
                log_conversion_completed(job.job_id, processing_time, output_size, operation=job.operation.value)

            except _Cancelled:
                processing_time = time.monotonic() - start
                job.mark_cancelled(processing_time)
                entry["status"] = JobStatus.CANCELLED.value
                delete_file(part_path)
                delete_file(output_path)

            except Exception as exc:
                processing_time = time.monotonic() - start
                delete_file(part_path)
                delete_file(output_path)
                if entry["cancel_requested"]:
                    job.mark_cancelled(processing_time)
                    entry["status"] = JobStatus.CANCELLED.value
                else:
                    logger.exception("Job %s failed with exception: %s", job.job_id, exc)
                    message = str(getattr(exc, "message", None) or exc or exc.__class__.__name__)
                    job.mark_failed(message, processing_time)
                    entry["status"] = JobStatus.FAILED.value
                    log_conversion_failed(job.job_id, message)
    finally:
        entry["process"] = None
        delete_file(input_path)
        await update_video_job(job.job_id, job.to_mongo())
        _registry.pop(job.job_id, None)


class _Cancelled(Exception):
    """Internal sentinel: the job finished its FFmpeg call but had already
    been marked for cancellation (e.g. cancelled right as it completed)."""


async def get_job(job_id: str) -> dict | None:
    record = await get_video_job(job_id)
    if record is None:
        return None
    entry = _registry.get(job_id)
    if entry is not None:
        record["status"] = entry["status"]
        record["progress"] = entry["progress"]
    return record


async def cancel_job(job_id: str) -> dict:
    entry = _registry.get(job_id)

    if entry is None or entry["status"] not in _ACTIVE_STATUSES:
        record = await get_video_job(job_id)
        if record is None:
            raise ResourceNotFoundError("Job not found.")
        raise JobNotCancellableError()

    entry["cancel_requested"] = True
    process = entry.get("process")
    if process is not None:
        await terminate_process(process)

    # Give the background task a brief window to observe the cancellation
    # and persist it, so an immediate GET after this call already reflects it.
    for _ in range(20):
        current = _registry.get(job_id)
        if current is None or current["status"] != JobStatus.PROCESSING.value:
            break
        await asyncio.sleep(0.1)

    record = await get_job(job_id)
    if record is None:
        raise ResourceNotFoundError("Job not found.")
    return record


async def cleanup_expired_jobs() -> int:
    """Retention sweep for terminal jobs: deletes the output file (if any)
    plus the Mongo record for jobs older than FILE_RETENTION_MINUTES. Called
    periodically from main.py's cleanup loop."""
    cutoff_iso = (datetime.now(timezone.utc) - timedelta(minutes=settings.FILE_RETENTION_MINUTES)).isoformat()
    stale = await find_stale_video_jobs(cutoff_iso)

    removed = 0
    for doc in stale:
        output_filename = doc.get("output_filename")
        if output_filename:
            delete_file(safe_path(settings.converted_path, output_filename))
        await delete_video_job(doc["job_id"])
        removed += 1
    return removed
