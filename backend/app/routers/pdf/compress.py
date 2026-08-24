"""PDF compression routes.

Thin HTTP layer only -- all compression logic lives in
app/services/pdf/compress_service.py.
"""

from functools import partial

from fastapi import APIRouter, File, Form, UploadFile

from app.db.models import PDFOperation
from app.dto.pdf import PDFOperationResponse
from app.routers.pdf._shared import receive_pdf, to_operation_response
from app.services.pdf.compress_service import pdf_compress_service
from app.services.pdf.operations import run_pdf_operation
from app.utils.files import delete_file

router = APIRouter(prefix="/api/pdf", tags=["PDF Compression"])


@router.post("/compress", response_model=PDFOperationResponse, summary="Compress/optimize a PDF")
async def compress_pdf(
    file: UploadFile = File(..., description="The PDF to compress"),
    mode: str = Form("balanced", description="low | balanced | high | custom"),
    quality: int | None = Form(None, description="JPEG quality 1-95 (mode=custom only)"),
    max_dimension: int | None = Form(None, description="Max image dimension in px (mode=custom only)"),
):
    path, original_filename = await receive_pdf(file)
    input_size = path.stat().st_size

    try:
        record = await run_pdf_operation(
            PDFOperation.COMPRESS, original_filename, input_size,
            partial(pdf_compress_service.compress, path, mode, quality, max_dimension),
        )
    finally:
        delete_file(path)

    return to_operation_response(record)
