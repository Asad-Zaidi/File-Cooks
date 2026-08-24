"""Shared execution/persistence wrapper for every PDF operation that
produces a downloadable output file.

    Router -> run_pdf_operation(operation, ..., func) -> PDFOperationRecord

Generalizes the exact pattern AudioConverterService.convert() uses (generate
an id, persist a PROCESSING record, run the blocking work under a timeout,
mark completed/failed, always persist the final state) so merge/split/
compress/edit/forms don't each re-implement it.
"""

import time
import uuid
from typing import Callable

from app.core.logging import get_logger, log_conversion_completed, log_conversion_failed, log_conversion_started
from app.db.models import PDFOperation, PDFOperationRecord
from app.db.session import save_pdf_operation, update_pdf_operation
from app.services.pdf.document import run_with_timeout
from app.utils.files import delete_file

logger = get_logger("pdf_operations")


async def run_pdf_operation(
    operation: PDFOperation, original_filename: str, input_size: int, func: Callable[[], tuple],
) -> PDFOperationRecord:
    """Run `func()` (a zero-arg closure wrapping the blocking pikepdf/PyMuPDF
    work, already bound to its arguments) in a worker thread, bounded by
    MAX_PDF_PROCESSING_TIME_SECONDS. `func` must return
    (output_path, output_filename, details_dict)."""
    operation_id = uuid.uuid4().hex
    record = PDFOperationRecord(
        operation_id=operation_id, operation=operation,
        original_filename=original_filename, input_size=input_size,
    )
    start = time.monotonic()
    output_path = None

    try:
        log_conversion_started(operation_id, "pdf", operation.value, size=input_size)
        await save_pdf_operation(record)

        output_path, output_filename, details = await run_with_timeout(func)
        if output_filename.endswith(".zip"):
            record.output_format = "zip"

        output_size = output_path.stat().st_size
        processing_time = time.monotonic() - start
        record.mark_completed(output_filename, output_size, processing_time, details)
        log_conversion_completed(operation_id, processing_time, output_size, operation=operation.value)

    except Exception as exc:
        processing_time = time.monotonic() - start
        message = str(getattr(exc, "message", None) or exc or exc.__class__.__name__)
        record.mark_failed(message, processing_time)
        log_conversion_failed(operation_id, message)
        if output_path is not None:
            delete_file(output_path)
        raise
    finally:
        await update_pdf_operation(operation_id, record.to_mongo())

    return record
