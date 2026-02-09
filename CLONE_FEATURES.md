# Clone Feature Tracker

## Context Sources
- README and docs
- TODO/FIXME markers in code
- Test and build failures
- Gaps found during codebase exploration
- GitHub issues by `sarveshkapre`/trusted bots (none open as of 2026-02-09)
- GitHub Actions signals (`21579321573` historical failure root-caused; latest runs green)

## Candidate Features To Do
### Backlog
- [ ] P2: Face-guided crop framing (prefer lightweight / optional dependency); fall back to `top_bias` when unavailable.
- [ ] P2: Add batch CLI helper (process a folder to outputs/ + optional ZIP) for non-UI workflows.
- [ ] P3: Add visual regression smoke script for `static/` workflow interactions (optional, fast, and deterministic).
- [ ] P3: Add perf micro-benchmark for processing pipeline (guardrail against slow regressions).
- [ ] P3: Add “profile suggestions” (auto-name saved profiles based on use-case/preset/style) to reduce friction.
- [ ] P3: Add batch “continue on error” mode (returns a ZIP including `errors.json` instead of failing the entire batch).

## Implemented
- [2026-02-09] Hardened upload validation + structured API error payloads (`code`, `message`).
  - Evidence: `src/ai_headshot_studio/processing.py` (format allowlist), `src/ai_headshot_studio/app.py` (structured `detail`), `tests/test_api.py` (invalid bytes + GIF rejection).
- [2026-02-09] Preset bundle import validation + conflict handling (overwrite toggle + summary toast).
  - Evidence: `static/index.html` (`bundleOverwrite` toggle), `static/app.js` (`sanitizeImportedSettings`, import summary).
- [2026-02-09] Docker health checks wired to `/api/health`.
  - Evidence: `Dockerfile` (`HEALTHCHECK`).
- [2026-02-09] Batch processing MVP (multi-upload to server-side ZIP download).
  - Evidence: `src/ai_headshot_studio/app.py` (`POST /api/batch`), `tests/test_api.py` (ZIP assertions), `scripts/smoke_api.sh` (batch smoke).
- [2026-02-09] Preset bundle library (saved named profiles) + bundle export/import (JSON).
  - Evidence: `static/index.html` (Profiles card), `static/app.js` (profile storage + bundle import/export), `static/styles.css` (profile UI styles).
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

## Gap Map (Cycle 2, Untrusted-Informed)
- Missing: face-guided crop framing (auto head/face placement), batch CLI for folder workflows, batch continue-on-error report.
- Weak: import surfaces (bundles/presets) need ongoing hardening as sharing expands; Docker verification is currently untested locally (no Docker).
- Parity: batch ZIP export, saved profiles + bundles, crop presets/headroom control, predictable export metadata.
- Differentiator: local-first privacy posture (no accounts/no third-party uploads), offline-ready static UI after setup.

## Insights
- CI failures were caused by Make targets hardcoding `.venv/bin/*` while GitHub Actions installs dependencies into the runner Python environment.
- History URLs must be independent from the active preview URL; otherwise revoking preview URLs breaks older history downloads.
- Preset portability is low-friction when JSON payloads include both style key and explicit slider values.
- Health diagnostics should avoid importing `rembg` directly: `rembg` can call `sys.exit(1)` when ONNX runtime support is missing.
- A dedicated smoke command (`make smoke`) catches startup/runtime regressions earlier than unit tests alone.
- GitHub Actions annotations can surface near-term maintenance debt before it becomes a failing check.
- Market baseline: batch workflows commonly export a single ZIP and let users choose output format and folder name; “keep original background” is a common batch toggle.
- Market baseline: common web tools cap image size (example: Canva Background Remover works under ~9MB and downscales to 10MP).
- Market baseline sources (untrusted): PhotoRoom batch format options + naming (`https://help.photoroom.com/en/articles/12137322-edit-multiple-photos-with-the-batch-feature-web-app`), PhotoRoom “original background” template (`https://help.photoroom.com/en/articles/12818584-keep-the-original-background-when-using-the-batch-feature`), remove.bg upload limits (`https://www.remove.bg/it/help/a/what-is-the-maximum-image-resolution-file-size`), Canva background remover limits (`https://www.canva.com/learn/background-remover/`).

## Notes
- This file is maintained by the autonomous clone loop.
