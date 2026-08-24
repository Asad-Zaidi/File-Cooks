import base64
import io
import json

import pikepdf

from app.tests.conftest import make_pdf


def test_thumbnails_returns_one_image_per_page(client, tmp_path):
    src = make_pdf(tmp_path / "src.pdf", pages=3)
    with open(src, "rb") as f:
        response = client.post("/api/pdf/thumbnails", files={"file": ("src.pdf", f, "application/pdf")})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["page_count"] == 3
    assert len(body["thumbnails"]) == 3

    first = body["thumbnails"][0]
    assert first["page"] == 1
    assert first["width"] > 0 and first["height"] > 0
    png_bytes = base64.b64decode(first["image_base64"])
    assert png_bytes[:8] == b"\x89PNG\r\n\x1a\n"  # real PNG signature


def test_thumbnails_respects_max_width(client, tmp_path):
    src = make_pdf(tmp_path / "src.pdf", pages=1)
    with open(src, "rb") as f:
        response = client.post(
            "/api/pdf/thumbnails", files={"file": ("src.pdf", f, "application/pdf")}, data={"max_width": "100"},
        )
    assert response.status_code == 200, response.text
    thumb = response.json()["thumbnails"][0]
    assert 80 <= thumb["width"] <= 120


def test_thumbnails_rejects_non_pdf(client, tmp_path):
    path = tmp_path / "not_a_pdf.txt"
    path.write_bytes(b"plain text, not a pdf")
    with open(path, "rb") as f:
        response = client.post("/api/pdf/thumbnails", files={"file": ("not_a_pdf.txt", f, "text/plain")})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "PDF_INVALID"


def test_assemble_reorders_and_drops_pages_from_one_file(client, tmp_path):
    src = make_pdf(tmp_path / "src.pdf", pages=3)
    layout = json.dumps([{"file_index": 0, "page": 3}, {"file_index": 0, "page": 1}])
    with open(src, "rb") as f:
        response = client.post(
            "/api/pdf/assemble", files=[("files", ("src.pdf", f, "application/pdf"))], data={"layout": layout},
        )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["details"]["page_count"] == 2

    download = client.get(body["download_url"])
    result = pikepdf.open(io.BytesIO(download.content))
    assert len(result.pages) == 2
    result.close()


def test_assemble_combines_pages_across_multiple_files(client, tmp_path):
    a = make_pdf(tmp_path / "a.pdf", pages=2)
    b = make_pdf(tmp_path / "b.pdf", pages=2)
    layout = json.dumps([
        {"file_index": 0, "page": 1},
        {"file_index": 1, "page": 2},
        {"file_index": 1, "page": 1},
        {"file_index": 0, "page": 2},
    ])
    with open(a, "rb") as fa, open(b, "rb") as fb:
        response = client.post(
            "/api/pdf/assemble",
            files=[("files", ("a.pdf", fa, "application/pdf")), ("files", ("b.pdf", fb, "application/pdf"))],
            data={"layout": layout},
        )
    assert response.status_code == 200, response.text
    assert response.json()["details"]["page_count"] == 4
    assert response.json()["details"]["source_files"] == 2


def test_assemble_rejects_invalid_file_index(client, sample_pdf):
    layout = json.dumps([{"file_index": 5, "page": 1}])
    with open(sample_pdf, "rb") as f:
        response = client.post(
            "/api/pdf/assemble", files=[("files", ("sample.pdf", f, "application/pdf"))], data={"layout": layout},
        )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "PDF_VALIDATION_ERROR"


def test_assemble_rejects_out_of_range_page(client, sample_pdf):
    layout = json.dumps([{"file_index": 0, "page": 99}])
    with open(sample_pdf, "rb") as f:
        response = client.post(
            "/api/pdf/assemble", files=[("files", ("sample.pdf", f, "application/pdf"))], data={"layout": layout},
        )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "PDF_PAGE_NOT_FOUND"


def test_assemble_rejects_empty_layout(client, sample_pdf):
    with open(sample_pdf, "rb") as f:
        response = client.post(
            "/api/pdf/assemble", files=[("files", ("sample.pdf", f, "application/pdf"))], data={"layout": "[]"},
        )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "PDF_VALIDATION_ERROR"
