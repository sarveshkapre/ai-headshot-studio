from __future__ import annotations

import io

from PIL import Image

from ai_headshot_studio.processing import ProcessRequest, crop_to_aspect, process_image, to_bytes


def make_image(width: int, height: int) -> bytes:
    image = Image.new("RGB", (width, height), (120, 140, 160))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
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
