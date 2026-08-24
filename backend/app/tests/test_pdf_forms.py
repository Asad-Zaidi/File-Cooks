import json

import pymupdf

from app.tests.conftest import make_pdf, make_pdf_with_form


def test_list_fields_detects_text_and_checkbox(client, tmp_path):
    src = make_pdf_with_form(tmp_path / "form.pdf")
    with open(src, "rb") as f:
        response = client.post("/api/pdf/forms/fields", files={"file": ("form.pdf", f, "application/pdf")})
    assert response.status_code == 200, response.text
    fields = {f["name"]: f for f in response.json()["fields"]}
    assert fields["full_name"]["type"] == "Text"
    assert fields["agree"]["type"] == "CheckBox"


def test_list_fields_empty_for_pdf_without_forms(client, sample_pdf):
    with open(sample_pdf, "rb") as f:
        response = client.post("/api/pdf/forms/fields", files={"file": ("sample.pdf", f, "application/pdf")})
    assert response.status_code == 200, response.text
    assert response.json()["fields"] == []


def test_fill_form_sets_text_and_checkbox_values(client, tmp_path):
    src = make_pdf_with_form(tmp_path / "form.pdf")
    with open(src, "rb") as f:
        response = client.post(
            "/api/pdf/forms/fill",
            files={"file": ("form.pdf", f, "application/pdf")},
            data={"values": json.dumps({"full_name": "Ada Lovelace", "agree": True})},
        )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["details"]["fields_filled"] == 2
    assert body["details"]["flattened"] is False

    download = client.get(body["download_url"])
    doc = pymupdf.open(stream=download.content, filetype="pdf")
    widgets = {w.field_name: w.field_value for w in doc[0].widgets()}
    assert widgets["full_name"] == "Ada Lovelace"
    assert widgets["agree"] == "Yes"
    doc.close()


def test_fill_form_and_flatten_removes_widgets(client, tmp_path):
    src = make_pdf_with_form(tmp_path / "form.pdf")
    with open(src, "rb") as f:
        response = client.post(
            "/api/pdf/forms/fill",
            files={"file": ("form.pdf", f, "application/pdf")},
            data={"values": json.dumps({"full_name": "Flattened"}), "flatten": "true"},
        )
    assert response.status_code == 200, response.text
    assert response.json()["details"]["flattened"] is True

    download = client.get(response.json()["download_url"])
    doc = pymupdf.open(stream=download.content, filetype="pdf")
    assert list(doc[0].widgets()) == []
    doc.close()


def test_fill_form_rejects_unknown_field(client, tmp_path):
    src = make_pdf_with_form(tmp_path / "form.pdf")
    with open(src, "rb") as f:
        response = client.post(
            "/api/pdf/forms/fill",
            files={"file": ("form.pdf", f, "application/pdf")},
            data={"values": json.dumps({"nonexistent_field": "x"})},
        )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "PDF_FORM_ERROR"


def test_fill_form_rejects_pdf_without_any_fields(client, sample_pdf):
    with open(sample_pdf, "rb") as f:
        response = client.post(
            "/api/pdf/forms/fill",
            files={"file": ("sample.pdf", f, "application/pdf")},
            data={"values": json.dumps({"anything": "x"})},
        )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "PDF_FORM_ERROR"


def test_export_form_values(client, tmp_path):
    src = make_pdf_with_form(tmp_path / "form.pdf")
    with open(src, "rb") as f:
        response = client.post("/api/pdf/forms/export", files={"file": ("form.pdf", f, "application/pdf")})
    assert response.status_code == 200, response.text
    assert response.json()["values"] == {"full_name": "", "agree": "Off"}
