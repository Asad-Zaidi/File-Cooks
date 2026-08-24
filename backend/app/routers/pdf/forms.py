"""PDF interactive form (AcroForm) routes.

Thin HTTP layer only -- PyMuPDF widget work lives in
app/services/pdf/forms_service.py.
"""

import json
from functools import partial

from fastapi import APIRouter, File, Form, UploadFile

from app.core.exceptions import PDFFormError
from app.db.models import PDFOperation
from app.dto.pdf import PDFFormExportResponse, PDFFormFieldsResponse, PDFOperationResponse
from app.routers.pdf._shared import receive_pdf, to_operation_response
from app.services.pdf.document import run_with_timeout
from app.services.pdf.forms_service import pdf_forms_service
from app.services.pdf.operations import run_pdf_operation
from app.utils.files import delete_file

router = APIRouter(prefix="/api/pdf/forms", tags=["PDF Forms"])


@router.post("/fields", response_model=PDFFormFieldsResponse, summary="Detect and list every form field")
async def list_form_fields(file: UploadFile = File(..., description="The PDF to inspect")):
    path, _original_filename = await receive_pdf(file)
    try:
        fields = await run_with_timeout(pdf_forms_service.list_fields, path)
    finally:
        delete_file(path)

    return PDFFormFieldsResponse(fields=fields)


@router.post("/export", response_model=PDFFormExportResponse, summary="Export current form field values")
async def export_form_values(file: UploadFile = File(..., description="The PDF to inspect")):
    path, _original_filename = await receive_pdf(file)
    try:
        values = await run_with_timeout(pdf_forms_service.export_values, path)
    finally:
        delete_file(path)

    return PDFFormExportResponse(values=values)


@router.post("/fill", response_model=PDFOperationResponse, summary="Fill form fields (text/checkbox/radio/dropdown)")
async def fill_form(
    file: UploadFile = File(..., description="The PDF to fill"),
    values: str = Form(..., description="JSON object of {field_name: value}"),
    flatten: bool = Form(False, description="Flatten the form after filling (removes interactivity)"),
):
    try:
        parsed_values = json.loads(values)
    except json.JSONDecodeError as exc:
        raise PDFFormError(f"`values` is not valid JSON: {exc}") from None
    if not isinstance(parsed_values, dict):
        raise PDFFormError("`values` must be a JSON object of {field_name: value}.")

    path, original_filename = await receive_pdf(file)
    input_size = path.stat().st_size

    try:
        record = await run_pdf_operation(
            PDFOperation.FORM_FILL, original_filename, input_size,
            partial(pdf_forms_service.fill, path, parsed_values, flatten),
        )
    finally:
        delete_file(path)

    return to_operation_response(record)
