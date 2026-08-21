"""Shared pytest fixtures.

Tests point at a dedicated `filecooks_test` MongoDB database (never the dev
database) — set via environment variable before `app.core.config` (and
therefore the rest of the app) is ever imported.
"""

import os
import struct
import wave
from pathlib import Path

import pytest

os.environ.setdefault("MONGODB_DATABASE", "filecooks_test")
os.environ.setdefault("DEBUG", "true")

from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402


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
