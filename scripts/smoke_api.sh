#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"
PORT="${PORT:-8010}"
TMP_DIR="$(mktemp -d)"
SERVER_PID=""

cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

cd "${ROOT_DIR}"

"${PYTHON_BIN}" -m uvicorn ai_headshot_studio.app:app --port "${PORT}" --log-level warning >"${TMP_DIR}/server.log" 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:${PORT}/api/health" >"${TMP_DIR}/health.json" 2>/dev/null; then
    break
  fi
  sleep 0.2
done

if ! grep -q '"status":"ok"' "${TMP_DIR}/health.json"; then
  echo "Health endpoint did not report ok"
  cat "${TMP_DIR}/health.json" || true
  exit 1
fi

"${PYTHON_BIN}" - <<'PY' "${TMP_DIR}/input.png"
import sys
from PIL import Image

output = sys.argv[1]
Image.new("RGB", (1200, 1600), (130, 150, 170)).save(output, format="PNG")
PY

curl -fsS \
  -D "${TMP_DIR}/headers.txt" \
  -o "${TMP_DIR}/output.jpg" \
  -F "image=@${TMP_DIR}/input.png" \
  -F "remove_bg=false" \
  -F "background=white" \
  -F "preset=passport-2x2" \
  -F "format=jpeg" \
  "http://127.0.0.1:${PORT}/api/process"

grep -qi '^x-output-format: jpeg' "${TMP_DIR}/headers.txt"
grep -qi '^x-output-width: 600' "${TMP_DIR}/headers.txt"
grep -qi '^x-output-height: 600' "${TMP_DIR}/headers.txt"

"${PYTHON_BIN}" - <<'PY' "${TMP_DIR}/output.jpg"
import sys
from PIL import Image

image = Image.open(sys.argv[1])
if image.size != (600, 600):
    raise SystemExit(f"Unexpected output size: {image.size}")
print("smoke ok: 600x600 jpeg")
PY
