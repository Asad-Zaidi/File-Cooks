"""PDF info / metadata / validation routes.

Thin HTTP layer only -- validation, pikepdf access and response shaping
logic live in app/services/pdf/info_service.py. These are pure read-only
inspections: nothing is generated, so there's no download URL and no Mongo
record, just like audio's `POST /api/audio/metadata`.
"""

from fastapi import APIRouter, File, Form, UploadFile

from app.dto.pdf import PDFInfoResponse, PDFMetadataResponse, PDFValidationResponse
from app.routers.pdf._shared import receive_pdf, save_and_read_head
from app.services.pdf.document import run_with_timeout
from app.services.pdf.info_service import pdf_info_service
from app.utils.files import delete_file
from app.utils.mime import sniff_pdf

router = APIRouter(prefix="/api/pdf", tags=["PDF Info"])


@router.post("/info", response_model=PDFInfoResponse, summary="Get structured PDF information")
async def get_pdf_info(
    file: UploadFile = File(..., description="The PDF file to inspect"),
    password: str | None = Form(None, description="Password, if the PDF is encrypted"),
):
    path, _original_filename = await receive_pdf(file)
    try:
        data = await run_with_timeout(pdf_info_service.inspect, path, password)
    finally:
        delete_file(path)
    return PDFInfoResponse(**data)


@router.post("/validate", response_model=PDFValidationResponse, summary="Validate that a file is a usable PDF")
async def validate_pdf(
    file: UploadFile = File(..., description="The file to validate"),
    password: str | None = Form(None, description="Password, if the PDF is encrypted"),
):
    path, _original_filename, head = await save_and_read_head(file)
    try:
        if not sniff_pdf(head):
            return PDFValidationResponse(
                valid=False, is_pdf=False, encrypted=False, page_count=None,
                malformed_reason="File does not start with the PDF signature ('%PDF-').",
            )
        data = await run_with_timeout(pdf_info_service.validate, path, password)
    finally:
        delete_file(path)
    return PDFValidationResponse(**data)


@router.post("/metadata", response_model=PDFMetadataResponse, summary="Get PDF document metadata")
async def get_pdf_metadata(
    file: UploadFile = File(..., description="The PDF file to inspect"),
    password: str | None = Form(None, description="Password, if the PDF is encrypted"),
):
    path, _original_filename = await receive_pdf(file)
    try:
        data = await run_with_timeout(pdf_info_service.metadata, path, password)
    finally:
        delete_file(path)
    return PDFMetadataResponse(**data)
