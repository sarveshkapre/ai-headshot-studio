from __future__ import annotations

import io
import math
from dataclasses import dataclass

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

from ai_headshot_studio.presets import PRESETS, STYLES

MAX_UPLOAD_MB = 12
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
MAX_PIXELS = 20_000_000


class ProcessingError(ValueError):
    pass


@dataclass(frozen=True)
class ProcessRequest:
    remove_bg: bool
    background: str
    preset: str
    style: str | None
    top_bias: float
    brightness: float
    contrast: float
    color: float
    sharpness: float
    soften: float
    output_format: str


def validate_bytes(data: bytes) -> None:
    if len(data) > MAX_UPLOAD_BYTES:
        raise ProcessingError(f"File too large. Max {MAX_UPLOAD_MB}MB.")


def load_image(data: bytes) -> Image.Image:
    try:
        image = Image.open(io.BytesIO(data))
        image.load()
        image = ImageOps.exif_transpose(image)
    except Exception as exc:  # pragma: no cover - PIL internal
        raise ProcessingError("Unsupported or corrupted image.") from exc
    if image.width * image.height > MAX_PIXELS:
        raise ProcessingError("Image dimensions too large.")
    return image


def to_rgba(image: Image.Image) -> Image.Image:
    if image.mode != "RGBA":
        return image.convert("RGBA")
    return image


def remove_background(image: Image.Image) -> Image.Image:
    try:
        from rembg import remove
    except Exception as exc:  # pragma: no cover - runtime dependency
        raise ProcessingError("Background removal model unavailable.") from exc

    result = remove(image)
    if isinstance(result, Image.Image):
        return result
    return Image.open(io.BytesIO(result))


def apply_background(image: Image.Image, background: str) -> Image.Image:
    background_key = background.strip().lower()
    if background_key == "transparent":
        return to_rgba(image)

    colors: dict[str, tuple[int, int, int]] = {
        "white": (255, 255, 255),
        "light": (245, 246, 248),
        "blue": (229, 236, 245),
        "gray": (230, 230, 230),
    }
    if background_key not in colors:
        raise ProcessingError("Unsupported background color.")
    base = Image.new("RGBA", image.size, colors[background_key] + (255,))
    return Image.alpha_composite(base, to_rgba(image))


def normalize_output_format(value: str) -> str:
    fmt = value.strip().lower()
    if fmt not in {"png", "jpeg"}:
        raise ProcessingError("Unsupported output format.")
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
    width, height = image.size
    current_ratio = width / height

    if abs(current_ratio - ratio) < 0.001:
        return image

    if current_ratio > ratio:
        new_width = int(height * ratio)
        left = (width - new_width) // 2
        box = (left, 0, left + new_width, height)
    else:
        new_height = int(width / ratio)
        max_shift = height - new_height
        shift = int(max_shift * max(0.0, min(top_bias, 1.0)))
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

    if style_key is not None and style_key not in STYLES:
        raise ProcessingError("Unknown style preset.")

    if style_key is not None:
        style = STYLES[style_key]
        return ProcessRequest(
            remove_bg=req.remove_bg,
            background=background,
            preset=preset,
            style=style_key,
            top_bias=req.top_bias,
            brightness=style.get("brightness", req.brightness),
            contrast=style.get("contrast", req.contrast),
            color=style.get("color", req.color),
            sharpness=style.get("sharpness", req.sharpness),
            soften=style.get("soften", req.soften),
            output_format=output_format,
        )
    return ProcessRequest(
        remove_bg=req.remove_bg,
        background=background,
        preset=preset,
        style=None,
        top_bias=req.top_bias,
        brightness=req.brightness,
        contrast=req.contrast,
        color=req.color,
        sharpness=req.sharpness,
        soften=req.soften,
        output_format=output_format,
    )


def clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def ensure_finite(value: float, label: str) -> float:
    if not math.isfinite(value):
        raise ProcessingError(f"Invalid value for {label}.")
    return value


def clamp_request(req: ProcessRequest) -> ProcessRequest:
    return ProcessRequest(
        remove_bg=req.remove_bg,
        background=req.background,
        preset=req.preset,
        style=req.style,
        top_bias=clamp(ensure_finite(req.top_bias, "top_bias"), 0.0, 1.0),
        brightness=clamp(ensure_finite(req.brightness, "brightness"), 0.5, 1.5),
        contrast=clamp(ensure_finite(req.contrast, "contrast"), 0.5, 1.5),
        color=clamp(ensure_finite(req.color, "color"), 0.5, 1.5),
        sharpness=clamp(ensure_finite(req.sharpness, "sharpness"), 0.5, 1.8),
        soften=clamp(ensure_finite(req.soften, "soften"), 0.0, 1.0),
        output_format=req.output_format,
    )


def ensure_preset(preset_key: str) -> tuple[float, int | None, int | None]:
    key = preset_key.strip().lower()
    if key not in PRESETS:
        raise ProcessingError("Unknown crop preset.")
    preset = PRESETS[key]
    return preset.ratio, preset.width, preset.height


def process_image(data: bytes, req: ProcessRequest) -> Image.Image:
    validate_bytes(data)
    image = load_image(data)

    req = clamp_request(normalize_request(req))

    if req.remove_bg:
        image = remove_background(image)

    if req.remove_bg or req.background != "transparent":
        image = apply_background(to_rgba(image), req.background)

    image = apply_adjustments(image, req)

    ratio, width, height = ensure_preset(req.preset)
    image = crop_to_aspect(image, ratio=ratio, top_bias=req.top_bias)
    image = resize_if_needed(image, width=width, height=height)
    return image


def to_bytes(image: Image.Image, output_format: str) -> bytes:
    buffer = io.BytesIO()
    fmt = output_format.lower()
    if fmt not in {"png", "jpeg"}:
        raise ProcessingError("Unsupported output format.")
    if fmt == "jpeg":
        if image.mode in {"RGBA", "LA"}:
            background = Image.new("RGB", image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[-1])
            image = background
        else:
            image = image.convert("RGB")
        image.save(buffer, format="JPEG", quality=92, optimize=True)
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
