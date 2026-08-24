"""PDF interactive form (AcroForm) fields: detect, list, fill, export, flatten.

    Router -> PDFFormsService -> PyMuPDF (widget API) -> Output file

PyMuPDF's widget API is used here because it round-trips text/checkbox/
radio/dropdown fields far more directly than raw pikepdf dictionary access
-- see the licensing note in app/services/pdf/__init__.py. Filling never
destroys the interactive fields unless `flatten=True` is explicitly
requested (spec requirement: don't flatten implicitly).
"""

from pathlib import Path
from typing import Any

import pymupdf

from app.core.exceptions import PDFFormError
from app.dto.pdf import PDFFormFieldInfo
from app.services.pdf.document import enforce_page_limit, open_pymupdf, save_output

# Bit flags on /Ff -- see PDF spec table 226. Bit 2 (value 2) is "Required".
_REQUIRED_FLAG = 1 << 1


def _field_info(page_index: int, widget: "pymupdf.Widget") -> PDFFormFieldInfo:
    return PDFFormFieldInfo(
        name=widget.field_name or "",
        type=widget.field_type_string or "Unknown",
        page=page_index + 1,
        rect=list(widget.rect),
        value=widget.field_value,
        options=list(widget.choice_values) if widget.choice_values else None,
        is_required=bool((widget.field_flags or 0) & _REQUIRED_FLAG),
    )


def _iter_widgets(doc: "pymupdf.Document"):
    for page_index in range(doc.page_count):
        page = doc[page_index]
        for widget in page.widgets() or []:
            yield page_index, widget


class PDFFormsService:
    def list_fields(self, path: Path) -> list[PDFFormFieldInfo]:
        with open_pymupdf(path) as doc:
            enforce_page_limit(doc.page_count)
            return [_field_info(page_index, widget) for page_index, widget in _iter_widgets(doc)]

    def export_values(self, path: Path) -> dict[str, Any]:
        with open_pymupdf(path) as doc:
            enforce_page_limit(doc.page_count)
            return {widget.field_name: widget.field_value for _page_index, widget in _iter_widgets(doc)}

    def fill(self, path: Path, values: dict[str, Any], flatten: bool) -> tuple[Path, str, dict]:
        if not values:
            raise PDFFormError("At least one field value is required to fill a form.")

        with open_pymupdf(path) as doc:
            enforce_page_limit(doc.page_count)

            all_names = {widget.field_name for _page_index, widget in _iter_widgets(doc)}
            unknown = set(values) - all_names
            if unknown:
                raise PDFFormError(f"Unknown form field(s): {', '.join(sorted(unknown))}")
            if not all_names:
                raise PDFFormError("This PDF has no fillable form fields.")

            filled = 0
            for _page_index, widget in _iter_widgets(doc):
                if widget.field_name not in values:
                    continue
                widget.field_value = values[widget.field_name]
                widget.update()
                filled += 1

            if flatten:
                doc.bake(annots=False, widgets=True)

            output_path, output_filename = save_output(lambda p: doc.save(str(p)), "pdf")

        return output_path, output_filename, {"fields_filled": filled, "flattened": flatten}


pdf_forms_service = PDFFormsService()
