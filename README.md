# AI Headshot Studio

Local-first headshot enhancement studio for background removal, retouching, and headshot framing. No accounts, no third-party uploads.

## Features
- Background removal (local `rembg`)
- Lighting + retouch sliders (brightness, contrast, color, sharpness, soften)
- Crop presets with headshot-friendly framing
- One-click use-case presets (LinkedIn, resume, passport)
- Preset export/import (JSON) for reusable studio setups
- Pre-process export estimator (predicted dimensions + approximate output size)
- Startup diagnostics panel (API health, background-removal availability, upload limit)
- Custom background color picker + framing guide overlay
- Downloadable PNG/JPEG output
- Accessible, keyboard-friendly UI

## Quickstart
```bash
make setup
make dev
make check
make smoke
```
Open `http://127.0.0.1:8000`.

## Docker
```bash
docker build -t ai-headshot-studio .
docker run --rm -p 8000:8000 ai-headshot-studio
```

## API
- `GET /api/health` — runtime diagnostics (`status`, `version`, limits, local background-removal availability)
- `GET /api/presets` — list crop presets and styles
- `POST /api/process` — multipart form data
  - Response includes `X-Output-Width`, `X-Output-Height`, `X-Output-Format`, `X-Processing-Ms`, `X-Output-Bytes` headers
- `POST /api/batch` — multipart form data (process multiple images with the same settings)
  - Returns a ZIP (`application/zip`) with processed outputs.
  - Response includes `X-Batch-Count`, `X-Processing-Ms`, `X-Output-Format` headers

### `POST /api/process` fields
- `image` (file, required)
- `remove_bg` (`true|false`)
- `background` (`white|light|blue|gray|custom|transparent`)
- `background_hex` (optional `#RRGGBB` or `#RGB` when `background=custom`)
- `preset` (see `/api/presets`)
- `style` (optional style name)
- `top_bias` (0–1, higher = more headroom; default 0.2)
- `brightness` (0.5–1.5)
- `contrast` (0.5–1.5)
- `color` (0.5–1.5)
- `sharpness` (0.5–1.8)
- `soften` (0–1)
- `jpeg_quality` (60–100, default 92; applies to JPEG output only)
- `format` (`png|jpeg`)

### `POST /api/batch` fields
- `images` (files, required; up to 24)
- All `POST /api/process` fields except `image`
- `folder` (optional; safe folder name inside the ZIP)

## Notes
- Background removal runs locally and may download a model the first time it is used.
- For best results, use a high-resolution, well-lit source image.

## Repo
All project docs live in `docs/` (see `docs/PROJECT.md` for commands).
