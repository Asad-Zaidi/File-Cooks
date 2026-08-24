"""PDF editing: drawings, markup annotations, and redaction.

    Router -> PDFEditService -> PyMuPDF -> Output file

Uses PyMuPDF ("pymupdf") for its annotation/drawing/redaction API, which
pikepdf has no equivalent for -- see the licensing note in
app/services/pdf/__init__.py. All operations in one `annotate()` call are
applied to a single open document and saved once, rather than round-tripping
through a save/reopen per annotation.

Two different things are both called "annotations" by users but are
different PDF constructs here:
  * "Drawings" (rectangle/line/circle/freehand) are burned directly into the
    page's content stream via PyMuPDF's `draw_*` methods -- permanent ink,
    not a removable object.
  * "Markup annotations" (highlight/underline/strikeout/squiggly/note/
    redaction) are real PDF annotation objects, removable/editable later,
    created via `add_*_annot`.
"""

from pathlib import Path

import pymupdf

from app.core.exceptions import PDFValidationError
from app.dto.pdf import AnnotationOp, PDFAnnotationInfo
from app.services.pdf.document import all_pages, enforce_page_limit, open_pymupdf, parse_page_selection, save_output

_DEFAULT_COLOR = (0, 0, 0)
_DEFAULT_HIGHLIGHT = (1, 1, 0)
_DEFAULT_FILL_ALPHA_NOTE = "Comment"


def _hex_to_rgb(value: str | None) -> tuple[float, float, float] | None:
    if not value:
        return None
    value = value.lstrip("#")
    if len(value) != 6:
        raise PDFValidationError(f"Invalid color '{value}' -- expected a 6-digit hex string like 'FF8800'.")
    try:
        r, g, b = (int(value[i:i + 2], 16) / 255 for i in (0, 2, 4))
    except ValueError:
        raise PDFValidationError(f"Invalid color '{value}' -- expected a 6-digit hex string like 'FF8800'.") from None
    return (r, g, b)


def _rect_from_op(op: AnnotationOp) -> "pymupdf.Rect":
    if op.x is None or op.y is None or op.width is None or op.height is None:
        raise PDFValidationError(f"Annotation type '{op.type}' requires x, y, width, and height.")
    return pymupdf.Rect(op.x, op.y, op.x + op.width, op.y + op.height)


class PDFEditService:
    def annotate(self, path: Path, ops: list[AnnotationOp], apply_redactions: bool) -> tuple[Path, str, dict]:
        if not ops:
            raise PDFValidationError("At least one annotation operation is required.")

        with open_pymupdf(path) as doc:
            enforce_page_limit(doc.page_count)

            pages_with_redactions: set[int] = set()
            applied = 0
            for op in ops:
                page_index = op.page - 1
                if page_index < 0 or page_index >= doc.page_count:
                    raise PDFValidationError(f"Page {op.page} does not exist (document has {doc.page_count} pages).")
                page = doc[page_index]
                self._apply_one(page, op)
                applied += 1
                if op.type == "redaction":
                    pages_with_redactions.add(page_index)

            if apply_redactions:
                for page_index in pages_with_redactions:
                    doc[page_index].apply_redactions()

            output_path, output_filename = save_output(lambda p: doc.save(str(p)), "pdf")

        return output_path, output_filename, {
            "annotations_applied": applied,
            "redactions_burned_in": apply_redactions and bool(pages_with_redactions),
        }

    def remove_annotations(self, path: Path, page_spec: str | None) -> tuple[Path, str, dict]:
        with open_pymupdf(path) as doc:
            enforce_page_limit(doc.page_count)
            selection = parse_page_selection(page_spec, doc.page_count) if page_spec else all_pages(doc.page_count)

            removed = 0
            for idx in selection:
                page = doc[idx]
                for annot in list(page.annots() or []):
                    page.delete_annot(annot)
                    removed += 1

            output_path, output_filename = save_output(lambda p: doc.save(str(p)), "pdf")

        return output_path, output_filename, {"annotations_removed": removed}

    def extract_annotations(self, path: Path) -> list[PDFAnnotationInfo]:
        with open_pymupdf(path) as doc:
            enforce_page_limit(doc.page_count)
            results: list[PDFAnnotationInfo] = []
            for page_index in range(doc.page_count):
                page = doc[page_index]
                for annot in page.annots() or []:
                    info = annot.info or {}
                    results.append(PDFAnnotationInfo(
                        page=page_index + 1,
                        type=annot.type[1] if annot.type else "Unknown",
                        rect=list(annot.rect),
                        content=info.get("content") or None,
                        author=info.get("title") or None,
                    ))
            return results

    # --- internals ---

    def _apply_one(self, page: "pymupdf.Page", op: AnnotationOp) -> None:
        color = _hex_to_rgb(op.color)
        fill = _hex_to_rgb(op.fill_color)
        opacity = op.opacity
        line_width = op.line_width or 1.5

        if op.type == "text":
            if not op.text:
                raise PDFValidationError("Annotation type 'text' requires `text`.")
            if op.x is None or op.y is None:
                raise PDFValidationError("Annotation type 'text' requires x and y.")
            page.insert_text(
                (op.x, op.y), op.text, fontsize=op.font_size or 12, fontname=_font_alias(op.font),
                color=color or _DEFAULT_COLOR, rotate=op.rotation or 0,
                stroke_opacity=opacity if opacity is not None else 1, fill_opacity=opacity if opacity is not None else 1,
            )

        elif op.type == "rectangle":
            rect = _rect_from_op(op)
            page.draw_rect(
                rect, color=color or _DEFAULT_COLOR, fill=fill, width=line_width,
                stroke_opacity=opacity if opacity is not None else 1, fill_opacity=opacity if opacity is not None else 1,
            )

        elif op.type == "circle":
            rect = _rect_from_op(op)
            center = ((rect.x0 + rect.x1) / 2, (rect.y0 + rect.y1) / 2)
            radius = min(rect.width, rect.height) / 2
            page.draw_circle(
                center, radius, color=color or _DEFAULT_COLOR, fill=fill, width=line_width,
                stroke_opacity=opacity if opacity is not None else 1, fill_opacity=opacity if opacity is not None else 1,
            )

        elif op.type == "line":
            if None in (op.x, op.y, op.x2, op.y2):
                raise PDFValidationError("Annotation type 'line' requires x, y, x2, and y2.")
            page.draw_line(
                (op.x, op.y), (op.x2, op.y2), color=color or _DEFAULT_COLOR, width=line_width,
                stroke_opacity=opacity if opacity is not None else 1,
            )

        elif op.type in ("highlight", "underline", "strikeout", "squiggly"):
            rect = _rect_from_op(op)
            add_fn = {
                "highlight": page.add_highlight_annot,
                "underline": page.add_underline_annot,
                "strikeout": page.add_strikeout_annot,
                "squiggly": page.add_squiggly_annot,
            }[op.type]
            annot = add_fn(quads=rect)
            stroke = color or (_DEFAULT_HIGHLIGHT if op.type == "highlight" else _DEFAULT_COLOR)
            annot.set_colors(stroke=stroke)
            annot.update(opacity=opacity if opacity is not None else (0.4 if op.type == "highlight" else 1))

        elif op.type == "note":
            if op.x is None or op.y is None:
                raise PDFValidationError("Annotation type 'note' requires x and y.")
            annot = page.add_text_annot((op.x, op.y), op.text or "")
            if opacity is not None:
                annot.set_opacity(opacity)
                annot.update()

        elif op.type == "redaction":
            rect = _rect_from_op(op)
            page.add_redact_annot(rect, text=op.text or "", fill=fill or (0, 0, 0))

        else:
            raise PDFValidationError(f"Unsupported annotation type '{op.type}'.")


def _font_alias(font: str | None) -> str:
    """Map a friendly font name to one of PyMuPDF's built-in base-14 fonts.
    Falls back to Helvetica for anything unrecognized -- embedding arbitrary
    fonts is out of scope for this pass."""
    if not font:
        return "helv"
    key = font.strip().lower()
    return {
        "helvetica": "helv", "helv": "helv", "sans": "helv",
        "times": "tiro", "times new roman": "tiro", "serif": "tiro", "tiro": "tiro",
        "courier": "cour", "monospace": "cour", "cour": "cour",
    }.get(key, "helv")


pdf_edit_service = PDFEditService()
