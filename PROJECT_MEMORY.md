# Project Memory

## Decisions

### 2026-02-10 | Harden background removal against `SystemExit` from `rembg`
- Decision: Guard `rembg` import/runtime inside the processing pipeline against `SystemExit` and map failures to a stable `background_removal_unavailable` ProcessingError.
- Why: Some `rembg` installs can terminate the process with `sys.exit(1)` when an ONNX backend is missing; requests must never crash the worker.
- Evidence:
  - Code: `src/ai_headshot_studio/processing.py` (`remove_background` uses `importlib.import_module` + `SystemExit` handling).
  - Tests: `tests/test_processing.py` (covers `SystemExit` on import and on `remove()` call).
- Validation:
  - `make check` (pass) — `33 passed in 0.92s`
  - `make smoke` (pass) — `smoke ok: 600x600 jpeg` / `batch smoke ok: 2x 600x600 jpeg in zip`
- Commit: `602dd3b87da8520465b617241f469c9387f044b2`.
- Confidence: High.
- Trust label: `verified-local`.

### 2026-02-10 | Add deterministic static UI contract tests for `getElementById(...)` IDs
- Decision: Add a pytest contract test that asserts `static/app.js` `getElementById(...)` targets exist in `static/index.html` and that `index.html` has no duplicate IDs.
- Why: This catches a common class of accidental frontend regressions without needing a browser runner.
- Evidence:
  - Tests: `tests/test_static_contract.py`.
- Validation:
  - `make check` (pass) — `33 passed in 0.92s`
- Commit: `cba26ae7278ca07a3f5fbc2f601d2aa50e18608b`.
- Confidence: High.
- Trust label: `verified-local`.

### 2026-02-10 | Add `make bench` processing micro-benchmark (local guardrail)
- Decision: Add `scripts/bench_processing.py` and `make bench` to provide a quick local performance signal for the end-to-end processing pipeline.
- Why: A tiny micro-benchmark gives a fast sanity check when iterating on the processing path, without turning perf into a flaky CI gate.
- Evidence:
  - Script: `scripts/bench_processing.py`.
  - Build tooling: `Makefile` (`bench` target).
  - Docs: `docs/PROJECT.md` (documents `make bench`).
- Validation:
  - `make bench` (pass) — `bench_processing: 1800x2400 ... p50_ms=88.4 ...`
- Commit: `f0b7d2aaa2c5561dd47fa6dc6e785b0e1677ddf3`.
- Confidence: Medium-high (numbers vary by machine; script is best-effort).
- Trust label: `verified-local`.

### 2026-02-09 | Face-guided crop framing (optional OpenCV, safe fallback)
- Decision: Add best-effort face-guided crop framing via an optional OpenCV Haar-cascade detector, and use it as a focus hint when alpha-mask foreground bounds are unavailable; expose availability via `/api/health` and surface it in the UI diagnostics panel.
- Why: Crop presets are materially better when the subject’s face is used as the framing anchor, especially for non-transparent photos where alpha-mask guidance is absent.
- Evidence:
  - Code: `src/ai_headshot_studio/processing.py` (`face_subject_bbox`, `focus_bbox` integration in `process_image`).
  - API: `src/ai_headshot_studio/app.py` (`face_framing_diagnostics` in `/api/health`).
  - UI: `static/index.html`, `static/app.js` (diagnostics row).
  - Packaging: `pyproject.toml` (optional `face` extra).
  - Tests: `tests/test_processing.py` (focus bbox selection + propagation into crop call).
- Validation:
  - `make check` (pass) — `26 passed in 0.48s`
- Commit: `dd1e2007a388b0e22a2e35e82d96a5b23a60a327`.
- Confidence: Medium-high (detector is optional/best-effort; framing always falls back cleanly).
- Trust label: `verified-local`.

### 2026-02-09 | Batch CLI helper for folder workflows
- Decision: Add a local batch CLI helper to apply studio settings to a folder of images, writing outputs to `outputs/` and optionally producing a ZIP plus `errors.json` when continuing on error.
- Why: Batch is a baseline workflow; a CLI path reduces friction for non-UI and automation use cases while reusing the same server processing pipeline.
- Evidence:
  - Code: `scripts/batch_cli.py`.
  - Tests: `tests/test_batch_cli.py`.
  - Docs: `README.md`, `docs/PROJECT.md`.
- Validation:
  - `make check` (pass) — `28 passed in 0.68s`
- Commit: `34deed4632e2db0f24235152ee2d0c5b930c64c7`.
- Confidence: High.
- Trust label: `verified-local`.

### 2026-02-09 | WebP output support with feature detection
- Decision: Support `format=webp` for `/api/process` and `/api/batch` (ZIP extension mapping), and add a WebP option in the UI; detect missing WebP encoder support and return a stable `webp_unavailable` error.
- Why: WebP is a common export format for web workflows and can reduce output size while keeping acceptable quality.
- Evidence:
  - Code: `src/ai_headshot_studio/processing.py` (`normalize_output_format` + WebP encoder branch in `to_bytes`), `src/ai_headshot_studio/app.py` (content-type mapping, batch ext mapping).
  - UI: `static/index.html`, `static/app.js` (WebP option + quality behavior).
  - Docs: `README.md` (API format docs), `CHANGELOG.md`, `docs/ROADMAP.md` (face framing marked shipped).
  - Tests: `tests/test_processing.py` (feature-detected WebP encoding), `tests/test_api.py` (WebP request accepts or reports `webp_unavailable`).
- Validation:
  - `make check` (pass) — `29 passed in 0.75s`
  - `make smoke` (pass) — output includes `smoke ok: 600x600 jpeg` and `batch smoke ok: 2x 600x600 jpeg in zip`
  - `make build` (pass) — built `ai_headshot_studio-0.1.0.tar.gz` and `ai_headshot_studio-0.1.0-py3-none-any.whl`
- Commit: `c5bedd48fd8cd9a42fd2571e6e5f41ab22cfab7d`.
- Confidence: High.
- Trust label: `verified-local`.

### 2026-02-09 | Batch robustness: continue-on-error reports + total size cap
- Decision: Add `/api/batch` `continue_on_error=true` mode that returns a ZIP including an `errors.json` report (instead of failing the whole batch), add `X-Batch-Succeeded` / `X-Batch-Failed` headers, and enforce a total batch upload size cap (sum of bytes).
- Why: Batch workflows shouldn’t require perfect inputs; one corrupt/invalid image should not discard other successful outputs. The total-size cap keeps server memory and runtime bounded for large selections.
- Evidence:
  - API: `src/ai_headshot_studio/app.py` (`continue_on_error`, `errors.json` report, total batch byte cap, new batch headers, `/api/health` limits).
  - Tests: `tests/test_api.py` (continue-on-error ZIP + report assertions, total-size cap rejection).
  - UI: `static/index.html`, `static/app.js` (batch limit hint from `/api/health`, client-side total-byte enforcement, succeeded/failed messaging).
  - Docs: `README.md`, `CHANGELOG.md`.
- Validation:
  - `make check` (pass) — `21 passed in 0.42s`
  - `make smoke` (pass) — output includes `batch smoke ok: 2x 600x600 jpeg in zip`
  - `node --check static/app.js` (pass)
- Commits: `f7dfd0616e59ff27df3051a4fc3fe6878bd37dfc`, `23c37ad5e76d1e24d6766aa19a3e6ce544f860a6`.
- Confidence: High.
- Trust label: `verified-local`.

### 2026-02-09 | Make headroom control intuitive while keeping `top_bias` stable
- Decision: Keep API/storage using `top_bias` (lower => more headroom), but make the UI “Headroom” slider intuitive by reversing range direction (RTL) and displaying `headroom = 1 - top_bias`.
- Why: Improves UX without breaking the API contract; avoids confusing “slider moves the wrong way” behavior.
- Evidence:
  - UI: `static/index.html` (`topBias` range is RTL), `static/styles.css` (`.range--rtl`), `static/app.js` (inverted display value).
  - Docs: `README.md` (correct `top_bias` semantics).
- Validation:
  - `node --check static/app.js` (pass)
  - `make check` (pass) — `21 passed in 0.60s`
- Commit: `52eda75e8a3857ed7370c353d3e3346d80c86182`.
- Confidence: High.
- Trust label: `verified-local`.

### 2026-02-09 | Subject-guided crop framing via alpha foreground bounds
- Decision: When an alpha channel is present (transparent PNGs and background-removed outputs), derive a conservative foreground bounding box and use it to bias crop framing toward the subject.
- Why: Provides a lightweight “good enough” framing improvement without adding heavy face-detection dependencies; improves results for `remove_bg` workflows.
- Evidence:
  - Code: `src/ai_headshot_studio/processing.py` (`alpha_foreground_bbox`, `crop_to_aspect_focus`, process pipeline focus capture).
  - Tests: `tests/test_processing.py` (focus bbox keeps foreground in frame; bbox detection).
- Validation:
  - `make check` (pass) — `23 passed in 0.44s`
- Commit: `9463aa3d410b15cd4dd1c8d9e412c547f35db34b`.
- Confidence: Medium-high (heuristic by design; safe fallback).
- Trust label: `verified-local`.

### 2026-02-09 | Pre-decode pixel guardrail for oversized inputs
- Decision: Reject images with dimensions exceeding `MAX_PIXELS` before calling `image.load()`; map PIL decompression-bomb errors to a stable `image_too_large` code.
- Why: Prevents decompression-bomb style inputs from consuming excessive memory/CPU during decode.
- Evidence:
  - Code: `src/ai_headshot_studio/processing.py` (pre-decode dimension check, `DecompressionBombError` handling).
  - Tests: `tests/test_processing.py` (oversized PNG fixture rejection).
- Validation:
  - `make check` (pass) — `24 passed in 0.45s`
  - `make smoke` (pass) — `smoke ok: 600x600 jpeg` / `batch smoke ok: 2x 600x600 jpeg in zip`
- Commit: `ecf56648f19f0369358a7d9abdf52a15e84b7907`.
- Confidence: High.
- Trust label: `verified-local`.

### 2026-02-09 | Structured API errors + stricter server-side upload validation
- Decision: Return structured API error payloads (`detail.code`, `detail.message`) and enforce server-side image validation via format sniffing + allowlist.
- Why: Improves UX (client can surface consistent messages) and hardens the API against spoofed content-types and non-image uploads.
- Evidence:
  - Code: `src/ai_headshot_studio/app.py` (`api_detail`, structured `HTTPException.detail`), `src/ai_headshot_studio/processing.py` (input format allowlist).
  - Tests: `tests/test_api.py` (invalid bytes + GIF rejection, structured error assertions).
  - UI: `static/app.js` (parses structured errors for `/api/process` and `/api/batch`).
- Validation:
  - `make check` (pass) — `19 passed`
  - `make smoke` (pass)
  - `node --check static/app.js` (pass)
- Commit: `6bfc8d337b18b2a4b9a20a4d11d8c98b0dbe8f19`.
- Confidence: High.
- Trust label: `verified-local`.

### 2026-02-09 | Bundle import validation + conflict handling toggle
- Decision: Validate profile bundle imports (basic schema checks + settings sanitization) and add an “overwrite conflicts” toggle; show a summary message after import.
- Why: Bundles are a sharing surface; validation prevents broken settings from being stored, and conflict handling reduces friction when importing into an existing library.
- Evidence:
  - Code: `static/index.html` (`bundleOverwrite`), `static/app.js` (`sanitizeImportedSettings`, import summary, overwrite behavior).
- Validation:
  - `node --check static/app.js` (pass)
- Commit: `6bfc8d337b18b2a4b9a20a4d11d8c98b0dbe8f19`.
- Confidence: Medium-high.
- Trust label: `verified-local`.

### 2026-02-09 | Docker healthcheck for `/api/health`
- Decision: Add a Docker `HEALTHCHECK` that probes `GET /api/health`.
- Why: Improves production readiness by making container health observable to orchestrators without adding extra endpoints.
- Evidence:
  - Code: `Dockerfile` (`HEALTHCHECK` command).
- Validation:
  - `make smoke` still exercises `/api/health` (pass).
  - Unable to run `docker build` locally in this environment (Docker not installed).
- Commit: `e8c950fd0d6499fbc1d0c26b7d4f991eef0c0e67`.
- Confidence: Medium (runtime unverified here).
- Trust label: `verified-local`.

### 2026-02-09 | Batch processing ZIP workflow
- Decision: Add `POST /api/batch` to process multiple images with the same settings and return a single ZIP download; add a matching Batch panel in the studio UI.
- Why: Batch export is a baseline expectation for background/retouch workflows and materially reduces time-to-value for users processing multiple photos.
- Evidence:
  - Code: `src/ai_headshot_studio/app.py` (`/api/batch`), `static/index.html`, `static/app.js`, `static/styles.css`.
  - Tests: `tests/test_api.py` (ZIP response + image assertions).
  - Smoke: `scripts/smoke_api.sh` (batch ZIP smoke path).
- Validation:
  - `make check` (pass)
  - `make smoke` output includes `batch smoke ok: 2x 600x600 jpeg in zip`
- Commit: `e768501f47f76a9ac7e91c496f598bdd0ac7fbcb`.
- Confidence: High.
- Trust label: `verified-local`.
- Follow-ups:
  - Add “continue on error” mode that returns a ZIP including an `errors.json` report instead of failing the whole batch.
  - Add total batch size limit enforcement (sum of bytes) to keep worst-case memory bounded.

### 2026-02-09 | Saved profiles + bundle export/import
- Decision: Add a local “Profiles” library (named profiles with apply/delete) and a bundle JSON format for exporting/importing multiple profiles at once.
- Why: Users often iterate toward a look and reuse it; named profiles + bundles reduce friction and enable sharing repeatable setups.
- Evidence:
  - Code: `static/index.html` (Profiles card), `static/app.js` (profiles storage + bundle import/export), `static/styles.css` (profiles UI styles).
  - Validation: `node --check static/app.js` (pass)
- Commit: `e768501f47f76a9ac7e91c496f598bdd0ac7fbcb`.
- Confidence: Medium-high.
- Trust label: `verified-local`.
- Follow-ups:
  - Add bundle schema validation + clearer conflict resolution UX (merge/overwrite prompts).
  - Allow “save from use-case” with one-click suggested names.

### 2026-02-09 | Structured health diagnostics contract
- Decision: Expand `GET /api/health` to return structured diagnostics (`status`, `service`, `version`, limits, and background-removal availability) and consume it in the UI diagnostics panel.
- Why: Production readiness needs fast local observability and a stable endpoint contract for smoke checks and frontend status visibility.
- Evidence:
  - Code: `src/ai_headshot_studio/app.py`, `static/index.html`, `static/app.js`, `static/styles.css`.
  - Validation: `make check`, `make smoke`, `node --check static/app.js`.
- Commit: `f12aa32f6cf46e9367b20a824f7c3e0720607af8`.
- Confidence: High.
- Trust label: `verified-local`.
- Follow-ups:
  - Add `/api/health` latency and model warm-state metrics once batch/face-detection work lands.

### 2026-02-09 | Pre-process export predictability
- Decision: Add a debounced client-side estimate of output dimensions and approximate bytes before processing.
- Why: Users frequently tune format/preset choices for constraints (LinkedIn, resume portals), so preflight estimate improves UX without server roundtrips.
- Evidence:
  - Code: `static/app.js` (`queueEstimate`, `estimateOutputGeometry`, `runEstimate`), `static/index.html` (`estimateMeta`).
  - Validation: `make check`, `make smoke`.
- Commit: `f12aa32f6cf46e9367b20a824f7c3e0720607af8`.
- Confidence: Medium-high (approximation by design).
- Trust label: `verified-local`.
- Follow-ups:
  - Calibrate estimator error bounds against real processed outputs on a fixture corpus.

### 2026-02-09 | Repeatable local runtime smoke path
- Decision: Add `make smoke` with `scripts/smoke_api.sh` to start the app, hit `/api/health`, process a real image, and assert output headers/dimensions.
- Why: Unit tests alone miss startup/runtime regressions; this script provides a deterministic quick gate for local and CI-style validation.
- Evidence:
  - Code: `scripts/smoke_api.sh`, `Makefile`.
  - Validation: `make smoke` output `smoke ok: 600x600 jpeg`.
- Commit: `f12aa32f6cf46e9367b20a824f7c3e0720607af8`.
- Confidence: High.
- Trust label: `verified-local`.
- Follow-ups:
  - Add optional CI job for smoke verification after dependency install time is optimized.

### 2026-02-09 | Upgrade CodeQL GitHub Action to v4
- Decision: Move `.github/workflows/codeql.yml` from `github/codeql-action@v3` to `@v4`.
- Why: CI annotation reported v3 deprecation in December 2026; upgrading now avoids deadline-driven maintenance risk.
- Evidence:
  - CI annotation on run `21810971222`.
  - Code: `.github/workflows/codeql.yml`.
- Commit: `de5e0b419f5e173a59f62423dc0c8e5a37b7fe89`.
- Confidence: High.
- Trust label: `ci-verified`.
- Follow-ups:
  - Re-check all automation repos for remaining `codeql-action@v3` usage.

## Verification Evidence
- `make check` (pass) — ruff, mypy, pytest (`33 passed in 0.92s`)
- `make smoke` (pass) — `smoke ok: 600x600 jpeg`; `batch smoke ok: 2x 600x600 jpeg in zip`
- `make bench` (pass) — `bench_processing: 1800x2400 preset=portrait-4x5 format=jpeg iters=12 p50_ms=88.4 p95_ms=90.6 bytes=24186`
- `gh run list --limit 6 --branch main ...` (pass) — latest GitHub Actions runs show `success` for `docs: update tracker and project memory (cycle 1)`

### 2026-02-09
- `make check` (pass) — `26 passed in 0.48s` (after optional face framing changes)
- `make check` (pass) — `28 passed in 0.68s` (after batch CLI changes)
- `make check` (pass) — `29 passed in 0.75s` (after WebP output changes)
- `make smoke` (pass) — output includes `smoke ok: 600x600 jpeg` and `batch smoke ok: 2x 600x600 jpeg in zip`
- `make build` (pass) — built `ai_headshot_studio-0.1.0.tar.gz` and `ai_headshot_studio-0.1.0-py3-none-any.whl`
- `gh run watch 21843128641 --exit-status` (pass) — GitHub Actions `CodeQL` on `main` (WebP push)
- `gh run watch 21843209545 --exit-status` (pass) — GitHub Actions `CI` on `main` (cycle 5 tracker/memory docs push)
- `gh run watch 21843209553 --exit-status` (pass) — GitHub Actions `Secret Scan` on `main` (cycle 5 tracker/memory docs push)
- `make check` (pass) — `19 passed`
- `node --check static/app.js` (pass)
- `make smoke` (pass) — output includes `smoke ok: 600x600 jpeg` and `batch smoke ok: 2x 600x600 jpeg in zip`
- `make build` (pass) — built `ai_headshot_studio-0.1.0.tar.gz` and `ai_headshot_studio-0.1.0-py3-none-any.whl`
- `docker build -t ai-headshot-studio:local .` (fail) — `docker` not installed in this environment
- `make check` (pass) — `21 passed in 0.42s` (rerun after batch robustness changes)
- `make smoke` (pass) — output includes `smoke ok: 600x600 jpeg` and `batch smoke ok: 2x 600x600 jpeg in zip` (rerun after batch robustness changes)
- `make check` (pass) — `24 passed in 0.45s` (after subject-guided crop + pre-decode pixel guard)
- `make smoke` (pass) — output includes `smoke ok: 600x600 jpeg` and `batch smoke ok: 2x 600x600 jpeg in zip` (after pre-decode pixel guard)
- `gh run watch 21825642565 --exit-status` (pass) — GitHub Actions `CI` on `main`
- `gh run watch 21825642558 --exit-status` (pass) — GitHub Actions `CodeQL` on `main`
- `gh run watch 21834774525 --exit-status` (pass) — GitHub Actions `CI` on `main` (cycle 4 pushes)
- `gh run watch 21834774532 --exit-status` (pass) — GitHub Actions `CodeQL` on `main` (cycle 4 pushes)
- `gh run watch 21834774590 --exit-status` (pass) — GitHub Actions `Secret Scan` on `main` (cycle 4 pushes)

## Market Scan Notes (Untrusted)

### 2026-02-09
- PhotoRoom positions a batch workflow with a ZIP download and per-batch output options; includes toggles like “Keep original background”. Source: `https://www.photoroom.com/tools/batch-mode`
- Canva background remover help docs describe input limits (example: <9MB, downscales to 10MP). Source: `https://www.canva.com/help/background-remover/`
- remove.bg API docs show format options and cropping/position controls. Source: `https://www.remove.bg/api`
- PFPMaker markets generated headshots with background/style variants and positioning. Source: `https://pfpmaker.com/headshot-generator`

### 2026-02-09 (Cycle 2) | Batch + limits expectations
- Batch baseline: common batch tools expose output format choices (PNG/JPEG/WEBP) and allow naming/organizing outputs. Source: `https://help.photoroom.com/en/articles/12137322-edit-multiple-photos-with-the-batch-feature-web-app`
- Batch baseline: “keep original background” is presented as a distinct template/option in batch flows. Source: `https://help.photoroom.com/en/articles/12818584-keep-the-original-background-when-using-the-batch-feature`
- Upload limits baseline: tools document maximum input size/resolution and route higher limits to paid tiers. Source: `https://www.remove.bg/it/help/a/what-is-the-maximum-image-resolution-file-size`
- Upload limits baseline: online background remover experiences commonly cap file size (example: ~25MB). Source: `https://www.canva.com/learn/background-remover/`
