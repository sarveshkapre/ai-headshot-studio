# Clone Feature Tracker

## Context Sources
- README and docs
- TODO/FIXME markers in code
- Test and build failures
- Gaps found during codebase exploration
- GitHub issues by `sarveshkapre`/trusted bots (none open as of 2026-02-11)
- GitHub Actions signals (`21579321573` historical failure root-caused; latest runs green)

## Candidate Features To Do
### Selected (Global Cycle 1, 2026-02-11)
- [x] P1: Add a warning-only skin-tone consistency heuristic for retouch changes and expose warning metadata in `POST /api/process` response headers (`I:5 E:2 S:5 D:4 R:2 C:4`).
- [x] P1: Add print sheet layouts (`2x2`, `3x3`) in the studio UI with one-click sheet download for at-home printing (`I:5 E:3 S:5 D:4 R:2 C:4`).
- [x] P2: Surface `/api/batch` `continue_on_error` in UI with explicit toggle + clearer partial-failure messaging (`I:4 E:1 S:5 D:3 R:1 C:5`).
- [x] P2: Refresh docs/trackers with bounded market scan notes, scored gap map updates, and verification evidence (`I:4 E:1 S:5 D:2 R:1 C:5`).

### Backlog (Prioritized, Scored)
- [ ] P2: Add deterministic visual regression smoke script for `src/ai_headshot_studio/static/` workflow snapshots (`I:4 E:3 S:4 D:3 R:2 C:3`).
- [ ] P2: Add API response-side warning payload support for batch outputs (ZIP summary manifest, warning counts) (`I:4 E:3 S:4 D:3 R:2 C:3`).
- [ ] P2: Add adaptive downscale guardrail before expensive filters for very large images to reduce latency spikes (`I:4 E:3 S:4 D:3 R:2 C:3`).
- [ ] P2: Add server-side timing breakdown headers (decode, retouch, encode) for better perf diagnostics (`I:4 E:2 S:4 D:3 R:1 C:4`).
- [ ] P3: Add skin-tone warning UX hint text in `Studio tips` with opt-out toggle (`I:3 E:1 S:3 D:3 R:1 C:4`).
- [ ] P3: Add batch option to retain original per-image background while applying retouch/crop settings (`I:4 E:3 S:4 D:3 R:2 C:3`).
- [ ] P3: Add export sidecar metadata JSON option (settings + output headers) for reproducibility (`I:3 E:2 S:4 D:3 R:1 C:4`).
- [ ] P3: Add CLI preset bundle import/export parity for `scripts/batch_cli.py` (`I:3 E:2 S:4 D:2 R:1 C:4`).
- [ ] P3: Add lightweight startup self-check command (`make doctor`) for local dependency diagnostics (`I:3 E:2 S:4 D:2 R:1 C:4`).
- [ ] P3: Add optional AVIF output support behind feature detection (`I:3 E:3 S:3 D:3 R:2 C:3`).
- [ ] P4: Add on-device model selection UX (speed vs quality) for background removal (`I:3 E:4 S:3 D:4 R:3 C:2`).
- [ ] P4: Add preset-level safety rails to cap aggressive slider combos that often look unnatural (`I:3 E:2 S:3 D:3 R:1 C:3`).
- [ ] P4: Add release-note automation to summarize implemented tracker items into `CHANGELOG.md` (`I:2 E:2 S:3 D:2 R:1 C:4`).
- [ ] P4: Add Docker smoke path in CI when container runtime is available (`I:3 E:3 S:3 D:2 R:2 C:3`).
- [ ] P4: Add screenshot examples for each crop preset to improve first-run UX (`I:2 E:3 S:3 D:3 R:1 C:3`).
- [ ] P4: Add optional background palette presets tuned for common recruiter/portfolio aesthetics (`I:2 E:2 S:3 D:3 R:1 C:3`).

## Implemented
- [2026-02-11] Warning-only skin-tone consistency heuristic added for retouch-heavy outputs, surfaced through `X-Processing-Warnings` headers and preview warning text in the UI.
  - Evidence: `src/ai_headshot_studio/processing.py` (`detect_skin_tone_warning`, `process_image_with_warnings`), `src/ai_headshot_studio/app.py` (`add_warning_headers`, `/api/process` headers), `src/ai_headshot_studio/static/app.js` (`warningMessageForCodes`, `setProcessedWarning`), `tests/test_processing.py`, `tests/test_api.py`.
- [2026-02-11] Print sheet layout export (`2x2`, `3x3`) shipped in the web studio with one-click sheet download.
  - Evidence: `src/ai_headshot_studio/static/index.html` (`printLayout`, `sheetDownloadBtn`), `src/ai_headshot_studio/static/app.js` (`createPrintSheetBlob`, `downloadPrintSheet`), `src/ai_headshot_studio/static/styles.css` (`preview__warning` and layout-supporting styles), `README.md`.
- [2026-02-11] Batch `continue_on_error` is now configurable from the UI with explicit toggle and improved failure guidance.
  - Evidence: `src/ai_headshot_studio/static/index.html` (`batchContinueOnError`), `src/ai_headshot_studio/static/app.js` (`formDataForBatch`, `processBatch` messaging), `README.md`.
- [2026-02-10] Background removal no longer crashes on `SystemExit` from `rembg`; returns stable `background_removal_unavailable` error instead.
  - Evidence: `src/ai_headshot_studio/processing.py` (`remove_background` import/runtime guards), `tests/test_processing.py` (SystemExit mapping tests).
- [2026-02-10] Static UI contract tests ensure `src/ai_headshot_studio/static/app.js` `getElementById(...)` references exist in `src/ai_headshot_studio/static/index.html` and prevent duplicate IDs.
  - Evidence: `tests/test_static_contract.py`.
- [2026-02-10] Processing micro-benchmark script with `make bench` for local perf guardrails.
  - Evidence: `scripts/bench_processing.py`, `Makefile`, `docs/PROJECT.md`.
- [2026-02-09] Face-guided crop framing (best-effort, optional OpenCV) with `/api/health` diagnostics and UI surfacing.
  - Evidence: `src/ai_headshot_studio/processing.py` (`face_subject_bbox`, `focus_bbox`), `src/ai_headshot_studio/app.py` (`face_framing_diagnostics`), `src/ai_headshot_studio/static/index.html` + `src/ai_headshot_studio/static/app.js` (diagnostics row), `pyproject.toml` (optional `face` extra), `tests/test_processing.py` (focus propagation).
- [2026-02-09] Batch CLI helper for processing folders to `outputs/` with optional ZIP and `errors.json` report.
  - Evidence: `scripts/batch_cli.py`, `tests/test_batch_cli.py`, `README.md`, `docs/PROJECT.md`.
- [2026-02-09] WebP output support across API + UI with feature detection (`webp_unavailable`) when encoder is unavailable.
  - Evidence: `src/ai_headshot_studio/processing.py` (`to_bytes` WebP branch), `src/ai_headshot_studio/app.py` (content-type + ZIP ext mapping), `src/ai_headshot_studio/static/index.html` + `src/ai_headshot_studio/static/app.js` (format dropdown + quality enablement), `README.md` (API docs), `tests/test_processing.py` + `tests/test_api.py`.
- [2026-02-09] Headroom control made intuitive in UI (RTL slider + display inversion) + docs corrected for `top_bias`.
  - Evidence: `src/ai_headshot_studio/static/index.html` (`topBias` range is RTL + visible value is headroom), `src/ai_headshot_studio/static/styles.css` (`.range--rtl`), `src/ai_headshot_studio/static/app.js` (headroom display inversion), `README.md` (`top_bias` semantics).
- [2026-02-09] Subject-guided crop framing using alpha mask foreground bounds when available.
  - Evidence: `src/ai_headshot_studio/processing.py` (`alpha_foreground_bbox`, focus-aware crop), `tests/test_processing.py` (focus bbox coverage).
- [2026-02-09] Reject oversized images (> `MAX_PIXELS`) before full decode to mitigate decompression-bomb style inputs.
  - Evidence: `src/ai_headshot_studio/processing.py` (pre-decode pixel guard + `DecompressionBombError` mapping), `tests/test_processing.py` (oversize fixture).
- [2026-02-09] Fixed malformed bullet indentation in `CHANGELOG.md` “Added” list.
  - Evidence: `CHANGELOG.md`.
- [2026-02-09] Batch robustness improvements: continue-on-error ZIP reports + total batch size cap + UI surfaced limits and success/failure counts.
  - Evidence: `src/ai_headshot_studio/app.py` (`continue_on_error`, `errors.json`, batch size cap + headers), `tests/test_api.py` (continue-on-error + cap coverage), `src/ai_headshot_studio/static/app.js` + `src/ai_headshot_studio/static/index.html` (limits hint, total bytes selection, succeeded/failed messaging), `README.md` (API doc).
- [2026-02-09] Hardened upload validation + structured API error payloads (`code`, `message`).
  - Evidence: `src/ai_headshot_studio/processing.py` (format allowlist), `src/ai_headshot_studio/app.py` (structured `detail`), `tests/test_api.py` (invalid bytes + GIF rejection).
- [2026-02-09] Preset bundle import validation + conflict handling (overwrite toggle + summary toast).
  - Evidence: `src/ai_headshot_studio/static/index.html` (`bundleOverwrite` toggle), `src/ai_headshot_studio/static/app.js` (`sanitizeImportedSettings`, import summary).
- [2026-02-09] Docker health checks wired to `/api/health`.
  - Evidence: `Dockerfile` (`HEALTHCHECK`).
- [2026-02-09] Batch processing MVP (multi-upload to server-side ZIP download).
  - Evidence: `src/ai_headshot_studio/app.py` (`POST /api/batch`), `tests/test_api.py` (ZIP assertions), `scripts/smoke_api.sh` (batch smoke).
- [2026-02-09] Preset bundle library (saved named profiles) + bundle export/import (JSON).
  - Evidence: `src/ai_headshot_studio/static/index.html` (Profiles card), `src/ai_headshot_studio/static/app.js` (profile storage + bundle import/export), `src/ai_headshot_studio/static/styles.css` (profile UI styles).
- [2026-02-09] Profile suggestions (auto-name on save when input is blank) based on use-case / preset / format.
  - Evidence: `src/ai_headshot_studio/static/app.js` (`suggestProfileName`, `saveProfile()` uses suggestion), `src/ai_headshot_studio/static/index.html` (Profiles UI).
- [2026-02-09] Structured runtime diagnostics endpoint for production visibility.
  - Evidence: `src/ai_headshot_studio/app.py` (`/api/health`, dependency-safe background-removal diagnostics).
- [2026-02-09] Startup diagnostics panel in the web studio.
  - Evidence: `src/ai_headshot_studio/static/index.html`, `src/ai_headshot_studio/static/app.js`, `src/ai_headshot_studio/static/styles.css` (`System diagnostics` card + health fetch/render).
- [2026-02-09] Pre-process export estimator in the UI.
  - Evidence: `src/ai_headshot_studio/static/app.js` (`queueEstimate`, canvas size estimation), `src/ai_headshot_studio/static/index.html` (`estimateMeta`).
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
  - Evidence: `src/ai_headshot_studio/static/index.html`, `src/ai_headshot_studio/static/app.js`, `src/ai_headshot_studio/static/styles.css`.
- [2026-02-08] Stable export history download links + URL cleanup.
  - Evidence: `src/ai_headshot_studio/static/app.js` (`clearHistory`, separate history object URLs, unload/reset cleanup).
- [2026-02-08] Added request/processing edge-case tests.
  - Evidence: `tests/test_processing.py` (`11 passed` via `make check`).

## Gap Map (Cycle 1, Refreshed 2026-02-11)
- Missing: deterministic visual regression smoke for `src/ai_headshot_studio/static/` interaction flows.
- Weak: warning-only quality signals are currently only on `/api/process`; batch warning manifests are still basic (`errors.json` only for hard failures).
- Parity: batch ZIP export with partial-failure continuation, print sheet exports, WebP output option, diagnostics surfaced in UI.
- Differentiator: local-only processing + optional local dependencies (no remote calls), warning-first quality guardrails that never block output generation.

## Insights
- CI failures were caused by Make targets hardcoding `.venv/bin/*` while GitHub Actions installs dependencies into the runner Python environment.
- History URLs must be independent from the active preview URL; otherwise revoking preview URLs breaks older history downloads.
- Preset portability is low-friction when JSON payloads include both style key and explicit slider values.
- Health diagnostics should avoid importing `rembg` directly: `rembg` can call `sys.exit(1)` when ONNX runtime support is missing.
- Background removal in the processing path must also guard against `SystemExit` from optional backends; map to `background_removal_unavailable` instead of terminating the worker.
- A dedicated smoke command (`make smoke`) catches startup/runtime regressions earlier than unit tests alone.
- GitHub Actions annotations can surface near-term maintenance debt before it becomes a failing check.
- `top_bias` is easier to reason about as “crop shift” while the UI can show an inverted “Headroom” value (headroom = `1 - top_bias`).
- Alpha-mask foreground bounds provide a lightweight “good enough” framing hint without requiring face-detection dependencies.
- WebP output support depends on the Pillow build; a stable `webp_unavailable` error keeps behavior predictable when encoders are missing.
- Optional face framing is best-effort and should never fail the processing pipeline when the dependency is missing or detection fails.
- Market baseline: batch workflows commonly export a single ZIP and let users choose output format and folder name; “keep original background” is a common batch toggle.
- Market baseline: common web tools cap image size (example: Canva Background Remover works under ~9MB and downscales to 10MP).
- Market baseline sources (untrusted): PhotoRoom batch format options + naming (`https://help.photoroom.com/en/articles/12137322-edit-multiple-photos-with-the-batch-feature-web-app`), PhotoRoom “original background” template (`https://help.photoroom.com/en/articles/12818584-keep-the-original-background-when-using-the-batch-feature`), remove.bg upload limits (`https://www.remove.bg/it/help/a/what-is-the-maximum-image-resolution-file-size`), Canva background remover limits (`https://www.canva.com/learn/background-remover/`).
- Market baseline sources (untrusted): remove.bg API format options + crop/position controls (`https://www.remove.bg/api`), remove.bg blog (ROI/crop/position knobs) (`https://www.remove.bg/et/b/mastering-remove-bg-api`), PFPMaker headshot generator positioning (background/style variants) (`https://pfpmaker.com/headshot-generator`).
- Market baseline sources (untrusted, refreshed 2026-02-10): remove.bg API result customization (`https://www.remove.bg/help/a/how-can-i-customize-my-api-results.zst`), PhotoRoom batch docs (`https://help.photoroom.com/en/articles/12137322-edit-multiple-images-at-once-with-the-batch-feature-web-app`).
- Market scan (untrusted, refreshed 2026-02-11): remove.bg API customization options (`https://www.remove.bg/api`), PhotoRoom batch workflow docs (`https://help.photoroom.com/en/articles/12137322-edit-multiple-images-at-once-with-the-batch-feature-web-app`), Canva background remover limits (`https://www.canva.com/help/article/canva-background-remover`), PFPMaker headshot generator positioning (`https://pfpmaker.com/headshot-generator`).
- Product insight: warning-only quality checks are easier to ship safely than hard validation gates; users keep output flow while still getting corrective guidance.
- Product insight: client-side print sheet generation is a high-leverage UX improvement because it avoids backend complexity and keeps privacy guarantees intact.

## Notes
- This file is maintained by the autonomous clone loop.
