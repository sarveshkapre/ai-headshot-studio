# PLAN

## Goal
Ship a local-first headshot enhancement studio with background removal, lighting/retouch controls, and crop presets.

## Stack
- Backend: FastAPI + Uvicorn
- Image processing: Pillow + optional `rembg`
- Frontend: static HTML/CSS/JS (no build step)
- Tooling: ruff, mypy, pytest

### Rationale
FastAPI keeps the API surface explicit and easy to test, and a static UI keeps the project lightweight and portable.

## Architecture
- `src/ai_headshot_studio/app.py`: FastAPI app and routes
- `src/ai_headshot_studio/processing.py`: image pipeline utilities
- `static/`: UI assets
- `tests/`: unit tests for crop presets and pipeline

## MVP Checklist
- [x] Upload image
- [x] Background removal toggle
- [x] Lighting/retouch controls
- [x] Crop presets
- [x] Download output
- [x] `make check` green

## Risks & Mitigations
- Model download latency → lazy-load `rembg`, warn users in UI copy.
- Large files → enforce max upload size and clear errors.
- Color shifts → clamp ranges and keep defaults conservative.

## Milestones
1. Scaffold repo + docs
2. Implement API + UI
3. Tests + CI + polish
