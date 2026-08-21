"""MongoDB document models.

Only conversion *metadata* is stored in MongoDB — never the audio binaries
themselves. Files live on the filesystem (uploads/ during processing,
converted/ for finished output); Mongo just tracks what happened to them.
"""

from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field


class ConversionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ConversionOperation(str, Enum):
    CONVERT = "convert"
    TRIM = "trim"
    MERGE = "merge"
    VOLUME = "volume"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ConversionRecord(BaseModel):
    """One row per audio operation (convert/trim/merge/volume)."""

    conversion_id: str
    operation: ConversionOperation = ConversionOperation.CONVERT

    original_filename: str
    output_filename: str | None = None

    input_format: str
    output_format: str

    input_size: int
    output_size: int | None = None

    status: ConversionStatus = ConversionStatus.PENDING
    created_at: datetime = Field(default_factory=_utcnow)
    completed_at: datetime | None = None
    processing_time: float | None = None

    error: str | None = None

    def mark_completed(self, output_filename: str, output_size: int, processing_time: float) -> None:
        self.status = ConversionStatus.COMPLETED
        self.output_filename = output_filename
        self.output_size = output_size
        self.processing_time = processing_time
        self.completed_at = _utcnow()

    def mark_failed(self, error: str, processing_time: float | None = None) -> None:
        self.status = ConversionStatus.FAILED
        self.error = error
        self.processing_time = processing_time
        self.completed_at = _utcnow()

    def to_mongo(self) -> dict:
        return self.model_dump(mode="json")
