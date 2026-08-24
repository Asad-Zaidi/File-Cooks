from app.tests.conftest import make_pdf


def test_pdf_info_returns_page_count_and_dimensions(client, sample_pdf):
    with open(sample_pdf, "rb") as f:
        response = client.post("/api/pdf/info", files={"file": ("sample.pdf", f, "application/pdf")})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["success"] is True
    assert body["page_count"] == 3
    assert body["encrypted"] is False
    assert body["password_protected"] is False
    assert len(body["pages"]) == 3
    assert body["pages"][0]["width"] == 200
    assert body["pages"][0]["height"] == 300
    assert body["pages"][0]["rotation"] == 0
    assert body["has_forms"] is False
    assert body["has_annotations"] is False
    assert body["has_signatures"] is False


def test_pdf_info_reflects_docinfo_metadata(client, sample_pdf):
    with open(sample_pdf, "rb") as f:
        response = client.post("/api/pdf/info", files={"file": ("sample.pdf", f, "application/pdf")})
    body = response.json()
    assert body["title"] == "Sample Doc"
    assert body["author"] == "FileCooks"


def test_pdf_metadata_endpoint_returns_metadata_subset(client, sample_pdf):
    with open(sample_pdf, "rb") as f:
        response = client.post("/api/pdf/metadata", files={"file": ("sample.pdf", f, "application/pdf")})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["title"] == "Sample Doc"
    assert body["author"] == "FileCooks"
    assert body["encrypted"] is False
    assert "pdf_version" in body


def test_pdf_validate_on_valid_pdf(client, sample_pdf):
    with open(sample_pdf, "rb") as f:
        response = client.post("/api/pdf/validate", files={"file": ("sample.pdf", f, "application/pdf")})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["valid"] is True
    assert body["is_pdf"] is True
    assert body["page_count"] == 3
    assert body["malformed_reason"] is None


def test_pdf_encrypted_without_password_reports_detection_only(client, tmp_path):
    path = make_pdf(tmp_path / "enc.pdf", pages=2, user_password="secret", owner_password="ownersecret")
    with open(path, "rb") as f:
        response = client.post("/api/pdf/info", files={"file": ("enc.pdf", f, "application/pdf")})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["encrypted"] is True
    assert body["password_protected"] is True
    assert body["page_count"] is None
    assert body["title"] is None
    assert body["pages"] == []


def test_pdf_encrypted_with_correct_password_returns_full_info(client, tmp_path):
    path = make_pdf(tmp_path / "enc.pdf", pages=2, title="Secret Doc", user_password="secret", owner_password="ownersecret")
    with open(path, "rb") as f:
        response = client.post(
            "/api/pdf/info", files={"file": ("enc.pdf", f, "application/pdf")}, data={"password": "secret"},
        )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["encrypted"] is True
    assert body["password_protected"] is True
    assert body["page_count"] == 2
    assert body["title"] == "Secret Doc"


def test_pdf_encrypted_with_wrong_password_returns_400(client, tmp_path):
    path = make_pdf(tmp_path / "enc.pdf", pages=1, user_password="secret", owner_password="ownersecret")
    with open(path, "rb") as f:
        response = client.post(
            "/api/pdf/info", files={"file": ("enc.pdf", f, "application/pdf")}, data={"password": "wrong"},
        )
    assert response.status_code == 400
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "PDF_PASSWORD_ERROR"


def test_pdf_info_rejects_non_pdf_upload(client, tmp_path):
    path = tmp_path / "not_a_pdf.txt"
    path.write_bytes(b"this is definitely not a PDF file, just plain text padding")
    with open(path, "rb") as f:
        response = client.post("/api/pdf/info", files={"file": ("not_a_pdf.txt", f, "text/plain")})
    assert response.status_code == 400
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "PDF_INVALID"


def test_pdf_validate_reports_invalid_for_non_pdf_upload(client, tmp_path):
    path = tmp_path / "not_a_pdf.txt"
    path.write_bytes(b"this is definitely not a PDF file, just plain text padding")
    with open(path, "rb") as f:
        response = client.post("/api/pdf/validate", files={"file": ("not_a_pdf.txt", f, "text/plain")})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["valid"] is False
    assert body["is_pdf"] is False
    assert body["malformed_reason"]


def test_pdf_validate_reports_malformed_for_garbage_pdf_body(client, tmp_path):
    path = tmp_path / "garbage.pdf"
    path.write_bytes(b"%PDF-1.7\n" + b"not real pdf structure, just garbage bytes" * 10)
    with open(path, "rb") as f:
        response = client.post("/api/pdf/validate", files={"file": ("garbage.pdf", f, "application/pdf")})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["is_pdf"] is True
    assert body["valid"] is False
    assert body["malformed_reason"]


def test_pdf_info_rejects_empty_file(client, tmp_path):
    path = tmp_path / "empty.pdf"
    path.write_bytes(b"")
    with open(path, "rb") as f:
        response = client.post("/api/pdf/info", files={"file": ("empty.pdf", f, "application/pdf")})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_FILE"


def test_pdf_info_enforces_max_upload_size(client, sample_pdf, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "MAX_PDF_SIZE_MB", 0)
    with open(sample_pdf, "rb") as f:
        response = client.post("/api/pdf/info", files={"file": ("sample.pdf", f, "application/pdf")})
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "FILE_TOO_LARGE"


def test_pdf_info_enforces_max_page_count(client, sample_pdf, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "MAX_PDF_PAGES", 2)  # sample_pdf has 3 pages
    with open(sample_pdf, "rb") as f:
        response = client.post("/api/pdf/info", files={"file": ("sample.pdf", f, "application/pdf")})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "PDF_TOO_MANY_PAGES"
