# Clone Feature Tracker

## Context Sources
- README and docs
- TODO/FIXME markers in code
- Test and build failures
- Gaps found during codebase exploration
- GitHub issues by `sarveshkapre`/trusted bots (none open as of 2026-02-09)
- GitHub Actions signals (`21579321573` historical failure root-caused; latest runs green)

## Candidate Features To Do
- [ ] P2: Add batch processing MVP (queue + ZIP download) aligned with roadmap.
- [ ] P2: Add face-guided crop framing (lightweight detector) for higher-quality automatic composition.
- [ ] P2: Add preset bundle support (multiple named profiles in one export/import file).
- [ ] P3: Add visual regression smoke script for `static/` workflow interactions.

## Implemented
- [2026-02-09] Structured runtime diagnostics endpoint for production visibility.
  - Evidence: `src/ai_headshot_studio/app.py` (`/api/health`, dependency-safe background-removal diagnostics).
- [2026-02-09] Startup diagnostics panel in the web studio.
  - Evidence: `static/index.html`, `static/app.js`, `static/styles.css` (`System diagnostics` card + health fetch/render).
- [2026-02-09] Pre-process export estimator in the UI.
  - Evidence: `static/app.js` (`queueEstimate`, canvas size estimation), `static/index.html` (`estimateMeta`).
- [2026-02-09] API contract tests for health/presets/process.
  - Evidence: `tests/test_api.py` (`5` endpoint coverage tests).
- [2026-02-09] Reproducible smoke verification target.
  - Evidence: `scripts/smoke_api.sh`, `Makefile` (`make smoke`).
- [2026-02-09] Structured project memory + incident log.
  - Evidence: `PROJECT_MEMORY.md`, `INCIDENTS.md` (decision records, failure RCA, prevention rules).
- [2026-02-09] Future-proofed CodeQL workflow action version.
  - Evidence: `.github/workflows/codeql.yml` (`github/codeql-action/*` moved from `@v3` to `@v4`).
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
- Health diagnostics should avoid importing `rembg` directly: `rembg` can call `sys.exit(1)` when ONNX runtime support is missing.
- A dedicated smoke command (`make smoke`) catches startup/runtime regressions earlier than unit tests alone.
- GitHub Actions annotations can surface near-term maintenance debt before it becomes a failing check.

## Notes
- This file is maintained by the autonomous clone loop.
