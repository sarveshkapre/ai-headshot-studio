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

## Verification
Commands run:
- `make check`
- `make build`

## PR
- No PR (worked directly on `main`).
