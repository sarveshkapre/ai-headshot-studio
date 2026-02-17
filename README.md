# AI Headshot Studio

Local-first headshot enhancement studio for background removal, retouching, and headshot framing. No accounts, no third-party uploads.

## Features
- Background removal (local `rembg`)
- Lighting + retouch sliders (brightness, contrast, color, sharpness, soften)
- Crop presets with headshot-friendly framing
- Optional face-guided framing (when OpenCV is installed)
- One-click use-case presets (LinkedIn, X profile, GitHub avatar, resume, passport, US visa digital)
- In-panel use-case preflight checks (resolution/shape/quality guidance)
- Preset export/import (JSON) for reusable studio setups
- Pre-process export estimator (predicted dimensions + approximate output size)
- Startup diagnostics panel (API health, background-removal availability, upload limit)
- Custom background color picker + framing guide overlay
- Multi-mode framing guides (`Off`, `Headshot`, `Passport`)
- Print sheet layouts (`2x2` / `3x3`) for at-home printing (client-side export)
- Warning-only skin-tone consistency checks for aggressive retouch settings
- Warning-only low-resolution and low-quality export checks
- Batch continue-on-error toggle in UI (`errors.json` report in ZIP on partial failures)
- Batch warning manifest (`warnings.json`) when non-fatal quality warnings are detected
- Downloadable PNG/JPEG/WebP output
- Accessible, keyboard-friendly UI

## Quickstart
```bash
make setup
make dev
make check
make smoke
```
Open `http://127.0.0.1:8000`.

### Optional face framing dependency
Face-guided crop framing is best-effort and works when OpenCV is installed:
```bash
pip install -e ".[face]"
```

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
  - Warning-only signals are exposed via `X-Processing-Warnings` and `X-Processing-Warnings-Count`
- `POST /api/batch` — multipart form data (process multiple images with the same settings)
  - Returns a ZIP (`application/zip`) with processed outputs.
  - Response includes `X-Batch-Count`, `X-Batch-Succeeded`, `X-Batch-Failed`, `X-Batch-Warnings`, `X-Processing-Ms`, `X-Output-Format` headers

### `POST /api/process` fields
- `image` (file, required)
- `remove_bg` (`true|false`)
- `background` (`white|light|blue|gray|custom|transparent`)
- `background_hex` (optional `#RRGGBB` or `#RGB` when `background=custom`)
- `preset` (see `/api/presets`)
- `style` (optional style name)
- `top_bias` (0–1, lower = more headroom; default 0.2)
- `brightness` (0.5–1.5)
- `contrast` (0.5–1.5)
- `color` (0.5–1.5)
- `sharpness` (0.5–1.8)
- `soften` (0–1)
- `jpeg_quality` (60–100, default 92; applies to JPEG/WebP output only)
- `format` (`png|jpeg|webp`)

### `POST /api/batch` fields
- `images` (files, required; up to 24)
- All `POST /api/process` fields except `image`
- `folder` (optional; safe folder name inside the ZIP)
- `continue_on_error` (`true|false`, default `false`)
  - When `true`, the ZIP can include an `errors.json` report (and the endpoint will still return `200` for partial failures).
  - When warning conditions are detected (for example low resolution/quality), ZIP output can include a `warnings.json` report.

## Notes
- Background removal runs locally and may download a model the first time it is used.
- For best results, use a high-resolution, well-lit source image.

## Batch CLI
For non-UI workflows, process a folder from the command line:
```bash
.venv/bin/python scripts/batch_cli.py --input ./photos --output ./outputs --preset portrait-4x5 --format jpeg --continue-on-error --zip ./outputs/batch.zip
```

## Repo
All project docs live in `docs/` (see `docs/PROJECT.md` for commands).
