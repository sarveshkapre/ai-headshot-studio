# Project Memory

## Decisions

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

### 2026-02-09
- `make check` (pass) — `17 passed`
- `node --check static/app.js` (pass)
- `make smoke` (pass) — output includes `smoke ok: 600x600 jpeg` and `batch smoke ok: 2x 600x600 jpeg in zip`
- `make build` (pass) — built `ai_headshot_studio-0.1.0.tar.gz` and `ai_headshot_studio-0.1.0-py3-none-any.whl`

## Market Scan Notes (Untrusted)

### 2026-02-09
- PhotoRoom positions a batch workflow with a ZIP download and per-batch output options; includes toggles like “Keep original background”. Source: `https://www.photoroom.com/tools/batch-mode`
- Canva background remover help docs describe input limits (example: <9MB, downscales to 10MP). Source: `https://www.canva.com/help/background-remover/`
