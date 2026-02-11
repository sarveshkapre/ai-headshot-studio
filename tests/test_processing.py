from __future__ import annotations

import io

import pytest
from PIL import Image, features

from ai_headshot_studio.app import build_output_headers
from ai_headshot_studio.processing import (
    ProcessingError,
    ProcessRequest,
    alpha_foreground_bbox,
    available_styles,
    crop_to_aspect,
    crop_to_aspect_focus,
    detect_skin_tone_warning,
    focus_bbox,
    load_image,
    process_image,
    process_image_with_warnings,
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


def test_crop_to_aspect_focus_bbox_keeps_foreground_in_frame() -> None:
    image = Image.new("RGBA", (200, 400), (0, 0, 0, 0))
    for y in range(250, 400):
        for x in range(0, 200):
            image.putpixel((x, y), (255, 0, 0, 255))

    # Default crop (using only `top_bias`) misses the foreground rectangle.
    cropped_default = crop_to_aspect(image, ratio=1.0, top_bias=0.2)
    assert cropped_default.getchannel("A").getbbox() is None

    focus_bbox = (0, 250, 200, 400)
    cropped_focus = crop_to_aspect_focus(image, ratio=1.0, top_bias=0.2, focus_bbox=focus_bbox)
    assert cropped_focus.getchannel("A").getbbox() is not None


def test_alpha_foreground_bbox_detects_non_empty_alpha() -> None:
    image = Image.new("RGBA", (120, 120), (0, 0, 0, 0))
    for y in range(30, 90):
        for x in range(40, 80):
            image.putpixel((x, y), (255, 255, 255, 255))
    bbox = alpha_foreground_bbox(image)
    assert bbox is not None


def test_focus_bbox_uses_face_bbox_when_alpha_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    import ai_headshot_studio.processing as processing

    image = Image.new("RGB", (200, 300), (0, 0, 0))
    monkeypatch.setattr(processing, "face_subject_bbox", lambda _img: (10, 20, 30, 40))
    assert focus_bbox(image) == (10, 20, 30, 40)


def test_process_image_passes_focus_bbox_to_crop(monkeypatch: pytest.MonkeyPatch) -> None:
    import ai_headshot_studio.processing as processing

    data = make_image(1200, 1600)
    req = ProcessRequest(
        remove_bg=False,
        background="white",
        background_hex=None,
        preset="portrait-4x5",
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

    expected = (12, 34, 56, 78)
    monkeypatch.setattr(processing, "focus_bbox", lambda _img: expected)

    captured: dict[str, object] = {}

    def fake_crop(
        img: Image.Image, *, ratio: float, top_bias: float, focus_bbox: object
    ) -> Image.Image:
        captured["focus_bbox"] = focus_bbox
        return img

    monkeypatch.setattr(processing, "crop_to_aspect_focus", fake_crop)
    processing.process_image(data, req)
    assert captured["focus_bbox"] == expected


def test_load_image_applies_exif_orientation() -> None:
    data = make_jpeg_with_orientation(400, 200, orientation=6)
    image = load_image(data)
    assert image.size == (200, 400)


def test_load_image_rejects_over_max_pixels_before_decode() -> None:
    # Mode "1" keeps the fixture lightweight while still exercising the pixel guardrail.
    image = Image.new("1", (5000, 5000), 0)  # 25,000,000 pixels (> 20,000,000 max)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    data = buffer.getvalue()
    with pytest.raises(ProcessingError) as exc:
        load_image(data)
    assert exc.value.code == "image_too_large"


def test_available_styles_include_parameters() -> None:
    styles = {style["key"]: style for style in available_styles()}
    classic = styles["classic"]
    for key in ["brightness", "contrast", "color", "sharpness", "soften"]:
        assert key in classic


def test_remove_background_maps_system_exit_on_import(monkeypatch: pytest.MonkeyPatch) -> None:
    import ai_headshot_studio.processing as processing

    def boom(_name: str):
        raise SystemExit(1)

    monkeypatch.setattr(processing.importlib, "import_module", boom)

    data = make_image(800, 1000)
    req = ProcessRequest(
        remove_bg=True,
        background="white",
        background_hex=None,
        preset="portrait-4x5",
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
    with pytest.raises(ProcessingError) as exc:
        process_image(data, req)
    assert exc.value.code == "background_removal_unavailable"


def test_remove_background_maps_system_exit_on_call(monkeypatch: pytest.MonkeyPatch) -> None:
    import ai_headshot_studio.processing as processing

    class FakeRembg:
        @staticmethod
        def remove(_image: Image.Image):
            raise SystemExit(1)

    monkeypatch.setattr(processing.importlib, "import_module", lambda _name: FakeRembg())

    data = make_image(800, 1000)
    req = ProcessRequest(
        remove_bg=True,
        background="white",
        background_hex=None,
        preset="portrait-4x5",
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
    with pytest.raises(ProcessingError) as exc:
        process_image(data, req)
    assert exc.value.code == "background_removal_unavailable"


def test_detect_skin_tone_warning_emits_warning_for_large_chroma_shift() -> None:
    before = Image.new("RGB", (240, 240), (188, 144, 124))
    after = Image.new("RGB", (240, 240), (120, 166, 220))
    warning = detect_skin_tone_warning(before, after, focus_bbox=(0, 0, 240, 240))
    assert warning is not None
    assert warning.code == "skin_tone_shift_warning"


def test_process_image_with_warnings_reports_skin_tone_warning_for_aggressive_color() -> None:
    image = Image.new("RGB", (800, 1200), (188, 144, 124))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    data = buffer.getvalue()

    req = ProcessRequest(
        remove_bg=False,
        background="white",
        background_hex=None,
        preset="portrait-4x5",
        style=None,
        top_bias=0.2,
        brightness=1.0,
        contrast=1.45,
        color=1.5,
        sharpness=1.0,
        soften=0.0,
        jpeg_quality=92,
        output_format="png",
    )

    _result, warnings = process_image_with_warnings(data, req)
    assert any(item.code == "skin_tone_shift_warning" for item in warnings)


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
        to_bytes(image, "gif")


def test_to_bytes_webp_is_feature_detected() -> None:
    image = Image.new("RGB", (32, 32), (0, 0, 0))
    if not features.check("webp"):
        with pytest.raises(ProcessingError) as exc:
            to_bytes(image, "webp")
        assert exc.value.code == "webp_unavailable"
        return
    payload = to_bytes(image, "webp")
    # WebP containers are RIFF.
    assert payload.startswith(b"RIFF")
