import io
import zipfile

import pikepdf

from app.tests.conftest import make_pdf


def _download(client, download_url):
    response = client.get(download_url)
    assert response.status_code == 200, response.text
    return response


def test_merge_combines_page_counts(client, tmp_path):
    a = make_pdf(tmp_path / "a.pdf", pages=2)
    b = make_pdf(tmp_path / "b.pdf", pages=3)

    with open(a, "rb") as fa, open(b, "rb") as fb:
        response = client.post(
            "/api/pdf/merge",
            files=[("files", ("a.pdf", fa, "application/pdf")), ("files", ("b.pdf", fb, "application/pdf"))],
        )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["success"] is True
    assert body["status"] == "completed"
    assert body["details"]["page_count"] == 5

    download = _download(client, body["download_url"])
    merged = pikepdf.open(io.BytesIO(download.content))
    assert len(merged.pages) == 5
    merged.close()


def test_merge_rejects_single_file(client, sample_pdf):
    with open(sample_pdf, "rb") as f:
        response = client.post("/api/pdf/merge", files=[("files", ("a.pdf", f, "application/pdf"))])
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "PDF_VALIDATION_ERROR"


def test_extract_pages_returns_subset_in_requested_order(client, tmp_path):
    src = make_pdf(tmp_path / "src.pdf", pages=5)
    with open(src, "rb") as f:
        response = client.post(
            "/api/pdf/extract-pages", files={"file": ("src.pdf", f, "application/pdf")}, data={"pages": "[3,1]"},
        )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["details"]["page_count"] == 2

    download = _download(client, body["download_url"])
    extracted = pikepdf.open(io.BytesIO(download.content))
    assert len(extracted.pages) == 2
    extracted.close()


def test_extract_pages_rejects_out_of_range_page(client, sample_pdf):
    with open(sample_pdf, "rb") as f:
        response = client.post(
            "/api/pdf/extract-pages", files={"file": ("sample.pdf", f, "application/pdf")}, data={"pages": "99"},
        )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "PDF_PAGE_NOT_FOUND"


def test_reorder_pages_requires_full_permutation(client, sample_pdf):
    # sample_pdf has 3 pages -- omitting page 2 should be rejected
    with open(sample_pdf, "rb") as f:
        response = client.post(
            "/api/pdf/reorder-pages", files={"file": ("sample.pdf", f, "application/pdf")}, data={"order": "3,1"},
        )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "PDF_VALIDATION_ERROR"


def test_reorder_pages_accepts_full_permutation(client, tmp_path):
    src = make_pdf(tmp_path / "src.pdf", pages=3)
    with open(src, "rb") as f:
        response = client.post(
            "/api/pdf/reorder-pages", files={"file": ("src.pdf", f, "application/pdf")}, data={"order": "3,1,2"},
        )
    assert response.status_code == 200, response.text
    assert response.json()["details"]["page_count"] == 3


def test_delete_pages_removes_requested_pages(client, tmp_path):
    src = make_pdf(tmp_path / "src.pdf", pages=5)
    with open(src, "rb") as f:
        response = client.post(
            "/api/pdf/delete-pages", files={"file": ("src.pdf", f, "application/pdf")}, data={"pages": "2,4"},
        )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["details"]["page_count"] == 3

    download = _download(client, body["download_url"])
    result = pikepdf.open(io.BytesIO(download.content))
    assert len(result.pages) == 3
    result.close()


def test_delete_pages_rejects_deleting_everything(client, sample_pdf):
    with open(sample_pdf, "rb") as f:
        response = client.post(
            "/api/pdf/delete-pages", files={"file": ("sample.pdf", f, "application/pdf")}, data={"pages": "1-3"},
        )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "PDF_VALIDATION_ERROR"


def test_rotate_pages_all_by_default(client, tmp_path):
    src = make_pdf(tmp_path / "src.pdf", pages=2)
    with open(src, "rb") as f:
        response = client.post(
            "/api/pdf/rotate-pages", files={"file": ("src.pdf", f, "application/pdf")}, data={"angle": "90"},
        )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["details"]["rotated"] == 2

    download = _download(client, body["download_url"])
    result = pikepdf.open(io.BytesIO(download.content))
    assert all(int(page.rotation) == 90 for page in result.pages)
    result.close()


def test_rotate_pages_rejects_non_multiple_of_90(client, sample_pdf):
    with open(sample_pdf, "rb") as f:
        response = client.post(
            "/api/pdf/rotate-pages", files={"file": ("sample.pdf", f, "application/pdf")}, data={"angle": "45"},
        )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "PDF_VALIDATION_ERROR"


def test_split_every_n_returns_zip_of_parts(client, tmp_path):
    src = make_pdf(tmp_path / "src.pdf", pages=5)
    with open(src, "rb") as f:
        response = client.post(
            "/api/pdf/split", files={"file": ("src.pdf", f, "application/pdf")},
            data={"mode": "every_n", "every_n": "2"},
        )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["output_format"] == "zip"
    assert body["details"]["parts"] == 3
    assert body["details"]["pages_per_part"] == [2, 2, 1]

    download = _download(client, body["download_url"])
    assert download.headers["content-type"] == "application/zip"
    zf = zipfile.ZipFile(io.BytesIO(download.content))
    assert len(zf.namelist()) == 3


def test_split_by_ranges_returns_zip_of_parts(client, tmp_path):
    src = make_pdf(tmp_path / "src.pdf", pages=6)
    with open(src, "rb") as f:
        response = client.post(
            "/api/pdf/split", files={"file": ("src.pdf", f, "application/pdf")},
            data={"mode": "ranges", "ranges": "1-2;3-4;5-6"},
        )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["details"]["parts"] == 3
    assert body["details"]["pages_per_part"] == [2, 2, 2]


def test_split_requires_mode_specific_params(client, sample_pdf):
    with open(sample_pdf, "rb") as f:
        response = client.post(
            "/api/pdf/split", files={"file": ("sample.pdf", f, "application/pdf")}, data={"mode": "ranges"},
        )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "PDF_VALIDATION_ERROR"


def test_download_returns_404_for_unknown_operation(client):
    response = client.get("/api/pdf/download/" + "0" * 32)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"
