"""Trim/merge/volume are backed by PyDub, which shells out to a system
FFmpeg install — these tests only run when one is actually on PATH.
"""

import shutil

import pytest

from app.core.config import settings
from app.tests.conftest import make_wav

pytestmark = pytest.mark.skipif(
    shutil.which(settings.FFMPEG_PATH) is None,
    reason="System FFmpeg is required for trim/merge/volume operations.",
)


def test_trim_audio(client, sample_wav):
    with open(sample_wav, "rb") as f:
        response = client.post(
            "/api/audio/trim",
            files={"file": ("sample.wav", f, "audio/wav")},
            data={"start_time": "0", "end_time": "0.5", "output_format": "wav"},
        )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["operation"] == "trim"

    download = client.get(body["download_url"])
    assert download.status_code == 200


def test_merge_audio(client, sample_wav, tmp_path):
    second = make_wav(tmp_path / "second.wav")
    with open(sample_wav, "rb") as f1, open(second, "rb") as f2:
        response = client.post(
            "/api/audio/merge",
            files=[("files", ("a.wav", f1, "audio/wav")), ("files", ("b.wav", f2, "audio/wav"))],
            data={"output_format": "wav"},
        )
    assert response.status_code == 200, response.text
    assert response.json()["operation"] == "merge"


def test_volume_adjustment(client, sample_wav):
    with open(sample_wav, "rb") as f:
        response = client.post(
            "/api/audio/volume",
            files={"file": ("sample.wav", f, "audio/wav")},
            data={"volume_db": "-6", "output_format": "wav"},
        )
    assert response.status_code == 200, response.text
    assert response.json()["operation"] == "volume"
