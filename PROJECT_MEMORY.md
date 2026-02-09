# Project Memory

## Decisions

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
