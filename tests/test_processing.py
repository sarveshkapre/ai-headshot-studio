from __future__ import annotations

import io

import pytest
from PIL import Image

from ai_headshot_studio.app import build_output_headers
from ai_headshot_studio.processing import (
    ProcessingError,
    ProcessRequest,
    available_styles,
    crop_to_aspect,
    load_image,
    process_image,
    to_bytes,
)


def make_image(width: int, height: int) -> bytes:
    image = Image.new("RGB", (width, height), (120, 140, 160))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def make_jpeg_with_orientation(width: int, height: int, orientation: int) -> bytes:
    image = Image.new("RGB", (width, height), (120, 140, 160))
    exif = image.getexif()
    exif[274] = orientation  # 274 = Orientation
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", exif=exif.tobytes())
    return buffer.getvalue()


def test_crop_to_square() -> None:
    image = Image.new("RGB", (1200, 800))
    cropped = crop_to_aspect(image, ratio=1.0)
    assert cropped.size[0] == cropped.size[1]


def test_process_passport_size() -> None:
    data = make_image(1200, 1600)
    req = ProcessRequest(
        remove_bg=False,
        background="white",
        background_hex=None,
        preset="passport-2x2",
        style=None,
        top_bias=0.2,
        brightness=1.0,
        contrast=1.0,
        color=1.0,
        sharpness=1.0,
        soften=0.0,
        jpeg_quality=92,
        output_format="png",
    )
    result = process_image(data, req)
    assert result.size == (600, 600)
    payload = to_bytes(result, "png")
    assert payload.startswith(b"\x89PNG")


def test_process_is_case_insensitive_for_keys() -> None:
    data = make_image(1200, 1600)
    req = ProcessRequest(
        remove_bg=False,
        background="WHITE",
        background_hex=None,
        preset="PASSPORT-2X2",
        style="CLASSIC",
        top_bias=0.2,
        brightness=1.0,
        contrast=1.0,
        color=1.0,
        sharpness=1.0,
        soften=0.0,
        jpeg_quality=92,
        output_format="PNG",
    )
    result = process_image(data, req)
    assert result.size == (600, 600)


def test_process_rejects_nan_values() -> None:
    data = make_image(1200, 1600)
    req = ProcessRequest(
        remove_bg=False,
        background="white",
        background_hex=None,
        preset="passport-2x2",
        style=None,
        top_bias=0.2,
        brightness=float("nan"),
        contrast=1.0,
        color=1.0,
        sharpness=1.0,
        soften=0.0,
        jpeg_quality=92,
        output_format="png",
    )
    with pytest.raises(ProcessingError):
        process_image(data, req)


def test_process_rejects_infinite_top_bias() -> None:
    data = make_image(1200, 1600)
    req = ProcessRequest(
        remove_bg=False,
        background="white",
        background_hex=None,
        preset="passport-2x2",
        style=None,
        top_bias=float("inf"),
        brightness=1.0,
        contrast=1.0,
        color=1.0,
        sharpness=1.0,
        soften=0.0,
        jpeg_quality=92,
        output_format="png",
    )
    with pytest.raises(ProcessingError):
        process_image(data, req)


def test_process_rejects_invalid_custom_background_hex() -> None:
    data = make_image(1200, 1600)
    req = ProcessRequest(
        remove_bg=False,
        background="custom",
        background_hex="#12",
        preset="passport-2x2",
        style=None,
        top_bias=0.2,
        brightness=1.0,
        contrast=1.0,
        color=1.0,
        sharpness=1.0,
        soften=0.0,
        jpeg_quality=92,
        output_format="png",
    )
    with pytest.raises(ProcessingError):
        process_image(data, req)


def test_crop_to_aspect_top_bias_changes_vertical_crop() -> None:
    image = Image.new("RGB", (100, 200))
    for y in range(0, 100):
        for x in range(0, 100):
            image.putpixel((x, y), (255, 0, 0))
    for y in range(100, 200):
        for x in range(0, 100):
            image.putpixel((x, y), (0, 0, 255))

    top = crop_to_aspect(image, ratio=1.0, top_bias=0.0)
    bottom = crop_to_aspect(image, ratio=1.0, top_bias=1.0)
    assert top.size == (100, 100)
    assert bottom.size == (100, 100)
    assert top.getpixel((10, 10)) == (255, 0, 0)
    assert bottom.getpixel((10, 10)) == (0, 0, 255)


def test_load_image_applies_exif_orientation() -> None:
    data = make_jpeg_with_orientation(400, 200, orientation=6)
    image = load_image(data)
    assert image.size == (200, 400)


def test_available_styles_include_parameters() -> None:
    styles = {style["key"]: style for style in available_styles()}
    classic = styles["classic"]
    for key in ["brightness", "contrast", "color", "sharpness", "soften"]:
        assert key in classic


def test_build_output_headers() -> None:
    image = Image.new("RGB", (123, 456))
    headers = build_output_headers(image, output_format="png", elapsed_ms=42, payload_bytes=1024)
    assert headers["X-Output-Width"] == "123"
    assert headers["X-Output-Height"] == "456"
    assert headers["X-Output-Format"] == "png"
    assert headers["X-Processing-Ms"] == "42"
    assert headers["X-Output-Bytes"] == "1024"


def test_to_bytes_rejects_unsupported_output_format() -> None:
    image = Image.new("RGB", (32, 32), (0, 0, 0))
    with pytest.raises(ProcessingError):
        to_bytes(image, "webp")
