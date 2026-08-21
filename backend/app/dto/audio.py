"""Request/response schemas for the /api/audio/* endpoints.

Upload endpoints take their parameters as multipart form fields (see the
router), these models describe the JSON shapes that come back out.
"""

from typing import Any

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail


class ConvertResponse(BaseModel):
    success: bool = True
    conversion_id: str
    status: str
    original_filename: str
    input_format: str
    output_format: str
    input_size: int
    output_size: int
    processing_time: float
    download_url: str


class ProcessResponse(BaseModel):
    """Response shape shared by trim / merge / volume."""

    success: bool = True
    conversion_id: str
    status: str
    operation: str
    output_format: str
    output_size: int
    processing_time: float
    download_url: str


class AudioMetadataResponse(BaseModel):
    success: bool = True
    filename: str
    format: str
    duration: float | None = None
    codec: str | None = None
    sample_rate: int | None = None
    channels: int | None = None
    bitrate: int | None = None
    size: int
    container: str | None = None
    tags: dict[str, Any] = Field(default_factory=dict)


class SupportedFormatsResponse(BaseModel):
    input_formats: list[str]
    output_formats: list[str]
    quality_presets: list[str]
