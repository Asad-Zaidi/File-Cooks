"""PDF information / metadata / validation service.

    Router -> PDFInfoService -> pikepdf -> structured dict

Read-only inspection only -- no output file is produced, so callers don't
need timeout-wrapped writes the way conversions do (though the caller-facing
`inspect`/`validate` calls are still run under `run_with_timeout` for very
large/pathological documents). pikepdf only: nothing here needs rendering,
so this module deliberately has zero PyMuPDF ("fitz") dependency -- see the
licensing note in app/services/pdf/__init__.py.
"""

import re
from pathlib import Path

import pikepdf

from app.core.exceptions import PDFPasswordError
from app.services.pdf.document import enforce_page_limit, open_pikepdf

_SIG_NAME = pikepdf.Name("/Sig")
_HEAD_VERSION_RE = re.compile(rb"%PDF-(\d\.\d)")


def _sniff_version_from_head(path: Path) -> str | None:
    """Best-effort PDF version straight from the file header -- used only
    when the document is encrypted and we can't open it to ask pikepdf."""
    try:
        with open(path, "rb") as f:
            head = f.read(16)
    except OSError:
        return None
    match = _HEAD_VERSION_RE.match(head)
    return match.group(1).decode("ascii") if match else None


def _docinfo_str(docinfo, key: str) -> str | None:
    value = docinfo.get(key) if docinfo is not None else None
    return str(value) if value is not None else None


def _page_dict(page) -> dict:
    box = page.mediabox
    width = float(box[2]) - float(box[0])
    height = float(box[3]) - float(box[1])
    return {"width": round(width, 2), "height": round(height, 2), "rotation": int(page.rotation)}


def _has_annotations(pdf: pikepdf.Pdf) -> bool:
    return any("/Annots" in page.obj and len(page.obj["/Annots"]) > 0 for page in pdf.pages)


def _acroform_fields(pdf: pikepdf.Pdf):
    root = pdf.Root
    if "/AcroForm" not in root:
        return None
    acroform = root["/AcroForm"]
    return acroform.get("/Fields") if "/Fields" in acroform else None


def _has_signatures(fields) -> bool:
    if not fields:
        return False
    return any(field.get("/FT") == _SIG_NAME for field in fields)


class PDFInfoService:
    def inspect(self, path: Path, password: str | None = None) -> dict:
        """Full structured info: metadata, page count/dimensions/rotation,
        encryption/form/annotation/signature detection, file size.

        If the document is encrypted and no password was supplied, this is
        *not* an error -- it returns a minimal result with `encrypted=True`
        so detection works without content access. A password that was
        supplied and is wrong still raises PDFPasswordError.
        """
        try:
            with open_pikepdf(path, password) as pdf:
                return self._full_inspect(pdf, path, password_supplied=bool(password))
        except PDFPasswordError:
            if password:
                raise
            return self._minimal_encrypted_result(path)

    def validate(self, path: Path, password: str | None = None) -> dict:
        """Lightweight validity check: does this open as a PDF at all?"""
        try:
            with open_pikepdf(path, password) as pdf:
                return {
                    "valid": True,
                    "is_pdf": True,
                    "encrypted": pdf.is_encrypted,
                    "page_count": len(pdf.pages),
                    "malformed_reason": None,
                }
        except PDFPasswordError:
            return {
                "valid": True,
                "is_pdf": True,
                "encrypted": True,
                "page_count": None,
                "malformed_reason": None,
            }
        except Exception as exc:  # noqa: BLE001 -- surfaced as a field, not raised
            return {
                "valid": False,
                "is_pdf": True,  # the caller already confirmed the "%PDF-" signature
                "encrypted": False,
                "page_count": None,
                "malformed_reason": str(getattr(exc, "message", exc)),
            }

    def metadata(self, path: Path, password: str | None = None) -> dict:
        """The read-only metadata subset of `inspect()` (spec section 12)."""
        full = self.inspect(path, password)
        return {
            "title": full["title"],
            "author": full["author"],
            "subject": full["subject"],
            "keywords": full["keywords"],
            "creator": full["creator"],
            "producer": full["producer"],
            "creation_date": full["creation_date"],
            "mod_date": full["mod_date"],
            "pdf_version": full["pdf_version"],
            "encrypted": full["encrypted"],
        }

    # --- internals ---

    @staticmethod
    def _full_inspect(pdf: pikepdf.Pdf, path: Path, password_supplied: bool) -> dict:
        page_count = len(pdf.pages)
        enforce_page_limit(page_count)

        docinfo = pdf.docinfo
        fields = _acroform_fields(pdf)
        encrypted = pdf.is_encrypted

        return {
            "page_count": page_count,
            "pdf_version": pdf.pdf_version,
            "file_size": path.stat().st_size,
            "title": _docinfo_str(docinfo, "/Title"),
            "author": _docinfo_str(docinfo, "/Author"),
            "subject": _docinfo_str(docinfo, "/Subject"),
            "keywords": _docinfo_str(docinfo, "/Keywords"),
            "creator": _docinfo_str(docinfo, "/Creator"),
            "producer": _docinfo_str(docinfo, "/Producer"),
            "creation_date": _docinfo_str(docinfo, "/CreationDate"),
            "mod_date": _docinfo_str(docinfo, "/ModDate"),
            "encrypted": encrypted,
            "password_protected": encrypted and password_supplied,
            "has_forms": bool(fields),
            "has_annotations": _has_annotations(pdf),
            "has_signatures": _has_signatures(fields),
            "pages": [_page_dict(page) for page in pdf.pages],
        }

    @staticmethod
    def _minimal_encrypted_result(path: Path) -> dict:
        return {
            "page_count": None,
            "pdf_version": _sniff_version_from_head(path),
            "file_size": path.stat().st_size,
            "title": None,
            "author": None,
            "subject": None,
            "keywords": None,
            "creator": None,
            "producer": None,
            "creation_date": None,
            "mod_date": None,
            "encrypted": True,
            "password_protected": True,
            "has_forms": None,
            "has_annotations": None,
            "has_signatures": None,
            "pages": [],
        }


pdf_info_service = PDFInfoService()
