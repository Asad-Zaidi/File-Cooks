"""Lightweight file-signature ("magic bytes") sniffing for video containers.

This is a fast pre-check only -- it never trusts the filename extension, but
it also isn't the authoritative validator: FFprobe (see
app/services/video_metadata.py) is what actually decides whether a file
contains usable media streams. This module exists to (a) reject obviously
wrong uploads before spending a subprocess call on them, and (b) pick a
correct Content-Type for downloads.
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


def read_file_head(path: Path, n: int = 32) -> bytes:
    try:
        with open(path, "rb") as f:
            return f.read(n)
    except OSError:
        return b""
