from app.tests.conftest import requires_ffmpeg


@requires_ffmpeg
def test_metadata_reports_video_and_audio_streams(client, sample_video):
    with open(sample_video, "rb") as f:
        response = client.post(
            "/api/video/metadata",
            files={"file": ("sample.mp4", f, "video/mp4")},
        )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["has_video"] is True
    assert body["has_audio"] is True
    assert body["video_codec"] == "h264"
    assert body["audio_codec"] == "aac"
    assert body["width"] == 64
    assert body["height"] == 64
    assert body["duration"] and body["duration"] > 0


@requires_ffmpeg
def test_metadata_reports_video_only_file(client, sample_video_no_audio):
    with open(sample_video_no_audio, "rb") as f:
        response = client.post(
            "/api/video/metadata",
            files={"file": ("silent.mp4", f, "video/mp4")},
        )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["has_video"] is True
    assert body["has_audio"] is False


@requires_ffmpeg
def test_metadata_rejects_corrupt_file(client):
    response = client.post(
        "/api/video/metadata",
        files={"file": ("broken.mp4", b"not a real video file", "video/mp4")},
    )
    assert response.status_code == 400
    assert response.json()["success"] is False
