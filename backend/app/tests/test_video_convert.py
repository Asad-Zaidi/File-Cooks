from app.tests.conftest import poll_job, requires_ffmpeg


def _submit_convert(client, sample_video, output_format, **extra):
    with open(sample_video, "rb") as f:
        return client.post(
            "/api/video/convert",
            files={"file": ("sample.mp4", f, "video/mp4")},
            data={"output_format": output_format, "quality": "fast", **extra},
        )


@requires_ffmpeg
def test_convert_rejects_unsupported_output_format(client, sample_video):
    response = _submit_convert(client, sample_video, "not_a_real_format")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_OUTPUT_FORMAT"


@requires_ffmpeg
def test_convert_rejects_video_without_video_stream(client, sample_video_no_audio, tmp_path):
    # sample_video_no_audio still has a video stream -- build a genuinely
    # audio-only file to exercise the MISSING_VIDEO_STREAM path instead.
    import subprocess

    from app.utils.ffmpeg import get_ffmpeg_path

    audio_only = tmp_path / "audio_only.mp4"
    subprocess.run(
        [get_ffmpeg_path(), "-y", "-hide_banner", "-loglevel", "error",
         "-f", "lavfi", "-i", "sine=frequency=440:duration=1", "-c:a", "aac", str(audio_only)],
        check=True,
    )
    with open(audio_only, "rb") as f:
        response = client.post(
            "/api/video/convert",
            files={"file": ("audio_only.mp4", f, "video/mp4")},
            data={"output_format": "mkv"},
        )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "MISSING_VIDEO_STREAM"


@requires_ffmpeg
def test_convert_mp4_to_mkv(client, sample_video):
    response = _submit_convert(client, sample_video, "mkv")
    assert response.status_code == 200, response.text
    job = response.json()
    assert job["status"] == "queued"

    final = poll_job(client, job["job_id"])
    assert final["status"] == "completed", final
    assert final["output_format"] == "mkv"
    assert final["progress"] == 100
    assert final["output_size"] > 0

    download = client.get(final["download_url"])
    assert download.status_code == 200
    assert download.headers["content-type"] == "video/x-matroska"


@requires_ffmpeg
def test_convert_mp4_to_webm(client, sample_video):
    response = _submit_convert(client, sample_video, "webm")
    job = response.json()
    final = poll_job(client, job["job_id"])
    assert final["status"] == "completed", final

    download = client.get(final["download_url"])
    assert download.status_code == 200
    assert download.headers["content-type"] == "video/webm"


@requires_ffmpeg
def test_convert_rejects_unavailable_codec_for_container(client, sample_video):
    response = _submit_convert(client, sample_video, "webm", video_codec="h264")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "UNSUPPORTED_CODEC"


@requires_ffmpeg
def test_convert_custom_resolution_bounds(client, sample_video):
    response = _submit_convert(client, sample_video, "mp4", resolution="custom", custom_width=8)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_PARAMETER"
