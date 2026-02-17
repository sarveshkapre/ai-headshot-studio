#!/usr/bin/env bash
set -euo pipefail

required_bins=(bash curl git make tar python3)
missing=()
for bin in "${required_bins[@]}"; do
  if ! command -v "${bin}" >/dev/null 2>&1; then
    missing+=("${bin}")
  fi
done

if ((${#missing[@]} > 0)); then
  echo "Missing required tools for self-hosted CI: ${missing[*]}" >&2
  exit 1
fi

python3 - <<'PY'
import sys

major, minor = sys.version_info[:2]
if (major, minor) < (3, 11):
    raise SystemExit("python3 >= 3.11 is required for CI")
print(f"python3 version ok: {major}.{minor}")
PY

if command -v docker >/dev/null 2>&1; then
  docker --version >/dev/null
  echo "docker available"
else
  echo "docker not found (optional for this repo; required for tools like act/container jobs)"
fi

echo "self-hosted runner prerequisites verified"
