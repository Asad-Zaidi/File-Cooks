"""Async MongoDB connection (PyMongo's async API).

The connection is intentionally non-fatal at startup: if MongoDB is briefly
unreachable, the API still starts (audio conversion doesn't strictly depend
on Mongo being up) and `/health` will simply report the database as
unavailable until it recovers.
"""

from pymongo import AsyncMongoClient
from pymongo.errors import PyMongoError

from app.core.config import settings
from app.core.logging import get_logger
from app.db.models import ConversionRecord, PDFOperationRecord, VideoJob

logger = get_logger("db")

CONVERSIONS_COLLECTION = "conversions"
VIDEO_JOBS_COLLECTION = "video_jobs"
PDF_OPERATIONS_COLLECTION = "pdf_operations"

client: AsyncMongoClient = AsyncMongoClient(
    settings.MONGODB_URL,
    serverSelectionTimeoutMS=5000,
)
database = client[settings.MONGODB_DATABASE]


def get_conversions_collection():
    return database[CONVERSIONS_COLLECTION]


def get_video_jobs_collection():
    return database[VIDEO_JOBS_COLLECTION]


def get_pdf_operations_collection():
    return database[PDF_OPERATIONS_COLLECTION]


async def connect_to_mongodb() -> None:
    try:
        await client.admin.command("ping")
        await get_conversions_collection().create_index("conversion_id", unique=True)
        await get_conversions_collection().create_index("created_at")
        await get_video_jobs_collection().create_index("job_id", unique=True)
        await get_video_jobs_collection().create_index("created_at")
        await get_video_jobs_collection().create_index("batch_id")
        await get_pdf_operations_collection().create_index("operation_id", unique=True)
        await get_pdf_operations_collection().create_index("created_at")
        logger.info("MongoDB connected | database=%s", settings.MONGODB_DATABASE)
    except PyMongoError as exc:
        logger.error("MongoDB connection failed: %s", exc)


async def close_mongodb_connection() -> None:
    await client.close()
    logger.info("MongoDB connection closed")


async def check_mongodb_status() -> dict:
    try:
        await client.admin.command("ping")
        return {"available": True, "database": settings.MONGODB_DATABASE}
    except PyMongoError as exc:
        return {"available": False, "database": settings.MONGODB_DATABASE, "error": str(exc)}


async def save_conversion_record(record: ConversionRecord) -> None:
    try:
        await get_conversions_collection().insert_one(record.to_mongo())
    except PyMongoError as exc:
        logger.error("Failed to persist conversion record %s: %s", record.conversion_id, exc)


async def update_conversion_record(conversion_id: str, updates: dict) -> None:
    try:
        await get_conversions_collection().update_one({"conversion_id": conversion_id}, {"$set": updates})
    except PyMongoError as exc:
        logger.error("Failed to update conversion record %s: %s", conversion_id, exc)


async def get_conversion_record(conversion_id: str) -> dict | None:
    try:
        return await get_conversions_collection().find_one({"conversion_id": conversion_id}, {"_id": False})
    except PyMongoError as exc:
        logger.error("Failed to fetch conversion record %s: %s", conversion_id, exc)
        return None


# --- Video jobs --------------------------------------------------------------

async def save_video_job(job: VideoJob) -> None:
    try:
        await get_video_jobs_collection().insert_one(job.to_mongo())
    except PyMongoError as exc:
        logger.error("Failed to persist video job %s: %s", job.job_id, exc)


async def update_video_job(job_id: str, updates: dict) -> None:
    try:
        await get_video_jobs_collection().update_one({"job_id": job_id}, {"$set": updates})
    except PyMongoError as exc:
        logger.error("Failed to update video job %s: %s", job_id, exc)


async def get_video_job(job_id: str) -> dict | None:
    try:
        return await get_video_jobs_collection().find_one({"job_id": job_id}, {"_id": False})
    except PyMongoError as exc:
        logger.error("Failed to fetch video job %s: %s", job_id, exc)
        return None


async def delete_video_job(job_id: str) -> None:
    try:
        await get_video_jobs_collection().delete_one({"job_id": job_id})
    except PyMongoError as exc:
        logger.error("Failed to delete video job %s: %s", job_id, exc)


async def save_pdf_operation(record: PDFOperationRecord) -> None:
    try:
        await get_pdf_operations_collection().insert_one(record.to_mongo())
    except PyMongoError as exc:
        logger.error("Failed to persist PDF operation record %s: %s", record.operation_id, exc)


async def update_pdf_operation(operation_id: str, updates: dict) -> None:
    try:
        await get_pdf_operations_collection().update_one({"operation_id": operation_id}, {"$set": updates})
    except PyMongoError as exc:
        logger.error("Failed to update PDF operation record %s: %s", operation_id, exc)


async def get_pdf_operation(operation_id: str) -> dict | None:
    try:
        return await get_pdf_operations_collection().find_one({"operation_id": operation_id}, {"_id": False})
    except PyMongoError as exc:
        logger.error("Failed to fetch PDF operation record %s: %s", operation_id, exc)
        return None


async def find_stale_video_jobs(cutoff_iso: str) -> list[dict]:
    """Terminal (completed/failed/cancelled) jobs created before `cutoff_iso`
    (an ISO-8601 timestamp string), used by the periodic cleanup loop."""
    try:
        cursor = get_video_jobs_collection().find(
            {"status": {"$in": ["completed", "failed", "cancelled"]}, "created_at": {"$lt": cutoff_iso}},
            {"_id": False, "job_id": True, "output_filename": True},
        )
        return await cursor.to_list(length=None)
    except PyMongoError as exc:
        logger.error("Failed to query stale video jobs: %s", exc)
        return []
