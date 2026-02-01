from __future__ import annotations

import io

import pytest
from PIL import Image

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
        preset="passport-2x2",
        style=None,
        brightness=1.0,
        contrast=1.0,
        color=1.0,
        sharpness=1.0,
        soften=0.0,
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
        preset="PASSPORT-2X2",
        style="CLASSIC",
        brightness=1.0,
        contrast=1.0,
        color=1.0,
        sharpness=1.0,
        soften=0.0,
        output_format="PNG",
    )
    result = process_image(data, req)
    assert result.size == (600, 600)


def test_process_rejects_nan_values() -> None:
    data = make_image(1200, 1600)
    req = ProcessRequest(
        remove_bg=False,
        background="white",
        preset="passport-2x2",
        style=None,
        brightness=float("nan"),
        contrast=1.0,
        color=1.0,
        sharpness=1.0,
        soften=0.0,
        output_format="png",
    )
    with pytest.raises(ProcessingError):
        process_image(data, req)


def test_load_image_applies_exif_orientation() -> None:
    data = make_jpeg_with_orientation(400, 200, orientation=6)
    image = load_image(data)
    assert image.size == (200, 400)


def test_available_styles_include_parameters() -> None:
    styles = {style["key"]: style for style in available_styles()}
    classic = styles["classic"]
    for key in ["brightness", "contrast", "color", "sharpness", "soften"]:
        assert key in classic
