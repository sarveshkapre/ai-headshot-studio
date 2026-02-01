from __future__ import annotations

import time
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image

from ai_headshot_studio.processing import (
    MAX_UPLOAD_BYTES,
    MAX_UPLOAD_MB,
    ProcessingError,
    ProcessRequest,
    available_presets,
    available_styles,
    process_image,
    to_bytes,
)

BASE_DIR = Path(__file__).resolve().parents[2]
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="AI Headshot Studio", version="0.1.0")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def parse_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def build_output_headers(image: Image.Image, output_format: str, elapsed_ms: int) -> dict[str, str]:
    return {
        "X-Output-Width": str(image.width),
        "X-Output-Height": str(image.height),
        "X-Output-Format": output_format,
        "X-Processing-Ms": str(max(0, elapsed_ms)),
    }


async def read_upload_limited(upload: UploadFile, max_bytes: int) -> bytes:
    buffer = bytearray()
    while True:
        chunk = await upload.read(1024 * 1024)
        if not chunk:
            return bytes(buffer)
        buffer.extend(chunk)
        if len(buffer) > max_bytes:
            raise HTTPException(status_code=413, detail=f"File too large. Max {MAX_UPLOAD_MB}MB.")


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/presets")
async def presets() -> JSONResponse:
    return JSONResponse({"presets": available_presets(), "styles": available_styles()})


@app.post("/api/process")
async def process(
    image: UploadFile = File(...),  # noqa: B008
    remove_bg: str | None = Form(None),
    background: str = Form("white"),
    preset: str = Form("portrait-4x5"),
    style: str | None = Form(None),
    brightness: float = Form(1.0),
    contrast: float = Form(1.0),
    color: float = Form(1.0),
    sharpness: float = Form(1.0),
    soften: float = Form(0.0),
    format: str = Form("png"),
) -> StreamingResponse:
    data = await read_upload_limited(image, MAX_UPLOAD_BYTES)
    output_format = format.strip().lower()
    req = ProcessRequest(
        remove_bg=parse_bool(remove_bg),
        background=background,
        preset=preset,
        style=style,
        brightness=brightness,
        contrast=contrast,
        color=color,
        sharpness=sharpness,
        soften=soften,
        output_format=output_format,
    )
    try:
        start = time.perf_counter()
        result = process_image(data, req)
        payload = to_bytes(result, output_format)
    except ProcessingError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    media_type = "image/png" if output_format == "png" else "image/jpeg"
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    return StreamingResponse(
        iter([payload]),
        media_type=media_type,
        headers=build_output_headers(result, output_format, elapsed_ms),
    )
