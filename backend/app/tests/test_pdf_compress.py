from app.tests.conftest import make_pdf, make_pdf_with_image


def test_compress_balanced_shrinks_a_pdf_with_images(client, tmp_path):
    src = make_pdf_with_image(tmp_path / "src.pdf", pages=1, image_size=(1600, 1200))
    with open(src, "rb") as f:
        response = client.post(
            "/api/pdf/compress", files={"file": ("src.pdf", f, "application/pdf")}, data={"mode": "balanced"},
        )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "completed"
    details = body["details"]
    assert details["mode"] == "balanced"
    assert details["final_size"] <= details["original_size"]
    assert details["images_recompressed"] >= 1
    assert details["compression_ratio"] >= 0

    download = client.get(body["download_url"])
    assert download.status_code == 200
    assert download.headers["content-type"] == "application/pdf"


def test_compress_low_mode_does_not_touch_images(client, tmp_path):
    src = make_pdf_with_image(tmp_path / "src.pdf", pages=1)
    with open(src, "rb") as f:
        response = client.post(
            "/api/pdf/compress", files={"file": ("src.pdf", f, "application/pdf")}, data={"mode": "low"},
        )
    assert response.status_code == 200, response.text
    assert response.json()["details"]["images_recompressed"] == 0


def test_compress_custom_mode_requires_quality(client, sample_pdf):
    with open(sample_pdf, "rb") as f:
        response = client.post(
            "/api/pdf/compress", files={"file": ("sample.pdf", f, "application/pdf")}, data={"mode": "custom"},
        )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "PDF_VALIDATION_ERROR"


def test_compress_custom_mode_with_quality_succeeds(client, tmp_path):
    src = make_pdf_with_image(tmp_path / "src.pdf", pages=1)
    with open(src, "rb") as f:
        response = client.post(
            "/api/pdf/compress", files={"file": ("src.pdf", f, "application/pdf")},
            data={"mode": "custom", "quality": "40", "max_dimension": "500"},
        )
    assert response.status_code == 200, response.text
    assert response.json()["details"]["images_recompressed"] >= 1


def test_compress_rejects_unknown_mode(client, sample_pdf):
    with open(sample_pdf, "rb") as f:
        response = client.post(
            "/api/pdf/compress", files={"file": ("sample.pdf", f, "application/pdf")}, data={"mode": "ultra"},
        )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "PDF_VALIDATION_ERROR"


def test_compress_plain_pdf_without_images_still_succeeds(client, tmp_path):
    src = make_pdf(tmp_path / "plain.pdf", pages=3)
    with open(src, "rb") as f:
        response = client.post(
            "/api/pdf/compress", files={"file": ("plain.pdf", f, "application/pdf")}, data={"mode": "high"},
        )
    assert response.status_code == 200, response.text
    assert response.json()["details"]["images_recompressed"] == 0
