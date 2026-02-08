# Update (2026-02-08)

## Summary
- Fixed recurring GitHub Actions CI failures by making `Makefile` commands work without a pre-created `.venv`.
- Added preset export/import controls in the studio UI (JSON-based, clipboard-first with download fallback).
- Fixed recent export history reliability so older entries remain downloadable after new processing runs.
- Added test coverage for processing edge cases (infinite top-bias, invalid custom background hex, unsupported output format).

## Verification
Commands run:
- `make -n check VENV=.ci-missing`
- `make check`
- `make build`
- `node --check static/app.js`
- local smoke:
  - start API: `.venv/bin/python -m uvicorn ai_headshot_studio.app:app --port 8001`
  - `curl http://127.0.0.1:8001/api/health` returned `{"status":"ok"}`
  - `curl -F image=@input.png ... -F preset=passport-2x2 -F format=jpeg http://127.0.0.1:8001/api/process`
  - output verified as JPEG `600x600` with response headers `x-output-width`, `x-output-height`, `x-output-format`, `x-output-bytes`

## PR
- No PR (worked directly on `main`).

# Update (2026-02-01)

## Summary
- Shipped offline-first UI polish (removed Google Fonts), better error UX, and improved keyboard accessibility.
- Made image processing more robust (EXIF auto-orientation, tighter request normalization, and upload size-limited reads).
- Improved style preset UX: presets now populate sliders, edits switch to Manual, and sliders have a one-click reset.
- Persisted studio settings locally (saved to `localStorage`) and added a “Reset studio” button.
- Added output metadata headers and surfaced output dimensions/time in the preview.
- Added client-side file validation (type/size) and a Cancel button for in-flight processing.
- Added headroom control (top-bias) to fine-tune crop framing.
- Added a preview zoom toggle (fit vs actual size).
- Added a background swatch preview for quick visual confirmation.
- Added a before/after comparison slider for the processed preview.
- Added JPEG quality control for smaller/larger exports.
 - Added output size metadata (KB/MB) to the preview.
 - Added clipboard paste upload for quick image input.
 - Added a one-click background reset.
 - Added a quick reset for crop/export controls.
 - Added recent export history (last 3) with download shortcuts.
- Added a keyboard shortcuts help modal.

## Verification
Commands run:
- `make check`
- `make build`

## PR
- No PR (worked directly on `main`).
