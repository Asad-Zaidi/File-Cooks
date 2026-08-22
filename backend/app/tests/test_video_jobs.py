import subprocess

from app.tests.conftest import poll_job, requires_ffmpeg
from app.utils.ffmpeg import get_ffmpeg_path


def test_get_unknown_job_returns_404(client):
    response = client.get("/api/jobs/" + "0" * 32)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_get_job_rejects_malformed_id(client):
    response = client.get("/api/jobs/not-a-valid-id")
    assert response.status_code == 404


def test_cancel_unknown_job_returns_404(client):
    response = client.post("/api/jobs/" + "0" * 32 + "/cancel")
    assert response.status_code == 404


def test_download_returns_404_for_unknown_job(client):
    response = client.get("/api/files/" + "0" * 32 + "/download")
    assert response.status_code == 404


@requires_ffmpeg
def test_cancel_completed_job_is_rejected(client, sample_video):
    with open(sample_video, "rb") as f:
        response = client.post(
            "/api/video/convert",
            files={"file": ("sample.mp4", f, "video/mp4")},
            data={"output_format": "mkv", "quality": "fast"},
        )
    job_id = response.json()["job_id"]
    poll_job(client, job_id)

    cancel_response = client.post(f"/api/jobs/{job_id}/cancel")
    assert cancel_response.status_code == 409
    assert cancel_response.json()["error"]["code"] == "JOB_NOT_CANCELLABLE"


@requires_ffmpeg
def test_cancel_running_job(client, tmp_path):
    """Best-effort: cancel a deliberately slow encode almost immediately
    after submitting it, and verify the job ends up cancelled (or, in the
    rare case it finished first, that cancelling a finished job is rejected
    cleanly rather than corrupting state)."""
    ffmpeg_path = get_ffmpeg_path()
    slow_video = tmp_path / "slow.mp4"
    subprocess.run(
        [ffmpeg_path, "-y", "-hide_banner", "-loglevel", "error",
         "-f", "lavfi", "-i", "testsrc=duration=10:size=1280x720:rate=24",
         "-c:v", "libx264", "-preset", "veryslow", "-pix_fmt", "yuv420p", str(slow_video)],
        check=True, timeout=90,
    )

    with open(slow_video, "rb") as f:
        response = client.post(
            "/api/video/convert",
            files={"file": ("slow.mp4", f, "video/mp4")},
            data={"output_format": "mkv", "quality": "maximum"},
        )
    job_id = response.json()["job_id"]

    cancel_response = client.post(f"/api/jobs/{job_id}/cancel")
    assert cancel_response.status_code in (200, 409)

    if cancel_response.status_code == 200:
        body = cancel_response.json()
        assert body["status"] in ("cancelled", "completed")
        if body["status"] == "cancelled":
            download = client.get(f"/api/files/{job_id}/download")
            assert download.status_code == 404


@requires_ffmpeg
def test_batch_convert(client, sample_video):
    with open(sample_video, "rb") as f1, open(sample_video, "rb") as f2:
        response = client.post(
            "/api/video/batch-convert",
            files=[
                ("files", ("a.mp4", f1, "video/mp4")),
                ("files", ("b.mp4", f2, "video/mp4")),
            ],
            data={"output_format": "mkv", "quality": "fast"},
        )
    assert response.status_code == 200, response.text
    body = response.json()
    assert len(body["jobs"]) == 2

    for job in body["jobs"]:
        final = poll_job(client, job["job_id"])
        assert final["status"] == "completed", final
