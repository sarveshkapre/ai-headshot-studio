# Changelog

## Unreleased

### Added
- In-app, dismissible error banner in the studio UI (no blocking browser alerts).
- Keyboard accessibility for the upload dropzone and `Ctrl/⌘ + Enter` to process.

### Changed
- Images are auto-oriented using EXIF metadata so previews/crops match how the photo was taken.
- Upload reads are size-limited to 12MB during streaming to reduce memory spikes.
- UI no longer pulls Google Fonts (fully local/offline-friendly after setup).

### Fixed
- More consistent request normalization (case-insensitive preset/style/format/background handling).
