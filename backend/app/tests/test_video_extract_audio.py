from app.tests.conftest import poll_job, requires_ffmpeg


def _submit_extract(client, sample_video, output_format, **extra):
    with open(sample_video, "rb") as f:
        return client.post(
            "/api/video/extract-audio",
            files={"file": ("sample.mp4", f, "video/mp4")},
            data={"output_format": output_format, **extra},
        )


@requires_ffmpeg
def test_extract_audio_rejects_video_without_audio_stream(client, sample_video_no_audio):
    response = _submit_extract(client, sample_video_no_audio, "mp3")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "MISSING_AUDIO_STREAM"


@requires_ffmpeg
def test_extract_mp4_to_mp3(client, sample_video):
    response = _submit_extract(client, sample_video, "mp3", bitrate=128)
    assert response.status_code == 200, response.text
    job = response.json()

    final = poll_job(client, job["job_id"])
    assert final["status"] == "completed", final
    assert final["output_format"] == "mp3"
    assert final["operation"] == "extract_audio"

    download = client.get(final["download_url"])
    assert download.status_code == 200
    assert download.headers["content-type"] == "audio/mpeg"


@requires_ffmpeg
def test_extract_mp4_to_m4a_uses_stream_copy(client, sample_video):
    """Source audio is AAC; m4a is AAC-in-MP4, so no bitrate/rate/channel
    override should trigger a stream copy rather than a re-encode."""
    from app.services.video_audio_extractor import ExtractOptions, video_audio_extractor_service

    options = ExtractOptions(output_format="m4a")
    assert video_audio_extractor_service.should_stream_copy("aac", options) is True

    response = _submit_extract(client, sample_video, "m4a")
    final = poll_job(client, response.json()["job_id"])
    assert final["status"] == "completed", final


@requires_ffmpeg
def test_extract_rejects_invalid_bitrate(client, sample_video):
    response = _submit_extract(client, sample_video, "mp3", bitrate=999)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_PARAMETER"


@requires_ffmpeg
def test_extract_mp4_to_wav(client, sample_video):
    response = _submit_extract(client, sample_video, "wav")
    final = poll_job(client, response.json()["job_id"])
    assert final["status"] == "completed", final

    download = client.get(final["download_url"])
    assert download.status_code == 200
    assert download.headers["content-type"] == "audio/wav"
