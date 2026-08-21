import io


def test_metadata_extraction_for_valid_wav(client, sample_wav):
    with open(sample_wav, "rb") as f:
        response = client.post(
            "/api/audio/metadata",
            files={"file": ("sample.wav", f, "audio/wav")},
        )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["format"] == "wav"
    assert body["sample_rate"] == 44100
    assert body["channels"] == 1
    assert body["duration"] == 1.0
    assert body["size"] > 0


def test_metadata_rejects_invalid_file(client):
    fake_file = io.BytesIO(b"this is not audio data")
    response = client.post(
        "/api/audio/metadata",
        files={"file": ("not_audio.wav", fake_file, "audio/wav")},
    )
    assert response.status_code == 400
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "INVALID_FILE"
