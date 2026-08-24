"""Page rendering / thumbnails.

    Router -> PDFRenderService -> PyMuPDF -> base64 PNG thumbnails

PyMuPDF is used here because pikepdf has no rasterization capability at all
-- see the licensing note in app/services/pdf/__init__.py. Thumbnails are
rendered directly from the page's own size (no unnecessary re-rendering at
higher-than-needed resolution) and returned inline as base64 PNG so the
frontend's visual page manager can display them without a second round-trip
per page.
"""

import base64
from pathlib import Path

import pymupdf

from app.core.config import settings
from app.services.pdf.document import enforce_page_limit, open_pymupdf

DEFAULT_THUMBNAIL_WIDTH = 220
_MIN_WIDTH = 40
_MAX_WIDTH = 800


class PDFRenderService:
    def thumbnails(self, path: Path, max_width: int = DEFAULT_THUMBNAIL_WIDTH) -> list[dict]:
        width_target = max(_MIN_WIDTH, min(max_width or DEFAULT_THUMBNAIL_WIDTH, _MAX_WIDTH))

        with open_pymupdf(path) as doc:
            enforce_page_limit(doc.page_count)

            results = []
            for index in range(doc.page_count):
                page = doc[index]
                page_width_pt = page.rect.width or 1
                dpi = int(72 * (width_target / page_width_pt))
                dpi = max(24, min(dpi, settings.MAX_RENDER_DPI))

                pixmap = page.get_pixmap(dpi=dpi)
                if pixmap.width * pixmap.height > settings.MAX_IMAGE_PIXELS:
                    # Pathologically tall/narrow page -- fall back to a safe fixed DPI.
                    pixmap = page.get_pixmap(dpi=72)

                results.append({
                    "page": index + 1,
                    "width": pixmap.width,
                    "height": pixmap.height,
                    "rotation": int(page.rotation),
                    "image_base64": base64.b64encode(pixmap.tobytes("png")).decode("ascii"),
                })

            return results


pdf_render_service = PDFRenderService()
