"""FileCooks API entrypoint.

Run:  python -m uvicorn main:app --reload --port 5000
Docs: http://localhost:5000/docs

No business logic lives here — this file wires the app together (routers,
CORS, error handling, startup/shutdown) and nothing else.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.exceptions import AppError
from app.core.formats import list_input_formats, list_output_formats
from app.core.logging import configure_logging, get_logger
from app.db.session import check_mongodb_status, close_mongodb_connection, connect_to_mongodb
from app.routers import audio
from app.utils.ffmpeg import check_ffmpeg, check_ffprobe

configure_logging()
logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    settings.ensure_directories()
    await connect_to_mongodb()
    logger.info("%s v%s starting up", settings.APP_NAME, settings.APP_VERSION)

    yield

    # Shutdown
    await close_mongodb_connection()
    logger.info("Shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    logger.warning("%s %s -> %s: %s", request.method, request.url.path, exc.code, exc.message)
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": {"code": exc.code, "message": exc.message}},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    message = str(exc) if settings.DEBUG else "An unexpected error occurred."
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": {"code": "INTERNAL_ERROR", "message": message}},
    )


app.include_router(audio.router)


@app.get("/", tags=["System"], summary="API info")
async def root():
    return {
        "message": f"{settings.APP_NAME} is running",
        "status": "success",
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }


@app.get("/health", tags=["System"], summary="Health check")
async def health():
    ffmpeg_status = check_ffmpeg()
    ffprobe_status = check_ffprobe()
    mongo_status = await check_mongodb_status()

    try:
        import av  # noqa: F401

        pyav_available = True
    except ImportError:
        pyav_available = False

    if not pyav_available or not mongo_status["available"]:
        overall = "unhealthy"
    elif not ffmpeg_status.available:
        overall = "degraded"  # convert/metadata (PyAV) still work; trim/merge/volume (PyDub) don't
    else:
        overall = "healthy"

    return {
        "status": overall,
        "version": settings.APP_VERSION,
        "mongodb": mongo_status,
        "ffmpeg": ffmpeg_status.as_dict(),
        "ffprobe": ffprobe_status.as_dict(),
        "pyav": {"available": pyav_available},
        "formats": {
            "input": list_input_formats(),
            "output": list_output_formats(),
        },
    }
