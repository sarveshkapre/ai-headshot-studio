from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CropPreset:
    name: str
    ratio: float
    width: int | None = None
    height: int | None = None


PRESETS: dict[str, CropPreset] = {
    "square": CropPreset(name="Square", ratio=1.0),
    "portrait-4x5": CropPreset(name="Portrait 4x5", ratio=4 / 5),
    "portrait-3x4": CropPreset(name="Portrait 3x4", ratio=3 / 4),
    "portrait-2x3": CropPreset(name="Portrait 2x3", ratio=2 / 3),
    "portrait-5x7": CropPreset(name="Portrait 5x7", ratio=5 / 7),
    "landscape-4x3": CropPreset(name="Landscape 4x3", ratio=4 / 3),
    "landscape-16x9": CropPreset(name="Landscape 16x9", ratio=16 / 9),
    "vertical-9x16": CropPreset(name="Vertical 9x16", ratio=9 / 16),
    "passport-2x2": CropPreset(name="Passport 2x2", ratio=1.0, width=600, height=600),
}

STYLES: dict[str, dict[str, float]] = {
    "classic": {
        "brightness": 1.05,
        "contrast": 1.05,
        "color": 1.0,
        "sharpness": 1.1,
        "soften": 0.0,
    },
    "studio": {
        "brightness": 1.08,
        "contrast": 1.1,
        "color": 1.02,
        "sharpness": 1.2,
        "soften": 0.05,
    },
    "warm": {
        "brightness": 1.08,
        "contrast": 1.0,
        "color": 1.08,
        "sharpness": 1.05,
        "soften": 0.08,
    },
    "crisp": {
        "brightness": 1.02,
        "contrast": 1.12,
        "color": 0.98,
        "sharpness": 1.3,
        "soften": 0.0,
    },
}
