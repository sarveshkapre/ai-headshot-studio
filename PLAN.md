# AI Headshot Studio — Plan

One-line pitch: a local-first, fast headshot enhancement studio (background removal + retouch + headshot framing) that runs on your machine with no accounts and no uploads.

## What it does (today)
- Upload a photo and apply headshot-friendly crop presets.
- Optional background removal (local `rembg`) with simple background choices.
- Retouch controls (brightness/contrast/color/sharpness/soften).
- Download processed output as PNG/JPEG.

## Top risks / unknowns
- Performance and memory usage on large images (especially with background removal).
- Quality variance across different lighting/skin tones; avoid “over-processing”.
- Face/framing accuracy: crop presets are currently not face-guided.
- First-run model download for `rembg` can be slow/offline-unfriendly.

## Commands
If you just want to run it:
- `make setup`
- `make dev` (then open `http://127.0.0.1:8000`)

To validate changes:
- `make check` (lint + mypy + tests)
- `make build` (package build)

More: see `docs/PROJECT.md`.

## Shipped in this run
- Removed external Google Fonts dependency to keep the UI fully local/offline-friendly.
- Added in-app, dismissible error messaging (no blocking `alert()`).
- Improved keyboard accessibility for upload and processing shortcuts (Ctrl/⌘+Enter).
- Applied EXIF orientation on load so crops/previews match how photos were taken.
- Style presets now apply to sliders (and slider tweaks automatically switch to Manual).
- Added a one-click slider reset to neutral values.
- Persisted studio settings locally (style, sliders, background, crop, format) for a smoother workflow.
- Added “Reset studio” to return to defaults.
- Added output metadata (dimensions/format/time) so users can verify sizing before download.
- Added client-side file validation (type/size) and a Cancel action for in-flight processing.
- Added headroom control (top-bias) to fine-tune crop framing.
- Added a preview zoom toggle (fit vs actual size) for closer inspection.
- Added a background color swatch preview next to the backdrop selector.
- Added before/after comparison slider in the preview.
- Added JPEG quality control for export sizing.
 - Added output size metadata in the preview (KB/MB).
 - Added clipboard paste upload for faster workflows.
 - Added a one-click background reset.
 - Added a quick reset for crop + export controls.
 - Added recent export history (last 3) with download shortcuts.
- Added a keyboard shortcuts help modal.
- Added warning-only skin-tone consistency detection for retouch-heavy outputs (surfaced via `X-Processing-Warnings` headers and preview warning text).
- Added print sheet layouts (`2x2`, `3x3`) with one-click sheet download in the studio UI.
- Added a batch `continue_on_error` toggle in the UI so partial failures can still produce a ZIP + `errors.json`.

## Next to ship
- Add visual regression smoke script for the `src/ai_headshot_studio/static/` workflow (fast and deterministic).
- Add richer non-fatal warning manifests for batch outputs.
- Add on-device model selection (speed vs quality) for background removal.
