"""Request/response schemas for the /api/video/* and /api/jobs/* endpoints.

Upload endpoints take their parameters as multipart form fields (see the
routers); these models describe the JSON shapes that come back out.
"""

from typing import Any

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail


class JobCreatedResponse(BaseModel):
    success: bool = True
    job_id: str
    status: str
    batch_id: str | None = None


class BatchJobCreatedResponse(BaseModel):
    success: bool = True
    batch_id: str
    jobs: list[JobCreatedResponse]


class JobStatusResponse(BaseModel):
    success: bool = True
    job_id: str
    batch_id: str | None = None
    status: str
    operation: str
    progress: int
    original_filename: str
    input_format: str
    output_format: str
    input_size: int
    output_size: int | None = None
    processing_time: float | None = None
    error: str | None = None
    download_url: str | None = None


class VideoMetadataResponse(BaseModel):
    success: bool = True
    filename: str
    size: int
    container: str | None = None
    duration: float | None = None
    has_video: bool
    has_audio: bool
    video_codec: str | None = None
    audio_codec: str | None = None
    width: int | None = None
    height: int | None = None
    fps: float | None = None
    video_bitrate: int | None = None
    audio_bitrate: int | None = None
    sample_rate: int | None = None
    channels: int | None = None
    tags: dict[str, Any] = Field(default_factory=dict)


class CodecOption(BaseModel):
    key: str
    label: str


class ContainerOption(BaseModel):
    key: str
    label: str
    extensions: list[str]
    video_codecs: list[CodecOption]
    audio_codecs: list[CodecOption]


class SupportedVideoFormatsResponse(BaseModel):
    ffmpeg_available: bool
    containers: list[ContainerOption]
    audio_output_formats: list[str]
    resolutions: list[str]
    fps_options: list[int]
    quality_presets: list[str]
    audio_bitrates_kbps: list[int]
    sample_rates: list[int]
