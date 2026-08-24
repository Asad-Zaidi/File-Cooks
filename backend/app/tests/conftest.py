"""Shared pytest fixtures.

Tests point at a dedicated `filecooks_test` MongoDB database (never the dev
database) — set via environment variable before `app.core.config` (and
therefore the rest of the app) is ever imported.
"""

import os
import struct
import subprocess
import wave
from pathlib import Path

import pikepdf
import pymupdf
import pytest

os.environ.setdefault("MONGODB_DATABASE", "filecooks_test")
os.environ.setdefault("DEBUG", "true")

from fastapi.testclient import TestClient  # noqa: E402

from app.utils.ffmpeg import check_ffmpeg, get_ffmpeg_path  # noqa: E402
from main import app  # noqa: E402

FFMPEG_AVAILABLE = check_ffmpeg().available

requires_ffmpeg = pytest.mark.skipif(
    not FFMPEG_AVAILABLE, reason="system FFmpeg is not installed/on PATH in this environment",
)


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


def make_wav(path: Path, seconds: float = 1.0, channels: int = 1, sample_rate: int = 44100) -> Path:
    """Write a small synthetic WAV file — no FFmpeg required to generate it."""
    n_frames = int(seconds * sample_rate)
    with wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(channels)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        one_frame = struct.pack("<h", 3000) * channels
        wav_file.writeframes(one_frame * n_frames)
    return path


@pytest.fixture
def sample_wav(tmp_path) -> Path:
    return make_wav(tmp_path / "sample.wav")


def make_video(path: Path, seconds: float = 1.0, with_audio: bool = True) -> Path:
    """Synthesize a tiny real MP4 (H.264 video + AAC audio) via ffmpeg's
    `lavfi` test sources -- no checked-in binary fixture required."""
    ffmpeg_path = get_ffmpeg_path()
    cmd = [
        ffmpeg_path, "-y", "-hide_banner", "-loglevel", "error",
        "-f", "lavfi", "-i", f"testsrc=duration={seconds}:size=64x64:rate=10",
    ]
    if with_audio:
        cmd += ["-f", "lavfi", "-i", f"sine=frequency=440:duration={seconds}"]
    cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p"]
    if with_audio:
        cmd += ["-c:a", "aac", "-shortest"]
    cmd += [str(path)]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30, check=False)
    assert result.returncode == 0, f"failed to synthesize test video: {result.stderr}"
    return path


def poll_job(client, job_id: str, timeout: float = 30.0, interval: float = 0.2) -> dict:
    """Poll GET /api/jobs/{job_id} until it reaches a terminal status."""
    import time as _time

    deadline = _time.monotonic() + timeout
    while _time.monotonic() < deadline:
        response = client.get(f"/api/jobs/{job_id}")
        assert response.status_code == 200, response.text
        body = response.json()
        if body["status"] in ("completed", "failed", "cancelled"):
            return body
        _time.sleep(interval)
    raise AssertionError(f"job {job_id} did not reach a terminal status within {timeout}s")


@pytest.fixture
def sample_video(tmp_path) -> Path:
    return make_video(tmp_path / "sample.mp4")


@pytest.fixture
def sample_video_no_audio(tmp_path) -> Path:
    return make_video(tmp_path / "sample_silent.mp4", with_audio=False)


def make_pdf(
    path: Path,
    pages: int = 1,
    title: str | None = None,
    author: str | None = None,
    user_password: str | None = None,
    owner_password: str | None = None,
) -> Path:
    """Write a small synthetic PDF -- no external tooling required, just
    pikepdf itself (the library under test)."""
    pdf = pikepdf.new()
    for _ in range(pages):
        pdf.add_blank_page(page_size=(200, 300))
    if title is not None:
        pdf.docinfo["/Title"] = title
    if author is not None:
        pdf.docinfo["/Author"] = author

    if user_password or owner_password:
        pdf.save(
            str(path),
            encryption=pikepdf.Encryption(
                user=user_password or "", owner=owner_password or user_password or "",
            ),
        )
    else:
        pdf.save(str(path))
    pdf.close()
    return path


def make_pdf_with_image(path: Path, pages: int = 1, image_size=(800, 600)) -> Path:
    """A synthetic PDF with one embedded raster image per page, for
    compression tests. Built with PyMuPDF (no external tooling)."""
    from PIL import Image

    doc = pymupdf.open()
    img = Image.new("RGB", image_size, color=(180, 60, 60))
    import io as _io
    buf = _io.BytesIO()
    img.save(buf, format="PNG")
    img_bytes = buf.getvalue()

    for _ in range(pages):
        page = doc.new_page(width=400, height=400)
        page.insert_image(pymupdf.Rect(20, 20, 380, 380), stream=img_bytes)
    doc.save(str(path))
    doc.close()
    return path


def make_pdf_with_form(path: Path) -> Path:
    """A synthetic single-page PDF with one text field ('full_name') and one
    checkbox field ('agree'), for forms tests. Built with PyMuPDF."""
    doc = pymupdf.open()
    page = doc.new_page(width=300, height=300)

    text_widget = pymupdf.Widget()
    text_widget.field_name = "full_name"
    text_widget.field_type = pymupdf.PDF_WIDGET_TYPE_TEXT
    text_widget.rect = pymupdf.Rect(10, 10, 200, 30)
    text_widget.field_value = ""
    page.add_widget(text_widget)

    checkbox_widget = pymupdf.Widget()
    checkbox_widget.field_name = "agree"
    checkbox_widget.field_type = pymupdf.PDF_WIDGET_TYPE_CHECKBOX
    checkbox_widget.rect = pymupdf.Rect(10, 40, 30, 60)
    checkbox_widget.field_value = False
    page.add_widget(checkbox_widget)

    doc.save(str(path))
    doc.close()
    return path


@pytest.fixture
def sample_pdf(tmp_path) -> Path:
    return make_pdf(tmp_path / "sample.pdf", pages=3, title="Sample Doc", author="FileCooks")


@pytest.fixture
def sample_mp3(tmp_path, client) -> Path:
    """A real MP3, produced by converting a synthetic WAV through the API."""
    wav_path = make_wav(tmp_path / "src_for_mp3.wav")
    with open(wav_path, "rb") as wav_file:
        response = client.post(
            "/api/audio/convert",
            files={"file": ("src.wav", wav_file, "audio/wav")},
            data={"output_format": "mp3"},
        )
    assert response.status_code == 200, response.text
    conversion_id = response.json()["conversion_id"]

    download = client.get(f"/api/audio/download/{conversion_id}")
    assert download.status_code == 200

    mp3_path = tmp_path / "sample.mp3"
    mp3_path.write_bytes(download.content)
    return mp3_path
