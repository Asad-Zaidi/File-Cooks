"""Application configuration.

All values are sourced from environment variables / the .env file. Nothing
here should ever be hard-coded (credentials, machine-specific paths, etc.) —
see .env.example for the full list of supported variables.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Directory that contains this file: <repo>/backend/app/core
BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    # --- Application ---
    APP_NAME: str = "FileCooks API"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "File conversion and audio processing backend"
    DEBUG: bool = True

    HOST: str = "0.0.0.0"
    PORT: int = 5000

    # --- MongoDB ---
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DATABASE: str = "filecooks"

    # --- Upload / conversion limits (audio) ---
    MAX_UPLOAD_SIZE_MB: int = 200
    MAX_CONVERSION_TIME_SECONDS: int = 300

    # --- Upload / conversion limits (video) ---
    MAX_VIDEO_UPLOAD_SIZE_MB: int = 2048
    MAX_VIDEO_DURATION_SECONDS: int = 7200
    CONVERSION_TIMEOUT_SECONDS: int = 3600
    MAX_CONCURRENT_CONVERSIONS: int = 2
    FILE_RETENTION_MINUTES: float = 60.0
    CLEANUP_INTERVAL_SECONDS: int = 600

    # --- Storage directories (relative to backend/ unless absolute) ---
    UPLOAD_DIRECTORY: str = "uploads"
    CONVERTED_DIRECTORY: str = "converted"
    TEMP_DIRECTORY: str = "temp"

    # How long a file may sit in uploads/converted/temp before the cleanup
    # routine is allowed to remove it.
    FILE_RETENTION_HOURS: float = 24.0

    # --- FFmpeg ---
    # Left as bare executable names by default so they resolve via PATH.
    # Override in .env with an absolute path if FFmpeg isn't on PATH.
    FFMPEG_PATH: str = "ffmpeg"
    FFPROBE_PATH: str = "ffprobe"

    # --- CORS ---
    # Comma-separated list of allowed origins, e.g.
    # "http://localhost:3000,http://localhost:5173"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Derived helpers ---

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @property
    def max_video_upload_size_bytes(self) -> int:
        return self.MAX_VIDEO_UPLOAD_SIZE_MB * 1024 * 1024

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    def _resolve_dir(self, value: str) -> Path:
        path = Path(value)
        return path if path.is_absolute() else BASE_DIR / path

    @property
    def upload_path(self) -> Path:
        return self._resolve_dir(self.UPLOAD_DIRECTORY)

    @property
    def converted_path(self) -> Path:
        return self._resolve_dir(self.CONVERTED_DIRECTORY)

    @property
    def temp_path(self) -> Path:
        return self._resolve_dir(self.TEMP_DIRECTORY)

    def ensure_directories(self) -> None:
        """Create uploads/, converted/ and temp/ if they don't already exist."""
        for path in (self.upload_path, self.converted_path, self.temp_path):
            path.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
