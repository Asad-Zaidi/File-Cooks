"""Merge, split, extract, reorder, delete, rotate, and assemble page routes.

Thin HTTP layer only -- page-selection parsing and all pikepdf work live in
app/services/pdf/merge_split_service.py. Every endpoint here returns a
PDFOperationResponse (operation metadata + download_url); the actual bytes
come from `GET /api/pdf/download/{operation_id}` (see download.py).
"""

import json
from functools import partial

from fastapi import APIRouter, File, Form, UploadFile
from pydantic import TypeAdapter, ValidationError

from app.core.exceptions import PDFValidationError
from app.db.models import PDFOperation
from app.dto.pdf import AssembleLayoutEntry, PDFOperationResponse
from app.routers.pdf._shared import receive_pdf, to_operation_response
from app.services.pdf.merge_split_service import pdf_merge_split_service
from app.services.pdf.operations import run_pdf_operation
from app.utils.files import delete_file

router = APIRouter(prefix="/api/pdf", tags=["PDF Merge & Split"])

_LayoutList = TypeAdapter(list[AssembleLayoutEntry])


@router.post("/merge", response_model=PDFOperationResponse, summary="Merge two or more PDFs into one")
async def merge_pdfs(files: list[UploadFile] = File(..., description="Two or more PDFs, in the order to merge")):
    if len(files) < 2:
        raise PDFValidationError("At least two PDFs are required to merge.")

    received = [await receive_pdf(f) for f in files]
    paths = [p for p, _name in received]
    original_filename = ", ".join(name for _p, name in received)
    input_size = sum(p.stat().st_size for p in paths)

    try:
        record = await run_pdf_operation(
            PDFOperation.MERGE, original_filename, input_size, partial(pdf_merge_split_service.merge, paths),
        )
    finally:
        for p in paths:
            delete_file(p)

    return to_operation_response(record)


@router.post(
    "/assemble", response_model=PDFOperationResponse,
    summary="Assemble a PDF from an exact page layout (the visual page manager's save action)",
)
async def assemble_pdf(
    files: list[UploadFile] = File(..., description="One or more source PDFs, referenced by position in `layout`"),
    layout: str = Form(..., description="JSON array of {file_index, page} -- the exact final page sequence"),
):
    try:
        parsed = json.loads(layout)
    except json.JSONDecodeError as exc:
        raise PDFValidationError(f"`layout` is not valid JSON: {exc}") from None
    try:
        entries = _LayoutList.validate_python(parsed)
    except ValidationError as exc:
        raise PDFValidationError(f"Invalid layout entries: {exc}") from None

    received = [await receive_pdf(f) for f in files]
    paths = [p for p, _name in received]
    original_filename = ", ".join(name for _p, name in received)
    input_size = sum(p.stat().st_size for p in paths)

    try:
        record = await run_pdf_operation(
            PDFOperation.ASSEMBLE, original_filename, input_size,
            partial(pdf_merge_split_service.assemble, paths, [(e.file_index, e.page) for e in entries]),
        )
    finally:
        for p in paths:
            delete_file(p)

    return to_operation_response(record)


@router.post("/split", response_model=PDFOperationResponse, summary="Split a PDF into multiple PDFs (returned as a ZIP)")
async def split_pdf(
    file: UploadFile = File(..., description="The PDF to split"),
    mode: str = Form(..., description="'ranges' or 'every_n'"),
    ranges: str | None = Form(None, description="Semicolon-separated groups, e.g. '1-3;4-6;7-10' (mode=ranges)"),
    every_n: int | None = Form(None, description="Split into consecutive chunks of N pages (mode=every_n)"),
):
    path, original_filename = await receive_pdf(file)
    input_size = path.stat().st_size

    try:
        if mode == "ranges":
            if not ranges:
                raise PDFValidationError("`ranges` is required when mode='ranges'.")
            func = partial(pdf_merge_split_service.split_by_ranges, path, ranges)
        elif mode == "every_n":
            if not every_n:
                raise PDFValidationError("`every_n` is required when mode='every_n'.")
            func = partial(pdf_merge_split_service.split_every_n, path, every_n)
        else:
            raise PDFValidationError("`mode` must be 'ranges' or 'every_n'.")

        record = await run_pdf_operation(PDFOperation.SPLIT, original_filename, input_size, func)
    finally:
        delete_file(path)

    return to_operation_response(record)


@router.post("/extract-pages", response_model=PDFOperationResponse, summary="Extract a subset of pages into a new PDF")
async def extract_pages(
    file: UploadFile = File(..., description="The source PDF"),
    pages: str = Form(..., description="Page selection, e.g. '1-3,5,8-10' or '[3,1,5]'"),
):
    path, original_filename = await receive_pdf(file)
    input_size = path.stat().st_size

    try:
        record = await run_pdf_operation(
            PDFOperation.EXTRACT_PAGES, original_filename, input_size,
            partial(pdf_merge_split_service.extract_pages, path, pages),
        )
    finally:
        delete_file(path)

    return to_operation_response(record)


@router.post("/reorder-pages", response_model=PDFOperationResponse, summary="Reorder every page into a new sequence")
async def reorder_pages(
    file: UploadFile = File(..., description="The source PDF"),
    order: str = Form(..., description="Every page number exactly once, e.g. '3,1,5,2,4' or '[3,1,5,2,4]'"),
):
    path, original_filename = await receive_pdf(file)
    input_size = path.stat().st_size

    try:
        record = await run_pdf_operation(
            PDFOperation.REORDER_PAGES, original_filename, input_size,
            partial(pdf_merge_split_service.reorder_pages, path, order),
        )
    finally:
        delete_file(path)

    return to_operation_response(record)


@router.post("/delete-pages", response_model=PDFOperationResponse, summary="Delete a subset of pages")
async def delete_pages(
    file: UploadFile = File(..., description="The source PDF"),
    pages: str = Form(..., description="Page selection to delete, e.g. '2,4-6'"),
):
    path, original_filename = await receive_pdf(file)
    input_size = path.stat().st_size

    try:
        record = await run_pdf_operation(
            PDFOperation.DELETE_PAGES, original_filename, input_size,
            partial(pdf_merge_split_service.delete_pages, path, pages),
        )
    finally:
        delete_file(path)

    return to_operation_response(record)


@router.post("/rotate-pages", response_model=PDFOperationResponse, summary="Rotate a subset (or all) of a PDF's pages")
async def rotate_pages(
    file: UploadFile = File(..., description="The source PDF"),
    pages: str | None = Form(None, description="Page selection to rotate; omit to rotate every page"),
    angle: int = Form(..., description="Degrees, a multiple of 90 (can be negative)"),
):
    path, original_filename = await receive_pdf(file)
    input_size = path.stat().st_size

    try:
        record = await run_pdf_operation(
            PDFOperation.ROTATE_PAGES, original_filename, input_size,
            partial(pdf_merge_split_service.rotate_pages, path, pages, angle),
        )
    finally:
        delete_file(path)

    return to_operation_response(record)
