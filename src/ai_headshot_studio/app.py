from __future__ import annotations

import json
import re
import tempfile
import time
import zipfile
from collections.abc import Iterator, Sequence
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
    process_image_with_warnings,
    to_bytes,
)

PACKAGE_DIR = Path(__file__).resolve().parent
STATIC_DIR = PACKAGE_DIR / "static"
if not STATIC_DIR.is_dir():
    # Backward-compatible fallback for older repo layouts / local dev checkouts.
    legacy_static = Path(__file__).resolve().parents[2] / "static"
    if legacy_static.is_dir():
        STATIC_DIR = legacy_static

app = FastAPI(title="AI Headshot Studio", version="0.1.0")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

_SAFE_NAME_RE = re.compile(r"[^a-zA-Z0-9._-]+")
MAX_BATCH_IMAGES = 24
MAX_BATCH_TOTAL_MB = 72
MAX_BATCH_TOTAL_BYTES = MAX_BATCH_TOTAL_MB * 1024 * 1024


def api_detail(code: str, message: str, **extra: object) -> dict[str, object]:
    payload: dict[str, object] = {"code": code, "message": message}
    payload.update(extra)
    return payload


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


def add_warning_headers(headers: dict[str, str], warnings: Sequence[object]) -> dict[str, str]:
    codes: list[str] = []
    for item in warnings:
        code = getattr(item, "code", None)
        if isinstance(code, str) and code:
            codes.append(code)
    if not codes:
        return headers
    merged = dict(headers)
    merged["X-Processing-Warnings"] = ",".join(codes)
    merged["X-Processing-Warnings-Count"] = str(len(codes))
    return merged


async def read_upload_limited(
    upload: UploadFile,
    max_bytes: int,
    *,
    total_counter: list[int] | None = None,
    total_limit: int | None = None,
) -> bytes:
    content_type = (upload.content_type or "").strip().lower()
    if content_type and not content_type.startswith("image/"):
        message = "Unsupported file type. Please choose an image."
        raise HTTPException(
            status_code=415,
            detail=api_detail("unsupported_media_type", message),
        )

    buffer = bytearray()
    while True:
        chunk = await upload.read(1024 * 1024)
        if not chunk:
            return bytes(buffer)
        buffer.extend(chunk)
        if total_counter is not None:
            total_counter[0] += len(chunk)
            if total_limit is not None and total_counter[0] > total_limit:
                raise HTTPException(
                    status_code=413,
                    detail=api_detail(
                        "batch_too_large",
                        f"Batch too large. Max {MAX_BATCH_TOTAL_MB}MB total.",
                    ),
                )
        if len(buffer) > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=api_detail("file_too_large", f"File too large. Max {MAX_UPLOAD_MB}MB."),
            )


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
            "max_batch_images": MAX_BATCH_IMAGES,
            "max_batch_total_mb": MAX_BATCH_TOTAL_MB,
            "max_batch_total_bytes": MAX_BATCH_TOTAL_BYTES,
        },
        "features": {
            "background_removal": background_removal_diagnostics(),
            "face_framing": face_framing_diagnostics(),
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


@lru_cache(maxsize=1)
def face_framing_diagnostics() -> dict[str, str | bool]:
    details: dict[str, str | bool] = {
        "mode": "local",
        "provider": "opencv-haarcascade",
        "available": False,
    }
    if util.find_spec("cv2") is None:
        details["error"] = "missing_dependency"
        return details
    details["available"] = True
    try:
        details["version"] = metadata.version("opencv-python-headless")
    except metadata.PackageNotFoundError:
        try:
            details["version"] = metadata.version("opencv-python")
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
        result, warnings = process_image_with_warnings(data, req)
        payload = to_bytes(result, output_format, req.jpeg_quality)
    except ProcessingError as exc:
        raise HTTPException(
            status_code=400,
            detail=api_detail(exc.code, str(exc)),
        ) from exc

    media_type_map = {
        "png": "image/png",
        "jpeg": "image/jpeg",
        "webp": "image/webp",
    }
    media_type = media_type_map.get(output_format, "application/octet-stream")
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    headers = build_output_headers(result, output_format, elapsed_ms, len(payload))
    headers = add_warning_headers(headers, warnings)
    return StreamingResponse(
        iter([payload]),
        media_type=media_type,
        headers=headers,
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
    continue_on_error: str | None = Form(None),
) -> StreamingResponse:
    if len(images) == 0:
        raise HTTPException(
            status_code=400,
            detail=api_detail("missing_images", "No images provided."),
        )
    if len(images) > MAX_BATCH_IMAGES:
        raise HTTPException(
            status_code=400,
            detail=api_detail("too_many_images", f"Too many images. Max {MAX_BATCH_IMAGES}."),
        )

    output_format = format.strip().lower()
    zip_folder = _safe_zip_folder(folder)
    should_continue = parse_bool(continue_on_error)
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
    total_counter: list[int] = [0]
    errors: list[dict[str, object]] = []
    warning_items: list[dict[str, object]] = []
    warning_count = 0
    succeeded = 0
    try:
        with zipfile.ZipFile(spool, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
            for idx, upload in enumerate(images, start=1):
                filename = _safe_basename(upload.filename)
                try:
                    data = await read_upload_limited(
                        upload,
                        MAX_UPLOAD_BYTES,
                        total_counter=total_counter,
                        total_limit=MAX_BATCH_TOTAL_BYTES,
                    )
                    result, item_warnings = process_image_with_warnings(data, req)
                    payload = to_bytes(result, output_format, req.jpeg_quality)
                except HTTPException as exc:
                    detail = exc.detail
                    if isinstance(detail, dict):
                        code = str(detail.get("code", "http_error"))
                        message = str(detail.get("message", ""))
                    else:
                        code = "http_error"
                        message = str(detail)

                    if should_continue and code != "batch_too_large":
                        errors.append(
                            {
                                "index": idx,
                                "filename": filename,
                                "code": code,
                                "message": message or "Upload rejected.",
                            }
                        )
                        continue
                    raise
                except ProcessingError as exc:
                    if should_continue:
                        errors.append(
                            {
                                "index": idx,
                                "filename": filename,
                                "code": exc.code,
                                "message": str(exc),
                            }
                        )
                        continue
                    raise HTTPException(
                        status_code=400,
                        detail=api_detail(
                            "batch_item_failed",
                            f"Failed on {filename}: {exc}",
                            filename=filename,
                            index=idx,
                            item_code=exc.code,
                        ),
                    ) from exc

                ext_map = {"png": "png", "jpeg": "jpg", "webp": "webp"}
                ext = ext_map.get(output_format, "bin")
                stem = Path(filename).stem
                out_name = f"{idx:02d}-{stem}.{ext}"
                if zip_folder:
                    out_name = f"{zip_folder}/{out_name}"
                archive.writestr(out_name, payload)

                if item_warnings:
                    warning_codes = [
                        str(getattr(item, "code", "warning")) for item in item_warnings
                    ]
                    warning_messages = [str(getattr(item, "message", "")) for item in item_warnings]
                    warning_items.append(
                        {
                            "index": idx,
                            "filename": filename,
                            "codes": warning_codes,
                            "messages": warning_messages,
                        }
                    )
                    warning_count += len(warning_codes)
                succeeded += 1

            if should_continue and errors:
                report = {
                    "total": len(images),
                    "succeeded": succeeded,
                    "failed": len(errors),
                    "output_format": output_format,
                    "errors": errors,
                }
                report_name = "errors.json"
                if zip_folder:
                    report_name = f"{zip_folder}/{report_name}"
                archive.writestr(
                    report_name,
                    json.dumps(report, indent=2, sort_keys=True).encode("utf-8"),
                )

            if warning_items:
                warning_report = {
                    "total": len(images),
                    "succeeded": succeeded,
                    "items_with_warnings": len(warning_items),
                    "warning_count": warning_count,
                    "warnings": warning_items,
                }
                report_name = "warnings.json"
                if zip_folder:
                    report_name = f"{zip_folder}/{report_name}"
                archive.writestr(
                    report_name,
                    json.dumps(warning_report, indent=2, sort_keys=True).encode("utf-8"),
                )
        spool.seek(0)
    except HTTPException:
        spool.close()
        raise
    except Exception as exc:
        spool.close()
        raise HTTPException(
            status_code=500,
            detail=api_detail("internal_error", "Batch processing failed."),
        ) from exc

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    timestamp = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
    filename = f"headshots-batch-{timestamp}.zip"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "X-Batch-Count": str(len(images)),
        "X-Batch-Succeeded": str(succeeded if should_continue else len(images)),
        "X-Batch-Failed": str(len(errors) if should_continue else 0),
        "X-Batch-Warnings": str(max(0, warning_count)),
        "X-Processing-Ms": str(max(0, elapsed_ms)),
        "X-Output-Format": output_format,
    }
    return StreamingResponse(
        _iter_file_chunks(spool),
        media_type="application/zip",
        headers=headers,
        background=BackgroundTask(spool.close),
    )
