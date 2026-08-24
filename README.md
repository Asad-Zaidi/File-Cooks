# File-Cooks 🍳

**Convert, edit, and process files with a single click.**

File-Cooks is a full-stack file toolkit: a React frontend for image, PDF,
audio, and video tools, backed by a FastAPI service for audio/video
conversion and server-side PDF processing. Some tools run entirely in the
browser (image conversion, background removal, icon generation, audio
metadata) while heavier or format-sensitive work (video transcoding, PDF
editing/merging/signing) is delegated to the backend.

## Features

### 🖼️ Image
- Convert between common raster formats (client-side, in the browser)
- Background removal (`@imgly/background-removal`, runs locally — no upload)
- Favicon / app-icon generator with live code-snippet output

### 📄 Document (PDF)
Server-side, powered by `pikepdf` + `PyMuPDF` + `pyHanko`:
- Info, validation, and metadata inspection
- Merge, split, extract/reorder/delete/rotate pages
- Compress/optimize
- Annotate, remove/extract annotations
- Fill, export, and detect form fields
- Page thumbnail rendering

### 🎵 Audio
Backend API (`/api/audio/*`) built on **PyAV** (bundled FFmpeg — works with
no system install) and **PyDub** (system FFmpeg):
- Convert (mp3, wav, flac, aac, m4a, ogg, opus, ac3, aiff, amr; wma decode-only)
- Metadata extraction
- Trim, merge, and volume adjustment (requires system FFmpeg)

### 🎬 Video
Backend API (`/api/video/*`) built directly on system **FFmpeg**/**FFprobe**:
- Format/container conversion with codec, resolution, FPS, and quality controls
- Video → audio extraction (stream-copy aware, avoids re-encoding when possible)
- Batch conversion
- Background **job** queue with real FFmpeg-derived progress, cancellation,
  and automatic cleanup

## Architecture

```
                     React Frontend (CRA)
                              │
              ┌───────────────┴───────────────┐
        Client-side tools               HTTP (axios)
   (image convert, bg removal,                │
      icon generator, wasm)                   ▼
                                        FastAPI backend
                                              │
                    ┌─────────────┬───────────┼───────────┐
                 Audio API     Video API    PDF API    Jobs/Files
                (PyAV/PyDub)  (FFmpeg/    (pikepdf/    (progress,
                              FFprobe)    PyMuPDF/       download,
                                          pyHanko)       cleanup)
                                              │
                                    ┌─────────┴─────────┐
                                Filesystem            MongoDB
                             (uploads/converted)   (job/record metadata)
```

## Project Structure

```
File-Cooks/
├── backend/            FastAPI service — audio, video, and PDF processing
│   ├── app/
│   │   ├── core/       Settings, format registries, logging, exceptions
│   │   ├── db/         MongoDB models + session
│   │   ├── dto/        Request/response schemas
│   │   ├── routers/    HTTP layer (audio, video, jobs, pdf/*)
│   │   ├── services/   Business logic (audio, video, pdf/*)
│   │   ├── utils/      FFmpeg detection, file/MIME helpers
│   │   └── tests/      pytest suite
│   ├── main.py         App wiring (routers, CORS, error handling, lifespan)
│   └── requirements.txt
└── frontend/           React 19 (Create React App) UI
    ├── src/
    │   ├── pages/       Route-level screens (Image, Document, Audio, Video…)
    │   ├── components/  Feature UI (ImageConverter, AudioConverter, VideoConverter, DocumentTools…)
    │   ├── services/     API clients + client-side conversion logic
    │   ├── hooks/        Queue/state hooks per converter
    │   └── routes/       React Router route table
    └── package.json
```

See [backend/README.md](backend/README.md) for the full backend API
reference, configuration table, and testing guide.

## Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.11+ (3.13+ supported — see backend README's note on `audioop-lts`)
- **MongoDB** (local or remote) for conversion/job metadata
- **FFmpeg** on `PATH` — required for video conversion and audio
  trim/merge/volume ([details](backend/README.md#11-install-ffmpeg-windows))

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python -m uvicorn main:app --reload --port 5000
```

- API root: http://localhost:5000/
- Health check: http://localhost:5000/health
- Swagger docs: http://localhost:5000/docs

### Frontend

```powershell
cd frontend
npm install
npm start
```

Runs at http://localhost:3000. Point the frontend at the backend by setting
`FASTAPI_BASE` (see [frontend/src/api/api.js](frontend/src/api/api.js) and
[frontend/src/services/audioService.js](frontend/src/services/audioService.js)
for the default base URL used by each client).

## Testing

```powershell
cd backend
.venv\Scripts\activate
pytest app/tests -v
```

Tests synthesize their own fixtures (no checked-in sample media) and use a
dedicated `filecooks_test` MongoDB database. FFmpeg-dependent tests
auto-skip when no system FFmpeg is available.

```powershell
cd frontend
npm test
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, Tailwind CSS, Create React App |
| Client-side processing | `@imgly/background-removal`, `jspdf`, `jszip` |
| Backend | FastAPI, Uvicorn, Pydantic |
| Audio | PyAV, PyDub |
| Video | FFmpeg / FFprobe (via `asyncio` subprocess) |
| PDF | pikepdf, PyMuPDF, pyHanko, Pillow |
| Storage | MongoDB (metadata/jobs), filesystem (files) |
| Testing | pytest, httpx, React Testing Library |

## License

No license file is currently published for this repository. All rights
reserved unless a license is added.
