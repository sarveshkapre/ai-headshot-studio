# Incidents

## 2026-02-09 | `/api/health` crashed when optional rembg backend was incomplete
- Severity: Medium.
- Status: Resolved.
- Trigger: Local `make check` during API health test execution.
- Impact:
  - `tests/test_api.py::test_health_includes_diagnostics` crashed with `SystemExit(1)`.
  - A runtime environment with `rembg` installed but missing ONNX backend could fail health checks.
- Root cause:
  - Health diagnostics imported `rembg` directly.
  - `rembg` can call `sys.exit(1)` at import time when no ONNX backend is available.
- Detection evidence:
  - Failing command: `make check`.
  - Error signature: `ModuleNotFoundError: No module named 'onnxruntime'` followed by `SystemExit: 1`.
- Fix implemented:
  - Replaced direct `rembg` import with safe dependency inspection (`importlib.util.find_spec("rembg")`) and version lookup via `importlib.metadata`.
  - Added API tests that exercise `GET /api/health` as part of the default check suite.
  - Commit: `f12aa32f6cf46e9367b20a824f7c3e0720607af8`.
- Prevention rules:
  1. Do not import optional heavy runtime dependencies in health/diagnostic endpoints.
  2. For optional integrations, report degraded availability rather than raising exceptions.
  3. Keep one endpoint contract test for each public API surface to catch startup/runtime failures early.
