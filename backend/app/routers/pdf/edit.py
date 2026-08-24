"""PDF editing routes: drawings/markup annotations, redaction, removal.

Thin HTTP layer only -- PyMuPDF work lives in app/services/pdf/edit_service.py.
All annotation ops in one request are applied in a single pass (see
edit_service.py's module docstring) rather than one round-trip per shape.
"""

import json
from functools import partial

from fastapi import APIRouter, File, Form, UploadFile
from pydantic import TypeAdapter, ValidationError

from app.core.exceptions import PDFValidationError
from app.db.models import PDFOperation
from app.dto.pdf import AnnotationOp, PDFAnnotationsResponse, PDFOperationResponse
from app.routers.pdf._shared import receive_pdf, to_operation_response
from app.services.pdf.document import run_with_timeout
from app.services.pdf.edit_service import pdf_edit_service
from app.services.pdf.operations import run_pdf_operation
from app.utils.files import delete_file

router = APIRouter(prefix="/api/pdf", tags=["PDF Editing"])

_AnnotationList = TypeAdapter(list[AnnotationOp])


def _parse_annotations(raw: str) -> list[AnnotationOp]:
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise PDFValidationError(f"`annotations` is not valid JSON: {exc}") from None
    try:
        return _AnnotationList.validate_python(parsed)
    except ValidationError as exc:
        raise PDFValidationError(f"Invalid annotation operation(s): {exc}") from None


@router.post("/annotate", response_model=PDFOperationResponse, summary="Apply one or more annotations/drawings in a single pass")
async def annotate_pdf(
    file: UploadFile = File(..., description="The PDF to annotate"),
    annotations: str = Form(..., description="JSON array of annotation operations -- see AnnotationOp"),
    apply_redactions: bool = Form(False, description="Burn in any 'redaction' ops immediately"),
):
    ops = _parse_annotations(annotations)
    path, original_filename = await receive_pdf(file)
    input_size = path.stat().st_size

    try:
        record = await run_pdf_operation(
            PDFOperation.ANNOTATE, original_filename, input_size,
            partial(pdf_edit_service.annotate, path, ops, apply_redactions),
        )
    finally:
        delete_file(path)

    return to_operation_response(record)


@router.post("/remove-annotations", response_model=PDFOperationResponse, summary="Remove annotations from a PDF")
async def remove_annotations(
    file: UploadFile = File(..., description="The source PDF"),
    pages: str | None = Form(None, description="Page selection to clear; omit to clear every page"),
):
    path, original_filename = await receive_pdf(file)
    input_size = path.stat().st_size

    try:
        record = await run_pdf_operation(
            PDFOperation.REMOVE_ANNOTATIONS, original_filename, input_size,
            partial(pdf_edit_service.remove_annotations, path, pages),
        )
    finally:
        delete_file(path)

    return to_operation_response(record)


@router.post("/extract-annotations", response_model=PDFAnnotationsResponse, summary="List every annotation in a PDF")
async def extract_annotations(file: UploadFile = File(..., description="The PDF to inspect")):
    path, _original_filename = await receive_pdf(file)
    try:
        annotations = await run_with_timeout(pdf_edit_service.extract_annotations, path)
    finally:
        delete_file(path)

    return PDFAnnotationsResponse(annotations=annotations)
