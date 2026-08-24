"""PDF compression / optimization.

    Router -> PDFCompressService -> pikepdf (streams/objects) + Pillow (images) -> Output file

pikepdf handles structural/stream optimization (always applied, lossless);
Pillow handles the optional image downsampling/recompression step. PyMuPDF
is not used here -- pikepdf's own image XObject access is sufficient and
keeps this module on the non-AGPL side of the licensing split (see
app/services/pdf/__init__.py).

Compression is *not* unconditional: "low" mode only touches PDF-level
streams/objects (safe, always-lossless for content), never re-encoding
images. Only "balanced"/"high"/"custom" recompress images, and only when
doing so is actually smaller than the original.
"""

import io
from pathlib import Path

import pikepdf
from PIL import Image

from app.core.exceptions import PDFProcessingError, PDFValidationError
from app.services.pdf.document import enforce_page_limit, open_pikepdf, save_output

CompressionMode = str  # "low" | "balanced" | "high" | "custom"

_MODE_PRESETS = {
    # mode: (jpeg_quality, max_dimension_px or None to skip downsampling)
    "low": None,  # streams/objects only, no image recompression
    "balanced": (75, 1600),
    "high": (50, 1200),
}


def _iter_unique_image_objects(pdf: pikepdf.Pdf):
    """Yield each distinct image XObject in the document once, even if the
    same image is referenced from multiple pages."""
    seen: set[tuple[int, int]] = set()
    for page in pdf.pages:
        for _name, obj in page.get_images(recursive=True).items():
            key = obj.objgen
            if key in seen:
                continue
            seen.add(key)
            yield obj


def _recompress_image(obj: pikepdf.Object, quality: int, max_dimension: int | None) -> bool:
    """Try to recompress one image XObject as JPEG. Returns True if it was
    changed (i.e. the new encoding was actually smaller). Never raises --
    an image this can't safely handle (unusual colorspace, corrupt stream,
    etc.) is just left untouched."""
    try:
        pdf_image = pikepdf.PdfImage(obj)
        original_len = obj.get("/Length", 0)
        pil_image = pdf_image.as_pil_image()
    except Exception:
        return False

    try:
        if pil_image.mode in ("RGBA", "P", "LA"):
            pil_image = pil_image.convert("RGB")
        elif pil_image.mode not in ("RGB", "L", "CMYK"):
            pil_image = pil_image.convert("RGB")

        if max_dimension:
            w, h = pil_image.size
            scale = min(1.0, max_dimension / max(w, h))
            if scale < 1.0:
                pil_image = pil_image.resize((max(1, int(w * scale)), max(1, int(h * scale))))

        buf = io.BytesIO()
        pil_image.save(buf, format="JPEG", quality=quality, optimize=True)
        new_data = buf.getvalue()

        if len(new_data) >= original_len:
            return False  # recompressing made it bigger -- keep the original

        colorspace = pikepdf.Name("/DeviceCMYK") if pil_image.mode == "CMYK" else (
            pikepdf.Name("/DeviceGray") if pil_image.mode == "L" else pikepdf.Name("/DeviceRGB")
        )
        obj.write(new_data, filter=pikepdf.Name("/DCTDecode"))
        obj["/Width"] = pil_image.width
        obj["/Height"] = pil_image.height
        obj["/ColorSpace"] = colorspace
        obj["/BitsPerComponent"] = 8
        return True
    except Exception:
        return False


class PDFCompressService:
    def compress(
        self, path: Path, mode: CompressionMode, quality: int | None = None, max_dimension: int | None = None,
    ) -> tuple[Path, str, dict]:
        original_size = path.stat().st_size

        if mode == "custom":
            if quality is None:
                raise PDFValidationError("`quality` is required for custom compression mode.")
            if not (1 <= quality <= 95):
                raise PDFValidationError("`quality` must be between 1 and 95.")
            preset = (quality, max_dimension)
        elif mode in _MODE_PRESETS:
            preset = _MODE_PRESETS[mode]
        else:
            raise PDFValidationError(f"Unknown compression mode '{mode}'. Use low, balanced, high, or custom.")

        with open_pikepdf(path) as pdf:
            enforce_page_limit(len(pdf.pages))

            images_recompressed = 0
            if preset is not None:
                jpeg_quality, dim_cap = preset
                for obj in _iter_unique_image_objects(pdf):
                    if _recompress_image(obj, jpeg_quality, dim_cap):
                        images_recompressed += 1

            def write(out_path: Path):
                try:
                    pdf.save(
                        str(out_path),
                        compress_streams=True,
                        object_stream_mode=pikepdf.ObjectStreamMode.generate,
                    )
                except pikepdf.PdfError as exc:
                    raise PDFProcessingError(f"Compression failed while saving: {exc}") from None

            output_path, output_filename = save_output(write, "pdf")

        final_size = output_path.stat().st_size
        bytes_saved = max(0, original_size - final_size)
        ratio = round(bytes_saved / original_size, 4) if original_size else 0.0

        return output_path, output_filename, {
            "mode": mode,
            "original_size": original_size,
            "final_size": final_size,
            "bytes_saved": bytes_saved,
            "compression_ratio": ratio,
            "images_recompressed": images_recompressed,
        }


pdf_compress_service = PDFCompressService()
