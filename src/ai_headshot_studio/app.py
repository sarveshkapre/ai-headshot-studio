from __future__ import annotations

import re
import tempfile
import time
import zipfile
from collections.abc import Iterator
from datetime import UTC, datetime
from functools import lru_cache
from importlib import metadata, util
from pathlib import Path
from typing import IO

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
from starlette.background import BackgroundTask

from ai_headshot_studio.processing import (
    MAX_PIXELS,
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

_SAFE_NAME_RE = re.compile(r"[^a-zA-Z0-9._-]+")


def _safe_basename(filename: str | None) -> str:
    raw = (filename or "").strip()
    if not raw:
        return "image"
    # Drop directory traversal and keep a small ASCII-ish subset.
    name = Path(raw).name
    name = _SAFE_NAME_RE.sub("-", name)
    name = name.strip(".-") or "image"
    return name[:80]


def _safe_zip_folder(folder: str | None) -> str | None:
    if folder is None:
        return None
    raw = folder.strip().strip("/\\")
    if not raw:
        return None
    safe = _SAFE_NAME_RE.sub("-", raw).strip(".-") or "batch"
    return safe[:64]


def _iter_file_chunks(file_obj: IO[bytes], chunk_size: int = 1024 * 1024) -> Iterator[bytes]:
    while True:
        chunk = file_obj.read(chunk_size)
        if not chunk:
            return
        yield chunk


def parse_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def build_output_headers(
    image: Image.Image, output_format: str, elapsed_ms: int, payload_bytes: int
) -> dict[str, str]:
    return {
        "X-Output-Width": str(image.width),
        "X-Output-Height": str(image.height),
        "X-Output-Format": output_format,
        "X-Processing-Ms": str(max(0, elapsed_ms)),
        "X-Output-Bytes": str(max(0, payload_bytes)),
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
async def health() -> dict[str, object]:
    return {
        "status": "ok",
        "service": "ai-headshot-studio",
        "version": package_version(),
        "limits": {
            "max_upload_mb": MAX_UPLOAD_MB,
            "max_upload_bytes": MAX_UPLOAD_BYTES,
            "max_pixels": MAX_PIXELS,
        },
        "features": {
            "background_removal": background_removal_diagnostics(),
        },
    }


@lru_cache(maxsize=1)
def package_version() -> str:
    try:
        return metadata.version("ai-headshot-studio")
    except metadata.PackageNotFoundError:
        return app.version


@lru_cache(maxsize=1)
def background_removal_diagnostics() -> dict[str, str | bool]:
    details: dict[str, str | bool] = {
        "mode": "local",
        "provider": "rembg",
        "available": False,
    }
    if util.find_spec("rembg") is None:
        details["error"] = "missing_dependency"
        return details
    details["available"] = True
    try:
        details["version"] = metadata.version("rembg")
    except metadata.PackageNotFoundError:
        details["version"] = "unknown"
    return details


@app.get("/api/presets")
async def presets() -> JSONResponse:
    return JSONResponse({"presets": available_presets(), "styles": available_styles()})


@app.post("/api/process")
async def process(
    image: UploadFile = File(...),  # noqa: B008
    remove_bg: str | None = Form(None),
    background: str = Form("white"),
    background_hex: str | None = Form(None),
    preset: str = Form("portrait-4x5"),
    style: str | None = Form(None),
    top_bias: float = Form(0.2),
    brightness: float = Form(1.0),
    contrast: float = Form(1.0),
    color: float = Form(1.0),
    sharpness: float = Form(1.0),
    soften: float = Form(0.0),
    jpeg_quality: int = Form(92),
    format: str = Form("png"),
) -> StreamingResponse:
    data = await read_upload_limited(image, MAX_UPLOAD_BYTES)
    output_format = format.strip().lower()
    req = ProcessRequest(
        remove_bg=parse_bool(remove_bg),
        background=background,
        background_hex=background_hex,
        preset=preset,
        style=style,
        top_bias=top_bias,
        brightness=brightness,
        contrast=contrast,
        color=color,
        sharpness=sharpness,
        soften=soften,
        jpeg_quality=jpeg_quality,
        output_format=output_format,
    )
    try:
        start = time.perf_counter()
        result = process_image(data, req)
        payload = to_bytes(result, output_format, req.jpeg_quality)
    except ProcessingError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    media_type = "image/png" if output_format == "png" else "image/jpeg"
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    return StreamingResponse(
        iter([payload]),
        media_type=media_type,
        headers=build_output_headers(result, output_format, elapsed_ms, len(payload)),
    )


@app.post("/api/batch")
async def batch(
    images: list[UploadFile] = File(...),  # noqa: B008
    remove_bg: str | None = Form(None),
    background: str = Form("white"),
    background_hex: str | None = Form(None),
    preset: str = Form("portrait-4x5"),
    style: str | None = Form(None),
    top_bias: float = Form(0.2),
    brightness: float = Form(1.0),
    contrast: float = Form(1.0),
    color: float = Form(1.0),
    sharpness: float = Form(1.0),
    soften: float = Form(0.0),
    jpeg_quality: int = Form(92),
    format: str = Form("png"),
    folder: str | None = Form(None),
) -> StreamingResponse:
    if len(images) == 0:
        raise HTTPException(status_code=400, detail="No images provided.")
    if len(images) > 24:
        raise HTTPException(status_code=400, detail="Too many images. Max 24.")

    output_format = format.strip().lower()
    zip_folder = _safe_zip_folder(folder)
    req = ProcessRequest(
        remove_bg=parse_bool(remove_bg),
        background=background,
        background_hex=background_hex,
        preset=preset,
        style=style,
        top_bias=top_bias,
        brightness=brightness,
        contrast=contrast,
        color=color,
        sharpness=sharpness,
        soften=soften,
        jpeg_quality=jpeg_quality,
        output_format=output_format,
    )

    started = time.perf_counter()
    spool = tempfile.SpooledTemporaryFile(max_size=48 * 1024 * 1024)
    try:
        with zipfile.ZipFile(spool, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
            for idx, upload in enumerate(images, start=1):
                data = await read_upload_limited(upload, MAX_UPLOAD_BYTES)
                try:
                    result = process_image(data, req)
                    payload = to_bytes(result, output_format, req.jpeg_quality)
                except ProcessingError as exc:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Failed on {_safe_basename(upload.filename)}: {exc}",
                    ) from exc

                ext = "png" if output_format == "png" else "jpg"
                base = _safe_basename(upload.filename)
                stem = Path(base).stem
                out_name = f"{idx:02d}-{stem}.{ext}"
                if zip_folder:
                    out_name = f"{zip_folder}/{out_name}"
                archive.writestr(out_name, payload)
        spool.seek(0)
    except HTTPException:
        spool.close()
        raise
    except Exception as exc:
        spool.close()
        raise HTTPException(status_code=500, detail="Batch processing failed.") from exc

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    timestamp = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
    filename = f"headshots-batch-{timestamp}.zip"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "X-Batch-Count": str(len(images)),
        "X-Processing-Ms": str(max(0, elapsed_ms)),
        "X-Output-Format": output_format,
    }
    return StreamingResponse(
        _iter_file_chunks(spool),
        media_type="application/zip",
        headers=headers,
        background=BackgroundTask(spool.close),
    )
