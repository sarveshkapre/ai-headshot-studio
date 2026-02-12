# Incidents

## 2026-02-11 | Skin-tone warning heuristic initially missed strong retouch shifts
- Severity: Low.
- Status: Resolved.
- Trigger: Local `make test` run while adding warning-only skin-tone consistency checks.
- Impact:
  - `tests/test_processing.py::test_detect_skin_tone_warning_emits_warning_for_large_chroma_shift` failed.
  - Warning coverage would have under-reported aggressive retouch shifts for some images.
- Root cause:
  - The first heuristic version required both pre- and post-adjustment frames to satisfy the skin mask.
  - Large retouch shifts can move post-adjustment pixels outside the mask, suppressing the warning.
- Detection evidence:
  - Failing command: `make test`.
  - Error signature: `assert None is not None` for `detect_skin_tone_warning(...)`.
- Fix implemented:
  - Anchored skin mask eligibility to the pre-adjusted frame and compared pre-vs-post chroma on the same pixel set.
  - Added tests for direct warning detection and `/api/process` warning header propagation.
  - Commit: `98a2737d73380bf0a14b796cf408e96bfb20bbd7`.
- Prevention rules:
  1. For before/after quality heuristics, derive sample masks from the baseline frame only.
  2. Add at least one synthetic regression test that forces a clear warning-path activation.

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

### 2026-02-12T20:01:14Z | Codex execution failure
- Date: 2026-02-12T20:01:14Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-ai-headshot-studio-cycle-2.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:04:42Z | Codex execution failure
- Date: 2026-02-12T20:04:42Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-ai-headshot-studio-cycle-3.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:08:09Z | Codex execution failure
- Date: 2026-02-12T20:08:09Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-ai-headshot-studio-cycle-4.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:11:39Z | Codex execution failure
- Date: 2026-02-12T20:11:39Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-ai-headshot-studio-cycle-5.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:15:08Z | Codex execution failure
- Date: 2026-02-12T20:15:08Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-ai-headshot-studio-cycle-6.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:18:40Z | Codex execution failure
- Date: 2026-02-12T20:18:40Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-ai-headshot-studio-cycle-7.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:22:05Z | Codex execution failure
- Date: 2026-02-12T20:22:05Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-ai-headshot-studio-cycle-8.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:25:36Z | Codex execution failure
- Date: 2026-02-12T20:25:36Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-ai-headshot-studio-cycle-9.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:29:12Z | Codex execution failure
- Date: 2026-02-12T20:29:12Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-ai-headshot-studio-cycle-10.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:32:45Z | Codex execution failure
- Date: 2026-02-12T20:32:45Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-ai-headshot-studio-cycle-11.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:36:11Z | Codex execution failure
- Date: 2026-02-12T20:36:11Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-ai-headshot-studio-cycle-12.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:39:40Z | Codex execution failure
- Date: 2026-02-12T20:39:40Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-ai-headshot-studio-cycle-13.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:43:08Z | Codex execution failure
- Date: 2026-02-12T20:43:08Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-ai-headshot-studio-cycle-14.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:46:40Z | Codex execution failure
- Date: 2026-02-12T20:46:40Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-ai-headshot-studio-cycle-15.log
- Commit: pending
- Confidence: medium
