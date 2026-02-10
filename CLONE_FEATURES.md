# Clone Feature Tracker

## Context Sources
- README and docs
- TODO/FIXME markers in code
- Test and build failures
- Gaps found during codebase exploration
- GitHub issues by `sarveshkapre`/trusted bots (none open as of 2026-02-10)
- GitHub Actions signals (`21579321573` historical failure root-caused; latest runs green)

## Candidate Features To Do
### Selected (Cycle 1)
- [x] P1: Harden background removal against `SystemExit` from `rembg` import/runtime and return a stable `background_removal_unavailable` error instead of crashing the request (add unit tests).
- [x] P2: Add a deterministic static UI contract test (assert critical `src/ai_headshot_studio/static/index.html` element IDs + `src/ai_headshot_studio/static/app.js` lookups remain valid) to catch accidental frontend regressions in `make check`.
- [x] P3: Add a processing pipeline micro-benchmark script (`make bench`) for a quick local perf guardrail (not a CI gate) and document it.
- [x] P4: Refresh docs/trackers: dedupe backlog, record market scan links (untrusted), and keep `docs/PROJECT.md` “next improvements” aligned with reality.

### Selected (Cycle 5)
- [x] P1: Face-guided crop framing (optional dependency) so framing is strong even without alpha masks; expose availability via `/api/health` and keep a safe fallback.
- [x] P2: Add batch CLI helper (process a folder to `outputs/` + optional ZIP + `errors.json`) for non-UI workflows.
- [x] P3: Add WebP output option with feature detection (return a clear error when encoder is unavailable); update UI + API docs + tests.

### Selected (Cycle 4)
- [x] P1: Fix `top_bias` semantics to match docs/UI (“Headroom”: higher value should yield more headroom) and update tests.
- [x] P1: Add subject-guided crop framing using alpha-mask foreground bounds when available (works for transparent PNGs and `remove_bg` output) with safe fallback to `top_bias`.
- [x] P1: Harden image decoding against decompression-bomb style inputs by rejecting over-`MAX_PIXELS` images before full decode; add regression tests.
- [x] P4: Normalize `CHANGELOG.md` bullet indentation (avoid malformed nested bullets in “Added”).

### Backlog
- [ ] P3: Add visual regression smoke script for `src/ai_headshot_studio/static/` workflow interactions (optional, fast, deterministic).
- [ ] P4: Add skin-tone consistency check (warning-only) for retouch presets.
- [ ] P4: Add print sheet layouts (2x2 / 3x3) for easy at-home prints.
- [ ] P4: Add on-device model selection (tradeoff UX: speed vs quality) for background removal.

## Implemented
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

## Gap Map (Cycle 2, Untrusted-Informed)
- Missing: face-guided crop framing (auto head/face placement), batch CLI for folder workflows, batch continue-on-error report.
- Weak: import surfaces (bundles/presets) need ongoing hardening as sharing expands; Docker verification is currently untested locally (no Docker).
- Parity: batch ZIP export, saved profiles + bundles, crop presets/headroom control, predictable export metadata.
- Differentiator: local-first privacy posture (no accounts/no third-party uploads), offline-ready static UI after setup.

## Gap Map (Cycle 5)
- Missing: visual regression smoke script for `src/ai_headshot_studio/static/`.
- Weak: face framing still best-effort (optional dependency); should remain conservative and always fall back cleanly.
- Parity: WebP output option, batch ZIP workflow, diagnostics surfaced in UI.
- Differentiator: local-only processing + optional local dependencies (no remote calls).

## Gap Map (Cycle 1)
- Missing: visual regression smoke script for `src/ai_headshot_studio/static/` workflow interactions (screenshots), skin-tone consistency check, print sheet layouts.
- Weak: optional background removal dependencies are still best-effort across environments; keep error mapping stable and avoid crashes.
- Parity: batch ZIP workflow, WebP output option, diagnostics surfaced in UI.
- Differentiator: local-only processing + optional local dependencies (no remote calls).

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

## Notes
- This file is maintained by the autonomous clone loop.
