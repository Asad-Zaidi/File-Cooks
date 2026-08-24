"""Page rendering / thumbnail routes.

Thin HTTP layer only -- PyMuPDF rasterization lives in
app/services/pdf/render_service.py. Read-only, like /info: nothing is
persisted, thumbnails come back inline as base64 PNG in the JSON response.
"""

from fastapi import APIRouter, File, Form, UploadFile

from app.dto.pdf import PDFThumbnailsResponse
from app.routers.pdf._shared import receive_pdf
from app.services.pdf.document import run_with_timeout
from app.services.pdf.render_service import DEFAULT_THUMBNAIL_WIDTH, pdf_render_service
from app.utils.files import delete_file

router = APIRouter(prefix="/api/pdf", tags=["PDF Rendering"])


@router.post("/thumbnails", response_model=PDFThumbnailsResponse, summary="Render a thumbnail image for every page")
async def get_thumbnails(
    file: UploadFile = File(..., description="The PDF to render"),
    max_width: int = Form(DEFAULT_THUMBNAIL_WIDTH, description="Thumbnail width in pixels (40-800)"),
):
    path, _original_filename = await receive_pdf(file)
    try:
        thumbnails = await run_with_timeout(pdf_render_service.thumbnails, path, max_width)
    finally:
        delete_file(path)

    return PDFThumbnailsResponse(page_count=len(thumbnails), thumbnails=thumbnails)
