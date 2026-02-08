# Clone Feature Tracker

## Context Sources
- README and docs
- TODO/FIXME markers in code
- Test and build failures
- Gaps found during codebase exploration
- GitHub issues by `sarveshkapre`/trusted bots (none open as of 2026-02-08)
- Recent GitHub Actions failures (runs `21579321573`, `21579029896`, `21558093325`, `21558063122`)

## Candidate Features To Do
- [x] P0: Fix CI/tooling path mismatch so `make check` works both with and without a local `.venv` (selected for this run).
- [x] P0: Add regression coverage for CI-critical command and request validation edge cases (selected for this run).
- [x] P1: Ship preset export/import for studio settings to unblock shareable workflows (selected for this run).
- [x] P1: Fix recent-export object URL lifecycle so history downloads remain valid after new processing runs (selected for this run).
- [ ] P2: Add optional preview file-size estimator before processing to improve export predictability.
- [ ] P2: Add batch processing MVP (queue + ZIP download) aligned with roadmap.
- [ ] P2: Add face-guided crop framing (lightweight detector) for higher-quality automatic composition.
- [ ] P3: Add visual regression smoke script for `static/` workflow interactions.
- [ ] P3: Add startup diagnostics panel (`/api/health`) with optional `rembg` availability status.

## Implemented
- [2026-02-08] CI-safe Make targets and command fallback.
  - Evidence: `Makefile` (uses active Python when `.venv` is absent), `make -n check VENV=.ci-missing`.
- [2026-02-08] Preset export/import in the web studio.
  - Evidence: `static/index.html`, `static/app.js`, `static/styles.css`.
- [2026-02-08] Stable export history download links + URL cleanup.
  - Evidence: `static/app.js` (`clearHistory`, separate history object URLs, unload/reset cleanup).
- [2026-02-08] Added request/processing edge-case tests.
  - Evidence: `tests/test_processing.py` (`11 passed` via `make check`).

## Insights
- CI failures were caused by Make targets hardcoding `.venv/bin/*` while GitHub Actions installs dependencies into the runner Python environment.
- History URLs must be independent from the active preview URL; otherwise revoking preview URLs breaks older history downloads.
- Preset portability is low-friction when JSON payloads include both style key and explicit slider values.

## Notes
- This file is maintained by the autonomous clone loop.
