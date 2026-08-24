"""Request/response schemas for the /api/pdf/* endpoints.

Upload endpoints take their parameters as multipart form fields (see the
routers under app/routers/pdf/); these models describe the JSON shapes that
come back out. Grows alongside app/routers/pdf/* as later phases add more
operations -- mirrors how app/dto/audio.py holds every audio DTO in one file.
"""

from typing import Any, Literal

from pydantic import BaseModel, Field


class PDFPageInfo(BaseModel):
    width: float
    height: float
    rotation: int


class PDFInfoResponse(BaseModel):
    success: bool = True
    page_count: int | None = None
    pdf_version: str | None = None
    file_size: int

    title: str | None = None
    author: str | None = None
    subject: str | None = None
    keywords: str | None = None
    creator: str | None = None
    producer: str | None = None
    creation_date: str | None = None
    mod_date: str | None = None

    encrypted: bool
    password_protected: bool
    has_forms: bool | None = None
    has_annotations: bool | None = None
    has_signatures: bool | None = None

    pages: list[PDFPageInfo]


class PDFValidationResponse(BaseModel):
    success: bool = True
    valid: bool
    is_pdf: bool
    encrypted: bool
    page_count: int | None = None
    malformed_reason: str | None = None


class PDFMetadataResponse(BaseModel):
    success: bool = True
    title: str | None = None
    author: str | None = None
    subject: str | None = None
    keywords: str | None = None
    creator: str | None = None
    producer: str | None = None
    creation_date: str | None = None
    mod_date: str | None = None
    pdf_version: str | None = None
    encrypted: bool


# --- Generic result envelope, shared by every operation that produces a
# downloadable output file (merge/split/extract/reorder/delete/rotate/
# compress/annotate/remove-annotations/form-fill) -- mirrors audio's
# ProcessResponse, which is shared the same way by trim/merge/volume. ---

class PDFOperationResponse(BaseModel):
    success: bool = True
    operation_id: str
    status: str
    operation: str
    output_format: str
    output_size: int
    processing_time: float
    download_url: str
    details: dict[str, Any] = Field(default_factory=dict)


# --- Merge & Split -----------------------------------------------------------

class SplitPartInfo(BaseModel):
    filename: str
    page_count: int


class AssembleLayoutEntry(BaseModel):
    """One page in the final assembled document: `file_index` is the
    0-based position of the file within the `files` upload list (0 = the
    first file), `page` is the 1-based page number within that file."""

    file_index: int = Field(..., ge=0)
    page: int = Field(..., ge=1)


# --- Page rendering / thumbnails ------------------------------------------------

class PDFThumbnailInfo(BaseModel):
    page: int
    width: int
    height: int
    rotation: int
    image_base64: str


class PDFThumbnailsResponse(BaseModel):
    success: bool = True
    page_count: int
    thumbnails: list[PDFThumbnailInfo]


# --- Editing / Annotations ----------------------------------------------------

AnnotationType = Literal[
    "text", "rectangle", "line", "circle", "highlight", "underline",
    "strikeout", "squiggly", "note", "redaction",
]


class AnnotationOp(BaseModel):
    """One annotation/markup operation, as sent in the `annotations` JSON
    array field of POST /api/pdf/annotate. Field meaning varies by `type`;
    the service validates that the fields a given type actually needs are
    present, rather than every field being required for every type."""

    type: AnnotationType
    page: int = Field(..., ge=1, description="1-based page number")

    # Geometry -- rectangle/highlight/underline/strikeout/squiggly/note/
    # redaction/circle use (x, y, width, height); line uses (x, y) -> (x2, y2).
    x: float | None = None
    y: float | None = None
    width: float | None = None
    height: float | None = None
    x2: float | None = None
    y2: float | None = None
    points: list[list[float]] | None = None  # freehand: list of [x, y] vertices

    # Text
    text: str | None = None
    font: str | None = None
    font_size: float | None = None
    align: Literal["left", "center", "right"] | None = None

    # Style
    color: str | None = Field(None, description="Stroke/text color, hex e.g. '#FF8800'")
    fill_color: str | None = Field(None, description="Fill/background color, hex")
    opacity: float | None = Field(None, ge=0, le=1)
    rotation: int | None = Field(None, description="Degrees, multiple of 90")
    line_width: float | None = None


class PDFAnnotationInfo(BaseModel):
    page: int
    type: str
    rect: list[float]
    content: str | None = None
    author: str | None = None


class PDFAnnotationsResponse(BaseModel):
    success: bool = True
    annotations: list[PDFAnnotationInfo]


# --- Forms ---------------------------------------------------------------------

class PDFFormFieldInfo(BaseModel):
    name: str
    type: str
    page: int
    rect: list[float]
    value: Any = None
    options: list[str] | None = None
    is_required: bool = False


class PDFFormFieldsResponse(BaseModel):
    success: bool = True
    fields: list[PDFFormFieldInfo]


class PDFFormExportResponse(BaseModel):
    success: bool = True
    values: dict[str, Any]
