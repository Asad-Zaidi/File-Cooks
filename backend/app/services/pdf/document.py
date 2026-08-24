"""Shared PDF primitives: safe opening (pikepdf/PyMuPDF), upload validation,
page-count limits, page-selection parsing, output-file persistence, and a
bounded-time execution helper.

Every pikepdf-based PDF service should open files through `open_pikepdf`
rather than calling `pikepdf.open` directly, so error handling and the
password/encryption story stay consistent across the whole module. Services
that need PyMuPDF (rendering, annotations, forms -- see the licensing note in
app/services/pdf/__init__.py) should use `open_pymupdf` the same way.
"""

import asyncio
import json
import re
import zipfile
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

import pikepdf
import pymupdf

from app.core.config import settings
from app.core.exceptions import (
    PDFInvalidError,
    PDFPageNotFoundError,
    PDFPasswordError,
    PDFProcessingError,
    PDFTooManyPagesError,
    PDFValidationError,
)
from app.utils.files import generate_internal_filename, safe_path
from app.utils.mime import sniff_pdf


def validate_upload_is_pdf(head: bytes) -> None:
    """Raise PDFInvalidError if `head` doesn't look like a PDF.

    Never trust the filename/extension -- this checks the actual file
    signature. Not a full validity check on its own; opening the file with
    pikepdf (see `open_pikepdf`) is what actually confirms it parses.
    """
    if not sniff_pdf(head):
        raise PDFInvalidError("The uploaded file is not a PDF (unexpected file signature).")


def enforce_page_limit(page_count: int) -> None:
    if page_count > settings.MAX_PDF_PAGES:
        raise PDFTooManyPagesError(settings.MAX_PDF_PAGES)


@contextmanager
def open_pikepdf(path: Path, password: str | None = None) -> Iterator[pikepdf.Pdf]:
    """Open a PDF with pikepdf, translating its exceptions into our AppError
    hierarchy. Always closes the document on exit.

    Raises:
        PDFPasswordError: a password was supplied but pikepdf rejected it.
        PDFInvalidError: the file doesn't parse as a PDF at all (corrupted /
            malformed / not actually a PDF despite the signature check).
    """
    try:
        pdf = pikepdf.open(str(path), password=password or "")
    except pikepdf.PasswordError:
        raise PDFPasswordError("The supplied password is missing or incorrect.") from None
    except (pikepdf.PdfError, OSError) as exc:
        raise PDFInvalidError(f"The PDF could not be opened: {exc}") from None

    try:
        yield pdf
    finally:
        pdf.close()


def is_encrypted(path: Path) -> bool:
    """Cheap check: does this file require a password to open at all?

    Distinct from `open_pikepdf` failing with PDFPasswordError -- this is
    used for *detection* (e.g. GET info on a protected file the caller has
    no password for), which must not raise.
    """
    try:
        with pikepdf.open(str(path)):
            return False
    except pikepdf.PasswordError:
        return True
    except (pikepdf.PdfError, OSError) as exc:
        raise PDFInvalidError(f"The PDF could not be opened: {exc}") from None


@contextmanager
def open_pymupdf(path: Path, password: str | None = None) -> Iterator["pymupdf.Document"]:
    """Open a PDF with PyMuPDF, translating its exceptions the same way
    `open_pikepdf` does. Used only by services that need PyMuPDF's rendering/
    annotation/text/widget APIs -- see the licensing note in
    app/services/pdf/__init__.py."""
    try:
        doc = pymupdf.open(str(path))
    except Exception as exc:  # noqa: BLE001 -- PyMuPDF raises plain RuntimeError/ValueError
        raise PDFInvalidError(f"The PDF could not be opened: {exc}") from None

    try:
        if doc.needs_pass:
            if not password or not doc.authenticate(password):
                doc.close()
                raise PDFPasswordError("The supplied password is missing or incorrect.")
        yield doc
    finally:
        if not doc.is_closed:
            doc.close()


async def run_with_timeout(func, *args):
    """Run a blocking PDF operation in a worker thread, bounded by
    MAX_PDF_PROCESSING_TIME_SECONDS. Raises PDFProcessingError on timeout."""
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(func, *args), timeout=settings.MAX_PDF_PROCESSING_TIME_SECONDS,
        )
    except asyncio.TimeoutError:
        raise PDFProcessingError("The PDF operation timed out.") from None


# --- page-selection parsing (shared by merge/split/extract/reorder/delete/rotate) ---

def parse_page_selection(spec: str, page_count: int) -> list[int]:
    """Parse a page selection into a 0-based index list, *preserving the
    order and duplicates the caller specified* -- this is what lets a single
    parser back both "extract pages 1-3,5" and "reorder to [3,1,5,2,4]".

    Accepts either:
      * a JSON array of 1-based page numbers, e.g. "[3,1,5,2,4]"
      * a comma-separated range spec, e.g. "1-3,5,8-10"

    Raises PDFValidationError for anything that doesn't parse, and
    PDFPageNotFoundError for any page number outside 1..page_count.
    """
    spec = (spec or "").strip()
    if not spec:
        raise PDFValidationError("A page selection is required.")

    one_based: list[int] = []

    if spec.startswith("["):
        try:
            parsed = json.loads(spec)
        except json.JSONDecodeError:
            raise PDFValidationError(f"Invalid page selection: '{spec}' is not valid JSON.") from None
        if not isinstance(parsed, list) or not all(isinstance(n, int) for n in parsed):
            raise PDFValidationError("Page selection JSON must be an array of integers.")
        one_based = parsed
    else:
        for token in spec.split(","):
            token = token.strip()
            if not token:
                continue
            match = re.fullmatch(r"(\d+)\s*-\s*(\d+)", token)
            if match:
                start, end = int(match.group(1)), int(match.group(2))
                if start > end:
                    raise PDFValidationError(f"Invalid page range '{token}': start must be <= end.")
                one_based.extend(range(start, end + 1))
            elif token.isdigit():
                one_based.append(int(token))
            else:
                raise PDFValidationError(f"Invalid page selection token: '{token}'.")

    if not one_based:
        raise PDFValidationError("Page selection resolved to no pages.")

    zero_based: list[int] = []
    for n in one_based:
        if n < 1 or n > page_count:
            raise PDFPageNotFoundError(f"Page {n} does not exist (document has {page_count} pages).")
        zero_based.append(n - 1)

    return zero_based


def all_pages(page_count: int) -> list[int]:
    return list(range(page_count))


def validate_permutation(indices: list[int], page_count: int) -> None:
    """Raise PDFValidationError unless `indices` is exactly a permutation of
    range(page_count) -- used by reorder, where every original page must
    appear exactly once in the new order."""
    if len(indices) != page_count or sorted(indices) != list(range(page_count)):
        raise PDFValidationError(
            f"Reorder must include every page exactly once (expected {page_count} page numbers)."
        )


# --- output persistence (shared by every operation that produces a file) ---

def save_output(data_writer, extension: str) -> tuple[Path, str]:
    """Allocate a fresh output path under converted/ and call
    `data_writer(path)` to write into it. Returns (path, filename)."""
    filename = generate_internal_filename(extension)
    path = safe_path(settings.converted_path, filename)
    data_writer(path)
    return path, filename


def zip_outputs(paths_and_names: list[tuple[Path, str]]) -> tuple[Path, str]:
    """Zip several output files into one archive under converted/, and
    delete the individual parts afterward (only the zip is kept). Used by
    split operations, which naturally produce more than one PDF."""
    filename = generate_internal_filename("zip")
    zip_path = safe_path(settings.converted_path, filename)

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for part_path, part_name in paths_and_names:
            zf.write(part_path, arcname=part_name)

    for part_path, _part_name in paths_and_names:
        part_path.unlink(missing_ok=True)

    return zip_path, filename
