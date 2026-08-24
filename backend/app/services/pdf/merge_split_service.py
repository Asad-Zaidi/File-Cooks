"""Merge, split, extract, reorder, delete, rotate, and assemble pages.

    Router -> PDFMergeSplitService -> pikepdf -> Output file(s)

All structural, page-level operations -- no rendering needed, so this module
is pikepdf-only (see the licensing note in app/services/pdf/__init__.py).
Direct page-object manipulation is used throughout rather than converting
through images, per the "don't unnecessarily re-render" requirement.
"""

from contextlib import ExitStack
from pathlib import Path

import pikepdf

from app.core.exceptions import PDFPageNotFoundError, PDFValidationError
from app.services.pdf.document import (
    all_pages,
    enforce_page_limit,
    open_pikepdf,
    parse_page_selection,
    save_output,
    validate_permutation,
    zip_outputs,
)


def _build_from_selection(source: pikepdf.Pdf, selection: list[int]) -> pikepdf.Pdf:
    """A new in-memory Pdf containing `source`'s pages at `selection`
    (0-based), in the given order -- duplicates and reordering both allowed.
    `source` must stay open until the result is saved."""
    new_pdf = pikepdf.new()
    for idx in selection:
        new_pdf.pages.append(source.pages[idx])
    return new_pdf


class PDFMergeSplitService:
    # --- merge ---

    def merge(self, paths: list[Path]) -> tuple[Path, str, dict]:
        if len(paths) < 2:
            raise PDFValidationError("At least two PDFs are required to merge.")

        with ExitStack() as stack:
            sources = [stack.enter_context(open_pikepdf(p)) for p in paths]
            total_pages = sum(len(s.pages) for s in sources)
            enforce_page_limit(total_pages)

            merged = pikepdf.new()
            for src in sources:
                merged.pages.extend(src.pages)

            output_path, output_filename = save_output(lambda p: merged.save(str(p)), "pdf")
            merged.close()

        return output_path, output_filename, {"page_count": total_pages, "source_files": len(paths)}

    # --- assemble: the visual page-manager's save action -- reorder, delete,
    # and add-pages-from-another-file all collapse into "here is the exact
    # final page sequence, possibly spanning several uploaded files" ---

    def assemble(self, paths: list[Path], layout: list[tuple[int, int]]) -> tuple[Path, str, dict]:
        if not layout:
            raise PDFValidationError("At least one page is required.")

        with ExitStack() as stack:
            sources = [stack.enter_context(open_pikepdf(p)) for p in paths]
            for src in sources:
                enforce_page_limit(len(src.pages))

            result = pikepdf.new()
            for file_index, page_number in layout:
                if file_index < 0 or file_index >= len(sources):
                    raise PDFValidationError(f"Invalid file_index {file_index} (only {len(sources)} file(s) uploaded).")
                src = sources[file_index]
                if page_number < 1 or page_number > len(src.pages):
                    raise PDFPageNotFoundError(
                        f"Page {page_number} does not exist in file {file_index} ({len(src.pages)} pages)."
                    )
                result.pages.append(src.pages[page_number - 1])

            enforce_page_limit(len(result.pages))
            output_path, output_filename = save_output(lambda p: result.save(str(p)), "pdf")
            result.close()

        return output_path, output_filename, {"page_count": len(layout), "source_files": len(paths)}

    # --- extract / reorder / delete ---

    def extract_pages(self, path: Path, page_spec: str) -> tuple[Path, str, dict]:
        with open_pikepdf(path) as pdf:
            enforce_page_limit(len(pdf.pages))
            selection = parse_page_selection(page_spec, len(pdf.pages))
            result = _build_from_selection(pdf, selection)
            output_path, output_filename = save_output(lambda p: result.save(str(p)), "pdf")
            result.close()

        return output_path, output_filename, {"page_count": len(selection)}

    def reorder_pages(self, path: Path, order_spec: str) -> tuple[Path, str, dict]:
        with open_pikepdf(path) as pdf:
            page_count = len(pdf.pages)
            enforce_page_limit(page_count)
            selection = parse_page_selection(order_spec, page_count)
            validate_permutation(selection, page_count)
            result = _build_from_selection(pdf, selection)
            output_path, output_filename = save_output(lambda p: result.save(str(p)), "pdf")
            result.close()

        return output_path, output_filename, {"page_count": page_count}

    def delete_pages(self, path: Path, page_spec: str) -> tuple[Path, str, dict]:
        with open_pikepdf(path) as pdf:
            page_count = len(pdf.pages)
            enforce_page_limit(page_count)
            to_delete = set(parse_page_selection(page_spec, page_count))
            if len(to_delete) >= page_count:
                raise PDFValidationError("Cannot delete every page -- the result would be an empty PDF.")

            keep = [i for i in all_pages(page_count) if i not in to_delete]
            result = _build_from_selection(pdf, keep)
            output_path, output_filename = save_output(lambda p: result.save(str(p)), "pdf")
            result.close()

        return output_path, output_filename, {"page_count": len(keep), "deleted": len(to_delete)}

    # --- rotate ---

    def rotate_pages(self, path: Path, page_spec: str | None, angle: int) -> tuple[Path, str, dict]:
        if angle % 90 != 0:
            raise PDFValidationError("Rotation angle must be a multiple of 90.")

        with open_pikepdf(path) as pdf:
            page_count = len(pdf.pages)
            enforce_page_limit(page_count)
            selection = parse_page_selection(page_spec, page_count) if page_spec else all_pages(page_count)

            for idx in selection:
                pdf.pages[idx].rotate(angle, relative=True)

            output_path, output_filename = save_output(lambda p: pdf.save(str(p)), "pdf")

        return output_path, output_filename, {"page_count": page_count, "rotated": len(selection)}

    # --- split ---

    def split_by_ranges(self, path: Path, ranges_spec: str) -> tuple[Path, str, dict]:
        groups = [g.strip() for g in ranges_spec.split(";") if g.strip()]
        if not groups:
            raise PDFValidationError("At least one page range group is required to split.")

        with open_pikepdf(path) as pdf:
            page_count = len(pdf.pages)
            enforce_page_limit(page_count)

            parts: list[tuple[Path, str]] = []
            part_page_counts: list[int] = []
            for i, group in enumerate(groups, start=1):
                selection = parse_page_selection(group, page_count)
                result = _build_from_selection(pdf, selection)
                part_filename = f"part-{i}.pdf"
                part_path, _ = save_output(lambda p, r=result: r.save(str(p)), "pdf")
                result.close()
                parts.append((part_path, part_filename))
                part_page_counts.append(len(selection))

        zip_path, zip_filename = zip_outputs(parts)
        return zip_path, zip_filename, {"parts": len(parts), "pages_per_part": part_page_counts}

    def split_every_n(self, path: Path, n: int) -> tuple[Path, str, dict]:
        if n < 1:
            raise PDFValidationError("split every-N pages must be at least 1.")

        with open_pikepdf(path) as pdf:
            page_count = len(pdf.pages)
            enforce_page_limit(page_count)

            parts: list[tuple[Path, str]] = []
            part_page_counts: list[int] = []
            chunks = [all_pages(page_count)[i:i + n] for i in range(0, page_count, n)]
            for i, chunk in enumerate(chunks, start=1):
                result = _build_from_selection(pdf, chunk)
                part_filename = f"part-{i}.pdf"
                part_path, _ = save_output(lambda p, r=result: r.save(str(p)), "pdf")
                result.close()
                parts.append((part_path, part_filename))
                part_page_counts.append(len(chunk))

        zip_path, zip_filename = zip_outputs(parts)
        return zip_path, zip_filename, {"parts": len(parts), "pages_per_part": part_page_counts}


pdf_merge_split_service = PDFMergeSplitService()
