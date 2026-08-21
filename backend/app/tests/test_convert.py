from functools import partial

from app.core.config import settings
from app.db.session import get_conversion_record


def test_convert_rejects_unsupported_output_format(client, sample_wav):
    with open(sample_wav, "rb") as f:
        response = client.post(
            "/api/audio/convert",
            files={"file": ("sample.wav", f, "audio/wav")},
            data={"output_format": "xyz"},
        )
    assert response.status_code == 400
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "INVALID_OUTPUT_FORMAT"


def test_convert_wav_to_mp3(client, sample_wav):
    with open(sample_wav, "rb") as f:
        response = client.post(
            "/api/audio/convert",
            files={"file": ("sample.wav", f, "audio/wav")},
            data={"output_format": "mp3", "quality": "high"},
        )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["success"] is True
    assert body["input_format"] == "wav"
    assert body["output_format"] == "mp3"
    assert body["output_size"] > 0

    download = client.get(body["download_url"])
    assert download.status_code == 200
    assert download.headers["content-type"] == "audio/mpeg"


def test_convert_mp3_to_wav(client, sample_mp3):
    with open(sample_mp3, "rb") as f:
        response = client.post(
            "/api/audio/convert",
            files={"file": ("sample.mp3", f, "audio/mpeg")},
            data={"output_format": "wav"},
        )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["input_format"] == "mp3"
    assert body["output_format"] == "wav"

    download = client.get(body["download_url"])
    assert download.status_code == 200
    assert download.headers["content-type"] == "audio/wav"


def test_download_returns_404_for_unknown_id(client):
    response = client.get("/api/audio/download/" + "0" * 32)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_download_rejects_malformed_id(client):
    response = client.get("/api/audio/download/not-a-valid-id")
    assert response.status_code == 404


def test_download_handles_missing_output_file(client, sample_wav):
    with open(sample_wav, "rb") as f:
        response = client.post(
            "/api/audio/convert",
            files={"file": ("sample.wav", f, "audio/wav")},
            data={"output_format": "mp3"},
        )
    conversion_id = response.json()["conversion_id"]

    # Simulate the converted file having expired / been cleaned up. Fetched via
    # the TestClient's own portal so the async Mongo client stays on the one
    # event loop it was created on.
    record = client.portal.call(partial(get_conversion_record, conversion_id))
    output_path = settings.converted_path / record["output_filename"]
    output_path.unlink()

    download = client.get(f"/api/audio/download/{conversion_id}")
    assert download.status_code == 404


def test_convert_enforces_max_upload_size(client, sample_wav, monkeypatch):
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_MB", 0)
    with open(sample_wav, "rb") as f:
        response = client.post(
            "/api/audio/convert",
            files={"file": ("sample.wav", f, "audio/wav")},
            data={"output_format": "mp3"},
        )
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "FILE_TOO_LARGE"
