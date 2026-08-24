"""PDF processing services.

    Router -> app/services/pdf/*Service -> pikepdf / PyMuPDF / pyHanko -> Output file

All local, server-side PDF processing lives here. Routers never touch
pikepdf/PyMuPDF/pyHanko directly -- they call into these services.

--------------------------------------------------------------------------
Licensing: PyMuPDF isolation
--------------------------------------------------------------------------
This package deliberately splits work across two PDF libraries with very
different licenses:

  * pikepdf (LGPL-2.1+ / MPL-2.0, permissive enough for closed-source use)
    handles every *structural* operation: reading info/metadata, page
    reordering/deletion/duplication/rotation/cropping, merge/split,
    encryption, docinfo+XMP metadata, and stream/object compression.

  * PyMuPDF (module name `pymupdf`, formerly imported as `fitz` -- both names
    still work, but new code here uses the modern `pymupdf` import) is
    AGPL-3.0 licensed (a commercial license is available from Artifex for
    closed-source distribution). It is used *only* where its rendering/
    annotation/text/widget APIs are genuinely needed and pikepdf has no
    equivalent: page rendering & thumbnails, annotations and redaction, text
    extraction/search with coordinates, embedded image extraction/insertion,
    form widgets, and handwritten-signature-image stamping.

  * pyHanko (MIT) is used exclusively for cryptographic PDF signing and
    signature validation -- never for general PDF editing.

To keep the AGPL surface area small and auditable, `import pymupdf` must
only ever appear inside the specific service modules that document their
need for it (document.py's `open_pymupdf`, edit_service.py, forms_service.py,
and later render/text/image services) -- never in routers, DTOs, or the
pikepdf-only modules such as info_service.py or merge_split_service.py. If
this backend is ever distributed as closed-source software, either those
modules' functionality must be reworked onto a non-AGPL alternative, or a
commercial PyMuPDF license must be purchased; using PyMuPDF under AGPL
requires the whole combined work to be released under AGPL-compatible terms.
"""
