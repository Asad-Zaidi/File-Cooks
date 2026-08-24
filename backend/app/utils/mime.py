"""Lightweight file-signature ("magic bytes") sniffing for video containers
and PDF files.

This is a fast pre-check only -- it never trusts the filename extension, but
it also isn't the authoritative validator: for video, FFprobe (see
app/services/video_metadata.py) decides whether a file contains usable media
streams; for PDF, app/services/pdf/document.py actually opens the file with
pikepdf. This module exists to (a) reject obviously wrong uploads before
spending real processing on them, and (b) pick a correct Content-Type for
downloads.
"""

from pathlib import Path

_SIGNATURES: tuple[tuple[str, int, bytes], ...] = (
    # (container_key, offset, signature bytes)
    ("mp4", 4, b"ftyp"),
    ("mov", 4, b"ftypqt"),
    ("avi", 0, b"RIFF"),
    ("webm", 0, b"\x1a\x45\xdf\xa3"),
    ("mkv", 0, b"\x1a\x45\xdf\xa3"),  # WebM and Matroska share the EBML header
    ("flv", 0, b"FLV"),
    ("mpegts", 0, b"\x47"),
)

# PDF files start with "%PDF-" (optionally preceded by a few bytes of junk some
# generators prepend, but we only accept the strict/common case here).
PDF_SIGNATURE = b"%PDF-"


def sniff_container(head: bytes) -> str | None:
    """Best-effort container key guessed from the first bytes of a file.

    Returns None (not necessarily invalid -- just inconclusive) rather than
    raising; callers should fall back to ffprobe for the real answer.
    """
    if not head:
        return None

    for key, offset, signature in _SIGNATURES:
        end = offset + len(signature)
        if len(head) >= end and head[offset:end] == signature:
            return key

    return None


def sniff_pdf(head: bytes) -> bool:
    """True if `head` starts with the PDF file signature ("%PDF-").

    Like `sniff_container`, this is a fast pre-check only -- it never trusts
    the filename extension, but it isn't the authoritative validator either:
    a file can start with "%PDF-" and still be structurally malformed. See
    app/services/pdf/document.py, which actually opens the file to confirm it
    parses.
    """
    return head.startswith(PDF_SIGNATURE)


def read_file_head(path: Path, n: int = 32) -> bytes:
    try:
        with open(path, "rb") as f:
            return f.read(n)
    except OSError:
        return b""
