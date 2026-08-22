"""Video API routes.

Thin HTTP layer only -- upload handling, request parsing and response
shaping. Validation, format detection and all FFmpeg work live in
app/services/*; routes never build FFmpeg commands themselves. Conversion
routes create a background job (see app/services/job_manager.py) and return
immediately with {job_id, status} -- clients poll GET /api/jobs/{job_id}.
"""

import uuid

from fastapi import APIRouter, File, Form, UploadFile

from app.core.config import settings
from app.core.video_formats import (
    AUDIO_BITRATES_KBPS,
    AUDIO_IN_VIDEO_CODECS,
    QUALITY_PRESETS,
    RESOLUTION_PRESETS,
    VIDEO_CODECS,
    ALLOWED_FPS,
    get_container,
    list_available_audio_codecs,
    list_available_containers,
    list_available_extraction_audio_formats,
    list_available_video_codecs,
    probe_ffmpeg_capabilities,
)
from app.core.formats import COMMON_SAMPLE_RATES
from app.core.exceptions import MissingAudioStreamError, MissingVideoStreamError, VideoTooLongError
from app.db.models import JobOperation
from app.dto.video import (
    BatchJobCreatedResponse,
    CodecOption,
    ContainerOption,
    JobCreatedResponse,
    SupportedVideoFormatsResponse,
    VideoMetadataResponse,
)
from app.services import job_manager
from app.services.video_audio_extractor import ExtractOptions, video_audio_extractor_service
from app.services.video_converter import ConvertOptions, video_converter_service
from app.services.video_metadata import video_metadata_service
from app.utils.files import delete_file, sanitize_filename, save_upload_file

router = APIRouter(prefix="/api/video", tags=["Video"])


@router.get("/formats", response_model=SupportedVideoFormatsResponse, summary="List supported video formats/codecs")
async def get_supported_video_formats():
    caps = probe_ffmpeg_capabilities()

    containers: list[ContainerOption] = []
    for key in list_available_containers():
        container = get_container(key)
        containers.append(ContainerOption(
            key=container.key,
            label=container.label,
            extensions=list(container.extensions),
            video_codecs=[
                CodecOption(key=c, label=VIDEO_CODECS[c].label) for c in list_available_video_codecs(key)
            ],
            audio_codecs=[
                CodecOption(key=c, label=AUDIO_IN_VIDEO_CODECS[c].label) for c in list_available_audio_codecs(key)
            ],
        ))

    return SupportedVideoFormatsResponse(
        ffmpeg_available=caps.available,
        containers=containers,
        audio_output_formats=list_available_extraction_audio_formats(),
        resolutions=["original", *RESOLUTION_PRESETS.keys(), "custom"],
        fps_options=list(ALLOWED_FPS),
        quality_presets=list(QUALITY_PRESETS),
        audio_bitrates_kbps=list(AUDIO_BITRATES_KBPS),
        sample_rates=sorted(COMMON_SAMPLE_RATES),
    )


async def _upload_and_probe(file: UploadFile):
    original_filename = sanitize_filename(file.filename or "upload")
    ext = original_filename.rsplit(".", 1)[-1] if "." in original_filename else "bin"
    input_path, input_size = await save_upload_file(
        file, settings.upload_path, ext, max_bytes=settings.max_video_upload_size_bytes,
    )
    try:
        metadata = video_metadata_service.probe(input_path, original_filename)
    except Exception:
        delete_file(input_path)
        raise

    if metadata["duration"] and metadata["duration"] > settings.MAX_VIDEO_DURATION_SECONDS:
        delete_file(input_path)
        raise VideoTooLongError(settings.MAX_VIDEO_DURATION_SECONDS)

    return input_path, original_filename, input_size, metadata


@router.post("/metadata", response_model=VideoMetadataResponse, summary="Inspect a video/audio media file")
async def extract_video_metadata(file: UploadFile = File(..., description="The media file to inspect")):
    original_filename = sanitize_filename(file.filename or "upload")
    ext = original_filename.rsplit(".", 1)[-1] if "." in original_filename else "bin"
    path, _ = await save_upload_file(file, settings.temp_path, ext, max_bytes=settings.max_video_upload_size_bytes)
    try:
        data = video_metadata_service.probe(path, original_filename)
    finally:
        delete_file(path)

    return VideoMetadataResponse(**data)


@router.post("/convert", response_model=JobCreatedResponse, summary="Convert a video to another container/codec")
async def convert_video(
    file: UploadFile = File(..., description="The video file to convert"),
    output_format: str = Form(..., description="Target container, e.g. mp4, mkv, webm"),
    video_codec: str | None = Form(None, description="Video codec key, or 'auto'/'copy'/'none'"),
    audio_codec: str | None = Form(None, description="Audio codec key, or 'auto'/'copy'/'none'"),
    video_bitrate: str | None = Form(None, description="Explicit video bitrate, e.g. 4000k"),
    audio_bitrate: str | None = Form(None, description="Explicit audio bitrate, e.g. 192k"),
    resolution: str | None = Form(None, description="original | 360p..2160p | custom"),
    custom_width: int | None = Form(None),
    custom_height: int | None = Form(None),
    fps: int | None = Form(None, description="24, 25, 30, 50 or 60"),
    quality: str | None = Form(None, description="fast | balanced | high | maximum"),
):
    input_path, original_filename, input_size, metadata = await _upload_and_probe(file)
    if not metadata["has_video"]:
        delete_file(input_path)
        raise MissingVideoStreamError()

    options = ConvertOptions(
        output_format=output_format, video_codec=video_codec, audio_codec=audio_codec,
        video_bitrate=video_bitrate, audio_bitrate=audio_bitrate, resolution=resolution,
        custom_width=custom_width, custom_height=custom_height, fps=fps, quality=quality,
    )
    container = video_converter_service.validate(options)[0]  # fail fast, before creating the job

    async def run_conversion(output_path, on_progress, on_process_started):
        await video_converter_service.run(
            input_path, output_path, options,
            duration_seconds=metadata["duration"], on_progress=on_progress, on_process_started=on_process_started,
        )

    job = await job_manager.create_job(
        operation=JobOperation.CONVERT,
        input_path=input_path,
        original_filename=original_filename,
        input_format=metadata["container"] or "unknown",
        output_format=container.key,
        output_extension=container.primary_extension,
        input_size=input_size,
        settings_snapshot={
            "video_codec": video_codec, "audio_codec": audio_codec, "resolution": resolution,
            "fps": fps, "quality": quality,
        },
        run_conversion=run_conversion,
    )
    return JobCreatedResponse(job_id=job.job_id, status=job.status.value)


@router.post("/extract-audio", response_model=JobCreatedResponse, summary="Extract the audio track from a video")
async def extract_audio(
    file: UploadFile = File(..., description="The video file to extract audio from"),
    output_format: str = Form(..., description="Target audio format, e.g. mp3, wav, flac, m4a"),
    bitrate: int | None = Form(None, description="Bitrate in kbps, e.g. 192"),
    sample_rate: int | None = Form(None, description="Sample rate in Hz, e.g. 44100"),
    channels: int | None = Form(None, description="1 = mono, 2 = stereo"),
):
    input_path, original_filename, input_size, metadata = await _upload_and_probe(file)
    if not metadata["has_audio"]:
        delete_file(input_path)
        raise MissingAudioStreamError()

    options = ExtractOptions(
        output_format=output_format, bitrate_kbps=bitrate, sample_rate=sample_rate, channels=channels,
    )
    spec = video_audio_extractor_service.validate(options, metadata["has_audio"])  # fail fast

    async def run_conversion(output_path, on_progress, on_process_started):
        await video_audio_extractor_service.run(
            input_path, output_path, options, metadata["audio_codec"], metadata["has_audio"],
            duration_seconds=metadata["duration"], on_progress=on_progress, on_process_started=on_process_started,
        )

    job = await job_manager.create_job(
        operation=JobOperation.EXTRACT_AUDIO,
        input_path=input_path,
        original_filename=original_filename,
        input_format=metadata["container"] or "unknown",
        output_format=spec.key,
        output_extension=spec.primary_extension,
        input_size=input_size,
        settings_snapshot={"bitrate_kbps": bitrate, "sample_rate": sample_rate, "channels": channels},
        run_conversion=run_conversion,
    )
    return JobCreatedResponse(job_id=job.job_id, status=job.status.value)


@router.post("/batch-convert", response_model=BatchJobCreatedResponse, summary="Convert multiple videos at once")
async def batch_convert_video(
    files: list[UploadFile] = File(..., description="Two or more video files"),
    output_format: str = Form(...),
    video_codec: str | None = Form(None),
    audio_codec: str | None = Form(None),
    resolution: str | None = Form(None),
    fps: int | None = Form(None),
    quality: str | None = Form(None),
):
    batch_id = uuid.uuid4().hex
    jobs: list[JobCreatedResponse] = []

    for file in files:
        input_path, original_filename, input_size, metadata = await _upload_and_probe(file)
        if not metadata["has_video"]:
            delete_file(input_path)
            continue  # skip invalid files in a batch rather than failing the whole request

        options = ConvertOptions(
            output_format=output_format, video_codec=video_codec, audio_codec=audio_codec,
            resolution=resolution, fps=fps, quality=quality,
        )
        container = video_converter_service.validate(options)[0]

        async def run_conversion(output_path, on_progress, on_process_started, _input_path=input_path, _options=options, _duration=metadata["duration"]):
            await video_converter_service.run(
                _input_path, output_path, _options,
                duration_seconds=_duration, on_progress=on_progress, on_process_started=on_process_started,
            )

        job = await job_manager.create_job(
            operation=JobOperation.CONVERT,
            input_path=input_path,
            original_filename=original_filename,
            input_format=metadata["container"] or "unknown",
            output_format=container.key,
            output_extension=container.primary_extension,
            input_size=input_size,
            settings_snapshot={"video_codec": video_codec, "audio_codec": audio_codec, "quality": quality},
            run_conversion=run_conversion,
            batch_id=batch_id,
        )
        jobs.append(JobCreatedResponse(job_id=job.job_id, status=job.status.value, batch_id=batch_id))

    return BatchJobCreatedResponse(batch_id=batch_id, jobs=jobs)
