# AI Headshot Studio

Local-first headshot enhancement studio for background removal, retouching, and headshot framing. No accounts, no third-party uploads.

## Features
- Background removal (local `rembg`)
- Lighting + retouch sliders (brightness, contrast, color, sharpness, soften)
- Crop presets with headshot-friendly framing
- Downloadable PNG/JPEG output
- Accessible, keyboard-friendly UI

## Quickstart
```bash
make setup
make dev
```
Open `http://127.0.0.1:8000`.

## Docker
```bash
docker build -t ai-headshot-studio .
docker run --rm -p 8000:8000 ai-headshot-studio
```

## API
- `GET /api/presets` — list crop presets and styles
- `POST /api/process` — multipart form data
  - Response includes `X-Output-Width`, `X-Output-Height`, `X-Output-Format`, `X-Processing-Ms`, `X-Output-Bytes` headers

### `POST /api/process` fields
- `image` (file, required)
- `remove_bg` (`true|false`)
- `background` (`white|light|blue|gray|transparent`)
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

## Notes
- Background removal runs locally and may download a model the first time it is used.
- For best results, use a high-resolution, well-lit source image.

## Repo
All project docs live in `docs/` (see `docs/PROJECT.md` for commands).
