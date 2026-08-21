# FileCooks API — Audio Conversion Backend

A FastAPI backend for audio conversion, metadata extraction and audio
processing (trim / merge / volume), built on **PyAV** (bundled FFmpeg
libraries) and **PyDub** (system FFmpeg), with **MongoDB** for conversion
metadata.

```
                    React Frontend
                          │  HTTP
                          ▼
                    FastAPI :5000
                          │
                    ┌─────┴─────┐
                 Router       Health
                    │
                    ▼
             Audio Service
                    │
          ┌─────────┼─────────┐
        PyAV      PyDub     FFmpeg
          │         │         │
          └─────────┼─────────┘
                    ▼
              Converted File
                    │
             ┌──────┴──────┐
         Filesystem      MongoDB
        (audio binary)   (metadata)
```

## Why PyAV *and* PyDub?

* **`/convert` and `/metadata`** are implemented with **PyAV**, which links
  against its own bundled FFmpeg libraries. They work even if no system
  FFmpeg binary is installed.
* **`/trim`, `/merge`, `/volume`** are implemented with **PyDub**, which
  shells out to the system `ffmpeg`/`ffprobe` executables. These genuinely
  require FFmpeg to be installed and on `PATH` (or pointed to via
  `FFMPEG_PATH`/`FFPROBE_PATH`) — if it's missing, those three endpoints
  return a `503 FFMPEG_UNAVAILABLE` error instead of failing silently.
* `/health` reports both: PyAV/Mongo availability drives `healthy` vs.
  `unhealthy`; system-FFmpeg availability alone drives `degraded`.

## Project layout

```
backend/
├── app/
│   ├── core/
│   │   ├── config.py       # Settings (env-driven), directory helpers
│   │   ├── logging.py      # Structured logging setup
│   │   ├── exceptions.py   # AppError hierarchy -> consistent JSON errors
│   │   └── formats.py      # Central audio format registry (single source of truth)
│   ├── db/
│   │   ├── models.py       # ConversionRecord (Mongo document model)
│   │   └── session.py      # Async MongoDB connection + queries
│   ├── dto/
│   │   └── audio.py        # Request/response schemas
│   ├── routers/
│   │   └── audio.py        # /api/audio/* routes (thin HTTP layer)
│   ├── services/
│   │   ├── audio_converter.py  # PyAV-based format conversion
│   │   ├── audio_metadata.py   # PyAV-based metadata extraction
│   │   └── audio_processor.py  # PyDub-based trim/merge/volume
│   ├── utils/
│   │   ├── ffmpeg.py        # FFmpeg/FFprobe detection
│   │   └── files.py         # Safe upload/save/cleanup helpers
│   └── tests/               # pytest suite
├── uploads/                 # transient input files (cleaned up after use)
├── converted/                # output files, served by /download
├── temp/                     # scratch space (e.g. /metadata uploads)
├── .env / .env.example
├── main.py                   # App wiring only — no business logic
└── requirements.txt
```

## 1. Setup

### 1.1 Install FFmpeg (Windows)

FFmpeg is only required for `/trim`, `/merge`, `/volume`, and for the health
check to report `healthy` instead of `degraded`. `/convert` and `/metadata`
work without it.

1. Download a build from https://www.gyan.dev/ffmpeg/builds/ (the
   "release essentials" zip is enough).
2. Extract it, e.g. to `C:\ffmpeg`.
3. Add `C:\ffmpeg\bin` to your `PATH` (System Properties → Environment
   Variables → Path → New), then open a **new** terminal.
4. Verify: `ffmpeg -version` and `ffprobe -version`.

Alternatively, install via a package manager:

```powershell
winget install Gyan.FFmpeg
# or
choco install ffmpeg
```

If you'd rather not touch `PATH`, set the full path in `.env` instead:

```env
FFMPEG_PATH=C:/ffmpeg/bin/ffmpeg.exe
FFPROBE_PATH=C:/ffmpeg/bin/ffprobe.exe
```

### 1.2 MongoDB

Run MongoDB locally (default `mongodb://localhost:27017`), or point
`MONGODB_URL` at any reachable instance. The API still starts and serves
`/convert`/`/metadata` if Mongo is temporarily down — `/health` will just
report it as unavailable.

### 1.3 Python environment

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

> **Note (Python 3.13+):** the stdlib `audioop` module (which PyDub depends
> on) was removed from Python 3.13 onward. `requirements.txt` already
> includes the `audioop-lts` backport that restores it — no extra steps
> needed.

### 1.4 Run the server

```powershell
python -m uvicorn main:app --reload --port 5000
```

* API root: http://localhost:5000/
* Health: http://localhost:5000/health
* Swagger docs: http://localhost:5000/docs

`uploads/`, `converted/` and `temp/` are created automatically on startup if
they don't exist.

## 2. Configuration (`.env`)

| Variable | Default | Purpose |
|---|---|---|
| `APP_NAME`, `APP_VERSION`, `DEBUG` | see `.env.example` | App metadata / error verbosity |
| `HOST`, `PORT` | `0.0.0.0`, `5000` | Informational (uvicorn is started with `--port` explicitly) |
| `MONGODB_URL`, `MONGODB_DATABASE` | `mongodb://localhost:27017`, `filecooks` | MongoDB connection |
| `MAX_UPLOAD_SIZE_MB` | `200` | Rejects uploads above this size |
| `MAX_CONVERSION_TIME_SECONDS` | `300` | Server-side conversion timeout |
| `UPLOAD_DIRECTORY`, `CONVERTED_DIRECTORY`, `TEMP_DIRECTORY` | `uploads`, `converted`, `temp` | Storage locations (relative to `backend/`) |
| `FILE_RETENTION_HOURS` | `24` | Age at which the cleanup routine may delete a file |
| `FFMPEG_PATH`, `FFPROBE_PATH` | `ffmpeg`, `ffprobe` | Resolved via `PATH`, or set an absolute path |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Comma-separated allow-list |

Nothing here is hard-coded in source — every value above is read from the
environment via `app/core/config.py`.

## 3. API reference

All responses share a consistent error envelope on failure:

```json
{"success": false, "error": {"code": "UNSUPPORTED_FORMAT", "message": "..."}}
```

Supported formats live in `app/core/formats.py` — see `GET /api/audio/formats`.

| Format | Input | Output | Notes |
|---|:-:|:-:|---|
| mp3, m4a, aac, ogg, opus, ac3 | ✅ | ✅ | bitrate/quality apply |
| wav, flac, aiff | ✅ | ✅ | lossless, no bitrate |
| amr | ✅ | ✅ | forced to 8kHz mono (codec requirement) |
| wma | ✅ | ❌ | decode-only (no free WMA encoder) |

### `GET /api/audio/formats`
Lists supported input/output formats and quality presets.

### `POST /api/audio/convert`
Multipart form: `file` (required), `output_format` (required),
`quality` (`low`\|`medium`\|`high`\|`best`), `bitrate` (e.g. `192k`,
overrides `quality`), `sample_rate` (Hz), `channels` (`1`\|`2`).

```json
{
  "success": true,
  "conversion_id": "8f1c2a9d...",
  "status": "completed",
  "original_filename": "song.wav",
  "input_format": "wav",
  "output_format": "mp3",
  "input_size": 176444,
  "output_size": 25748,
  "processing_time": 0.11,
  "download_url": "/api/audio/download/8f1c2a9d..."
}
```

### `POST /api/audio/metadata`
Multipart form: `file`. Returns duration/codec/sample rate/channels/bitrate/
container/tags — detected from the actual file, not the extension.

### `POST /api/audio/trim`
Multipart form: `file`, `start_time` (seconds), `end_time` (optional,
defaults to end of file), `output_format` (optional, defaults to input
format). Requires system FFmpeg.

### `POST /api/audio/merge`
Multipart form: `files` (2+ files, concatenated in order), `output_format`
(required). Requires system FFmpeg.

### `POST /api/audio/volume`
Multipart form: `file`, `volume_db` (e.g. `6` or `-6`), `output_format`
(optional). Requires system FFmpeg.

### `GET /api/audio/download/{conversion_id}`
Streams the converted/processed file with the correct MIME type and a
sanitized download filename. Returns `404 NOT_FOUND` for an unknown/
incomplete/expired conversion — internal file paths are never exposed.

## 4. Example requests

### curl

```bash
curl -X POST http://localhost:5000/api/audio/convert \
  -F "file=@song.wav" \
  -F "output_format=mp3" \
  -F "quality=high"

curl -O -J http://localhost:5000/api/audio/download/<conversion_id>
```

### Frontend (axios)

The frontend already has an axios instance with a multipart helper in
[api.js](../frontend/src/api/api.js) — note its default `API_BASE` is
`:8000`, so either set `FASTAPI_BASE=http://localhost:5000` or update the
default to match this backend's port (`5000`).

```js
import api, { postMultipart } from "../api/api";

async function convertAudio(file, outputFormat, quality = "high") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("output_format", outputFormat);
  formData.append("quality", quality);

  const { data } = await postMultipart("/audio/convert", formData);
  return data; // { conversion_id, download_url, ... }
}

async function downloadConverted(conversionId) {
  const response = await api.get(`/audio/download/${conversionId}`, {
    responseType: "blob",
  });
  return response.data;
}
```

### Frontend (fetch)

```js
async function convertAudio(file, outputFormat) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("output_format", outputFormat);

  const response = await fetch("http://localhost:5000/api/audio/convert", {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const { error } = await response.json();
    throw new Error(error.message);
  }
  return response.json();
}
```

## 5. Testing

```powershell
.venv\Scripts\activate
pytest app/tests -v
```

Tests use a dedicated `filecooks_test` MongoDB database (never the dev
database) and synthesize their own WAV fixtures — no sample audio files
needed. `trim`/`merge`/`volume` tests auto-skip when no system FFmpeg is on
`PATH`; everything else (root, health, format validation, invalid-file
handling, MP3⇄WAV conversion, metadata extraction, download, upload-size
limits, missing-output-file handling, cleanup) runs unconditionally.

## 6. Extending

**Add a new audio format:** add one `AudioFormatSpec` entry to
`SUPPORTED_AUDIO_FORMATS` in `app/core/formats.py` (encoder/muxer names,
mime type, bitrate table). Nothing else needs to change — the router,
converter, processor and download endpoint all read from that registry.

**Add a new processing operation** (fade in/out, normalize, resample):
follow the `_do_trim`/`_do_merge`/`_do_volume` pattern in
`app/services/audio_processor.py` and wire a new route in
`app/routers/audio.py`.

**Periodic cleanup:** `app/utils/files.cleanup_all_expired()` removes files
older than `FILE_RETENTION_HOURS` from `uploads/`, `converted/` and `temp/`.
It's not yet wired to a scheduler — call it from a cron job, a
`BackgroundTasks` hook, or an APScheduler job when you're ready for one.
