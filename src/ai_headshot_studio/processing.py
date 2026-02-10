from __future__ import annotations

import importlib
import io
import math
import string
from dataclasses import dataclass

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

from ai_headshot_studio.presets import PRESETS, STYLES

MAX_UPLOAD_MB = 12
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
MAX_PIXELS = 20_000_000
_ALPHA_THRESHOLD = 8
_ALPHA_TABLE = [0 if i <= _ALPHA_THRESHOLD else 255 for i in range(256)]


class ProcessingError(ValueError):
    def __init__(self, message: str, code: str = "processing_error") -> None:
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class ProcessRequest:
    remove_bg: bool
    background: str
    background_hex: str | None
    preset: str
    style: str | None
    top_bias: float
    brightness: float
    contrast: float
    color: float
    sharpness: float
    soften: float
    jpeg_quality: int
    output_format: str


def validate_bytes(data: bytes) -> None:
    if len(data) > MAX_UPLOAD_BYTES:
        raise ProcessingError(f"File too large. Max {MAX_UPLOAD_MB}MB.", code="file_too_large")


def load_image(data: bytes) -> Image.Image:
    try:
        image = Image.open(io.BytesIO(data))
    except Image.DecompressionBombError as exc:  # pragma: no cover - PIL internal
        raise ProcessingError("Image dimensions too large.", code="image_too_large") from exc
    except Exception as exc:  # pragma: no cover - PIL internal
        raise ProcessingError("Unsupported or corrupted image.", code="invalid_image") from exc

    # Sniff the format from bytes (content-type and file extension can be faked).
    allowed = {"JPEG", "PNG", "WEBP"}
    fmt = (image.format or "").upper()
    if fmt not in allowed:
        raise ProcessingError("Unsupported image format.", code="unsupported_image_format")

    # Guard against decompression bombs: reject oversized dimensions before decoding.
    if image.width * image.height > MAX_PIXELS:
        raise ProcessingError("Image dimensions too large.", code="image_too_large")

    try:
        image.load()
        image = ImageOps.exif_transpose(image)
    except Image.DecompressionBombError as exc:  # pragma: no cover - PIL internal
        raise ProcessingError("Image dimensions too large.", code="image_too_large") from exc
    except Exception as exc:  # pragma: no cover - PIL internal
        raise ProcessingError("Unsupported or corrupted image.", code="invalid_image") from exc
    if image.width * image.height > MAX_PIXELS:
        raise ProcessingError("Image dimensions too large.", code="image_too_large")
    return image


def to_rgba(image: Image.Image) -> Image.Image:
    if image.mode != "RGBA":
        return image.convert("RGBA")
    return image


def remove_background(image: Image.Image) -> Image.Image:
    try:
        rembg = importlib.import_module("rembg")
        remove = getattr(rembg, "remove", None)
        if remove is None:
            raise ProcessingError(
                "Background removal model unavailable.", code="background_removal_unavailable"
            )
    except SystemExit as exc:  # pragma: no cover - runtime dependency
        # Some `rembg` installs call `sys.exit(1)` when an ONNX backend is missing.
        raise ProcessingError(
            "Background removal model unavailable.", code="background_removal_unavailable"
        ) from exc
    except ProcessingError:
        raise
    except Exception as exc:  # pragma: no cover - runtime dependency
        raise ProcessingError(
            "Background removal model unavailable.", code="background_removal_unavailable"
        ) from exc

    try:
        result = remove(image)
    except SystemExit as exc:  # pragma: no cover - runtime dependency
        raise ProcessingError(
            "Background removal model unavailable.", code="background_removal_unavailable"
        ) from exc
    except Exception as exc:  # pragma: no cover - runtime dependency
        raise ProcessingError(
            "Background removal model unavailable.", code="background_removal_unavailable"
        ) from exc
    if isinstance(result, Image.Image):
        return result
    return Image.open(io.BytesIO(result))


def normalize_hex_color(value: str | None) -> str | None:
    if value is None:
        return None
    raw = value.strip()
    if not raw:
        return None
    if raw.startswith("#"):
        raw = raw[1:]
    if len(raw) == 3:
        raw = "".join(ch * 2 for ch in raw)
    if len(raw) != 6 or any(ch not in string.hexdigits for ch in raw):
        raise ProcessingError("Invalid custom background color.", code="invalid_color")
    return f"#{raw.lower()}"


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    raw = value.lstrip("#")
    return (int(raw[0:2], 16), int(raw[2:4], 16), int(raw[4:6], 16))


def apply_background(
    image: Image.Image, background: str, background_hex: str | None
) -> Image.Image:
    background_key = background.strip().lower()
    if background_key == "transparent":
        return to_rgba(image)

    colors: dict[str, tuple[int, int, int]] = {
        "white": (255, 255, 255),
        "light": (245, 246, 248),
        "blue": (229, 236, 245),
        "gray": (230, 230, 230),
    }
    if background_key == "custom":
        if not background_hex:
            raise ProcessingError("Custom background color required.", code="missing_custom_color")
        color = hex_to_rgb(background_hex)
    elif background_key in colors:
        color = colors[background_key]
    else:
        raise ProcessingError("Unsupported background color.", code="unsupported_background")
    base = Image.new("RGBA", image.size, color + (255,))
    return Image.alpha_composite(base, to_rgba(image))


def normalize_output_format(value: str) -> str:
    fmt = value.strip().lower()
    if fmt not in {"png", "jpeg", "webp"}:
        raise ProcessingError("Unsupported output format.", code="unsupported_output_format")
    return fmt


def apply_adjustments(image: Image.Image, req: ProcessRequest) -> Image.Image:
    adjusted = image
    adjusted = ImageEnhance.Brightness(adjusted).enhance(req.brightness)
    adjusted = ImageEnhance.Contrast(adjusted).enhance(req.contrast)
    adjusted = ImageEnhance.Color(adjusted).enhance(req.color)
    adjusted = ImageEnhance.Sharpness(adjusted).enhance(req.sharpness)
    if req.soften > 0:
        blurred = adjusted.filter(ImageFilter.GaussianBlur(radius=req.soften * 2))
        adjusted = Image.blend(adjusted, blurred, alpha=min(req.soften, 1.0))
    return adjusted


def crop_to_aspect(image: Image.Image, ratio: float, top_bias: float = 0.2) -> Image.Image:
    return crop_to_aspect_focus(image, ratio=ratio, top_bias=top_bias, focus_bbox=None)


def alpha_foreground_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    """Best-effort foreground bounds from alpha channel (when present).

    This is a lightweight framing helper that works well for transparent PNGs and
    background-removed outputs. It is intentionally conservative: if alpha is
    missing or empty, returns None.
    """

    if "A" not in image.getbands():
        return None
    alpha = image.getchannel("A")
    # Reduce faint edge noise by thresholding alpha before bbox.
    mask = alpha.point(_ALPHA_TABLE)
    bbox = mask.getbbox()
    if not bbox:
        return None
    left, top, right, bottom = bbox
    if right <= left or bottom <= top:
        return None
    # Ignore tiny specks (e.g., compression artifacts) so we don't bias framing.
    bbox_area = (right - left) * (bottom - top)
    if bbox_area < int(image.width * image.height * 0.01):
        return None
    return bbox


def face_subject_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    """Best-effort subject bounds from a face detector (when available).

    This is intentionally optional: if the detector dependency isn't installed or
    no face is found, returns None.
    """

    try:
        import cv2
        import numpy as np
    except Exception:
        return None

    width, height = image.size
    if width <= 0 or height <= 0:
        return None

    # Downscale large inputs for speed and to avoid huge temporary arrays.
    max_dim = 900
    scale = 1.0
    if max(width, height) > max_dim:
        scale = max_dim / float(max(width, height))
        scaled = image.resize(
            (int(round(width * scale)), int(round(height * scale))), Image.BILINEAR
        )
    else:
        scaled = image

    try:
        rgb = scaled.convert("RGB")
        arr = np.array(rgb)
        gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    except Exception:
        return None

    try:
        cascade_path = getattr(getattr(cv2, "data", object()), "haarcascades", "")
        cascade = cv2.CascadeClassifier(str(cascade_path) + "haarcascade_frontalface_default.xml")
        faces = cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            flags=getattr(cv2, "CASCADE_SCALE_IMAGE", 0),
            minSize=(max(24, int(min(gray.shape[0], gray.shape[1]) * 0.06)),) * 2,
        )
    except Exception:
        return None

    if faces is None or len(faces) == 0:
        return None

    # Choose the largest face as the primary subject.
    x, y, w, h = max(faces, key=lambda item: int(item[2]) * int(item[3]))

    # Map back to original resolution.
    if scale != 1.0:
        inv = 1.0 / scale
        x = int(round(x * inv))
        y = int(round(y * inv))
        w = int(round(w * inv))
        h = int(round(h * inv))

    # Expand face -> approximate head+shoulders subject bounds.
    pad_x = int(round(w * 0.60))
    pad_top = int(round(h * 0.80))
    pad_bottom = int(round(h * 2.40))

    left = max(0, x - pad_x)
    top = max(0, y - pad_top)
    right = min(width, x + w + pad_x)
    bottom = min(height, y + h + pad_bottom)

    if right <= left or bottom <= top:
        return None

    bbox_area = (right - left) * (bottom - top)
    if bbox_area < int(width * height * 0.01):
        # Ignore tiny detections (e.g., a face far in the background).
        return None
    return (left, top, right, bottom)


def focus_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    """Return the best available focus bbox for crop framing.

    Priority:
    1) Alpha-mask derived foreground bbox (best for remove_bg/transparent inputs).
    2) Optional face-derived subject bbox (best-effort for regular photos).
    """

    return alpha_foreground_bbox(image) or face_subject_bbox(image)


def crop_to_aspect_focus(
    image: Image.Image,
    *,
    ratio: float,
    top_bias: float = 0.2,
    focus_bbox: tuple[int, int, int, int] | None,
) -> Image.Image:
    width, height = image.size
    current_ratio = width / height

    if abs(current_ratio - ratio) < 0.001:
        return image

    focus_x = None
    focus_y = None
    if focus_bbox is not None:
        left, top, right, bottom = focus_bbox
        focus_x = (left + right) / 2.0
        # Bias toward the upper part of the subject bbox (closer to face/eyes).
        focus_y = top + (bottom - top) * 0.30

    if current_ratio > ratio:
        new_width = int(height * ratio)
        max_shift = width - new_width
        if focus_x is None:
            left = max_shift // 2
        else:
            left = int(round(focus_x - new_width / 2.0))
            left = max(0, min(left, max_shift))
        box = (left, 0, left + new_width, height)
    else:
        new_height = int(width / ratio)
        max_shift = height - new_height
        if focus_y is None:
            shift = int(max_shift * max(0.0, min(top_bias, 1.0)))
        else:
            # `top_bias` is a simple shift control when we don't have focus.
            # When focus is available, interpret it as a framing preference:
            # lower values => more headroom (focus lower in the crop).
            headroom = 1.0 - max(0.0, min(top_bias, 1.0))
            target_ratio = 0.30 + (headroom * 0.20)  # 0.30..0.50
            target_y = new_height * target_ratio
            shift = int(round(focus_y - target_y))
            shift = max(0, min(shift, max_shift))
        box = (0, shift, width, shift + new_height)
    return image.crop(box)


def resize_if_needed(image: Image.Image, width: int | None, height: int | None) -> Image.Image:
    if width is None or height is None:
        return image
    return image.resize((width, height), Image.LANCZOS)


def normalize_request(req: ProcessRequest) -> ProcessRequest:
    preset = req.preset.strip().lower()
    background = req.background.strip().lower()
    output_format = normalize_output_format(req.output_format)
    style_key = req.style.strip().lower() if req.style else None
    background_hex = normalize_hex_color(req.background_hex)

    if background == "custom" and not background_hex:
        raise ProcessingError("Custom background color required.", code="missing_custom_color")

    if style_key is not None and style_key not in STYLES:
        raise ProcessingError("Unknown style preset.", code="unknown_style")

    if style_key is not None:
        style = STYLES[style_key]
        return ProcessRequest(
            remove_bg=req.remove_bg,
            background=background,
            background_hex=background_hex,
            preset=preset,
            style=style_key,
            top_bias=req.top_bias,
            brightness=style.get("brightness", req.brightness),
            contrast=style.get("contrast", req.contrast),
            color=style.get("color", req.color),
            sharpness=style.get("sharpness", req.sharpness),
            soften=style.get("soften", req.soften),
            jpeg_quality=req.jpeg_quality,
            output_format=output_format,
        )
    return ProcessRequest(
        remove_bg=req.remove_bg,
        background=background,
        background_hex=background_hex,
        preset=preset,
        style=None,
        top_bias=req.top_bias,
        brightness=req.brightness,
        contrast=req.contrast,
        color=req.color,
        sharpness=req.sharpness,
        soften=req.soften,
        jpeg_quality=req.jpeg_quality,
        output_format=output_format,
    )


def clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def ensure_finite(value: float, label: str) -> float:
    if not math.isfinite(value):
        raise ProcessingError(f"Invalid value for {label}.", code="invalid_parameter")
    return value


def clamp_request(req: ProcessRequest) -> ProcessRequest:
    return ProcessRequest(
        remove_bg=req.remove_bg,
        background=req.background,
        background_hex=req.background_hex,
        preset=req.preset,
        style=req.style,
        top_bias=clamp(ensure_finite(req.top_bias, "top_bias"), 0.0, 1.0),
        brightness=clamp(ensure_finite(req.brightness, "brightness"), 0.5, 1.5),
        contrast=clamp(ensure_finite(req.contrast, "contrast"), 0.5, 1.5),
        color=clamp(ensure_finite(req.color, "color"), 0.5, 1.5),
        sharpness=clamp(ensure_finite(req.sharpness, "sharpness"), 0.5, 1.8),
        soften=clamp(ensure_finite(req.soften, "soften"), 0.0, 1.0),
        jpeg_quality=int(clamp(float(req.jpeg_quality), 60, 100)),
        output_format=req.output_format,
    )


def ensure_preset(preset_key: str) -> tuple[float, int | None, int | None]:
    key = preset_key.strip().lower()
    if key not in PRESETS:
        raise ProcessingError("Unknown crop preset.", code="unknown_preset")
    preset = PRESETS[key]
    return preset.ratio, preset.width, preset.height


def process_image(data: bytes, req: ProcessRequest) -> Image.Image:
    validate_bytes(data)
    image = load_image(data)

    req = clamp_request(normalize_request(req))

    if req.remove_bg:
        image = remove_background(image)

    crop_focus_bbox = focus_bbox(image)

    if req.remove_bg or req.background != "transparent":
        image = apply_background(to_rgba(image), req.background, req.background_hex)

    image = apply_adjustments(image, req)

    ratio, width, height = ensure_preset(req.preset)
    image = crop_to_aspect_focus(
        image, ratio=ratio, top_bias=req.top_bias, focus_bbox=crop_focus_bbox
    )
    image = resize_if_needed(image, width=width, height=height)
    return image


def to_bytes(image: Image.Image, output_format: str, jpeg_quality: int = 92) -> bytes:
    buffer = io.BytesIO()
    fmt = output_format.lower()
    if fmt not in {"png", "jpeg", "webp"}:
        raise ProcessingError("Unsupported output format.", code="unsupported_output_format")
    if fmt == "jpeg":
        if image.mode in {"RGBA", "LA"}:
            background = Image.new("RGB", image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[-1])
            image = background
        else:
            image = image.convert("RGB")
        image.save(buffer, format="JPEG", quality=jpeg_quality, optimize=True)
    elif fmt == "webp":
        from collections.abc import Callable
        from typing import cast

        try:
            from PIL import features
        except Exception as exc:
            raise ProcessingError("WebP encoder unavailable.", code="webp_unavailable") from exc

        check = cast(Callable[[str], bool], getattr(features, "check", lambda _key: False))
        if not bool(check("webp")):
            raise ProcessingError("WebP encoder unavailable.", code="webp_unavailable")
        try:
            image.save(buffer, format="WEBP", quality=jpeg_quality, method=6)
        except Exception as exc:  # pragma: no cover - encoder availability varies by build
            raise ProcessingError("WebP encoder unavailable.", code="webp_unavailable") from exc
    else:
        image.save(buffer, format="PNG", optimize=True)
    return buffer.getvalue()


def available_presets() -> list[dict[str, str | float | int | None]]:
    return [
        {
            "key": key,
            "name": preset.name,
            "ratio": preset.ratio,
            "width": preset.width,
            "height": preset.height,
        }
        for key, preset in PRESETS.items()
    ]


def available_styles() -> list[dict[str, str | float]]:
    return [{"key": key, "name": key.replace("-", " ").title(), **STYLES[key]} for key in STYLES]
