"""PDF API routes, aggregated into a single router.

The PDF module is split across several submodules (one per feature area --
info, pages, editing, ...) since it covers far more ground than audio/video.
`main.py` still only ever does one import and one `app.include_router(...)`
call, exactly like the audio/video routers, no matter how many submodules
this package grows to.
"""

from fastapi import APIRouter

from . import compress, download, edit, forms, info, merge_split, render

router = APIRouter()

for _module in (info, render, merge_split, compress, edit, forms, download):
    router.include_router(_module.router)
