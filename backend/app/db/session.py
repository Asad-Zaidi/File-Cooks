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
from app.db.models import ConversionRecord

logger = get_logger("db")

CONVERSIONS_COLLECTION = "conversions"

client: AsyncMongoClient = AsyncMongoClient(
    settings.MONGODB_URL,
    serverSelectionTimeoutMS=5000,
)
database = client[settings.MONGODB_DATABASE]


def get_conversions_collection():
    return database[CONVERSIONS_COLLECTION]


async def connect_to_mongodb() -> None:
    try:
        await client.admin.command("ping")
        await get_conversions_collection().create_index("conversion_id", unique=True)
        await get_conversions_collection().create_index("created_at")
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
