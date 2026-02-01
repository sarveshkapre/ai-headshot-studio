# Changelog

## Unreleased

### Added
- In-app, dismissible error banner in the studio UI (no blocking browser alerts).
- Keyboard accessibility for the upload dropzone and `Ctrl/⌘ + Enter` to process.
- Manual mode + one-click reset for retouch sliders.
- Local settings persistence (saved to `localStorage`) and a “Reset studio” control.
- Preview metadata (original/output dimensions); API returns output headers including processing time.
- Cancel button to abort in-flight processing requests; client-side file validation (type/size).
- Headroom control (crop top-bias) for smarter framing.
- Preview zoom toggle (fit vs actual size).

### Changed
- Images are auto-oriented using EXIF metadata so previews/crops match how the photo was taken.
- Upload reads are size-limited to 12MB during streaming to reduce memory spikes.
- UI no longer pulls Google Fonts (fully local/offline-friendly after setup).
- Style presets now populate slider values in the UI; `/api/presets` includes style parameters.

### Fixed
- More consistent request normalization (case-insensitive preset/style/format/background handling).
