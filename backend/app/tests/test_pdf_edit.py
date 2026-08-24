import io
import json

import pymupdf

from app.tests.conftest import make_pdf


def _annotate(client, src, ops, apply_redactions=False):
    with open(src, "rb") as f:
        return client.post(
            "/api/pdf/annotate",
            files={"file": (src.name, f, "application/pdf")},
            data={"annotations": json.dumps(ops), "apply_redactions": str(apply_redactions).lower()},
        )


def test_annotate_applies_multiple_ops_in_one_pass(client, tmp_path):
    src = make_pdf(tmp_path / "src.pdf", pages=1)
    ops = [
        {"type": "text", "page": 1, "x": 20, "y": 30, "text": "Hello", "font_size": 14, "color": "#FF0000"},
        {"type": "rectangle", "page": 1, "x": 10, "y": 10, "width": 50, "height": 20, "color": "#000000"},
        {"type": "highlight", "page": 1, "x": 5, "y": 5, "width": 40, "height": 15},
    ]
    response = _annotate(client, src, ops)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["details"]["annotations_applied"] == 3

    download = client.get(body["download_url"])
    assert download.status_code == 200
    doc = pymupdf.open(stream=download.content, filetype="pdf")
    page = doc[0]
    # the rectangle+text are burned into content; the highlight is a real annot
    assert len(list(page.annots() or [])) == 1
    doc.close()


def test_annotate_rejects_unknown_page(client, sample_pdf):
    ops = [{"type": "text", "page": 99, "x": 0, "y": 0, "text": "hi"}]
    response = _annotate(client, sample_pdf, ops)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "PDF_VALIDATION_ERROR"


def test_annotate_rejects_missing_required_fields(client, sample_pdf):
    ops = [{"type": "rectangle", "page": 1}]  # missing x/y/width/height
    response = _annotate(client, sample_pdf, ops)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "PDF_VALIDATION_ERROR"


def test_annotate_rejects_empty_ops_list(client, sample_pdf):
    response = _annotate(client, sample_pdf, [])
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "PDF_VALIDATION_ERROR"


def test_annotate_rejects_invalid_color(client, sample_pdf):
    ops = [{"type": "rectangle", "page": 1, "x": 0, "y": 0, "width": 10, "height": 10, "color": "not-a-color"}]
    response = _annotate(client, sample_pdf, ops)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "PDF_VALIDATION_ERROR"


def test_redaction_apply_removes_underlying_content(client, tmp_path):
    doc = pymupdf.open()
    page = doc.new_page(width=200, height=200)
    page.insert_text((20, 100), "SECRET TEXT", fontsize=16)
    src = tmp_path / "secret.pdf"
    doc.save(str(src))
    doc.close()

    ops = [{"type": "redaction", "page": 1, "x": 10, "y": 85, "width": 150, "height": 25}]
    response = _annotate(client, src, ops, apply_redactions=True)
    assert response.status_code == 200, response.text

    download = client.get(response.json()["download_url"])
    result_doc = pymupdf.open(stream=download.content, filetype="pdf")
    remaining_text = result_doc[0].get_text()
    result_doc.close()
    assert "SECRET" not in remaining_text


def test_extract_annotations_lists_added_annotations(client, tmp_path):
    src = make_pdf(tmp_path / "src.pdf", pages=1)
    ops = [{"type": "note", "page": 1, "x": 10, "y": 10, "text": "a comment"}]
    add_response = _annotate(client, src, ops)
    assert add_response.status_code == 200, add_response.text

    download = client.get(add_response.json()["download_url"])
    annotated_path = tmp_path / "annotated.pdf"
    annotated_path.write_bytes(download.content)

    with open(annotated_path, "rb") as f:
        response = client.post("/api/pdf/extract-annotations", files={"file": ("annotated.pdf", f, "application/pdf")})
    assert response.status_code == 200, response.text
    body = response.json()
    assert len(body["annotations"]) == 1
    assert body["annotations"][0]["content"] == "a comment"


def test_remove_annotations_clears_all_by_default(client, tmp_path):
    src = make_pdf(tmp_path / "src.pdf", pages=1)
    ops = [{"type": "highlight", "page": 1, "x": 5, "y": 5, "width": 40, "height": 15}]
    add_response = _annotate(client, src, ops)
    download = client.get(add_response.json()["download_url"])
    annotated_path = tmp_path / "annotated.pdf"
    annotated_path.write_bytes(download.content)

    with open(annotated_path, "rb") as f:
        response = client.post("/api/pdf/remove-annotations", files={"file": ("annotated.pdf", f, "application/pdf")})
    assert response.status_code == 200, response.text
    assert response.json()["details"]["annotations_removed"] == 1

    download2 = client.get(response.json()["download_url"])
    doc = pymupdf.open(stream=download2.content, filetype="pdf")
    assert len(list(doc[0].annots() or [])) == 0
    doc.close()
