#!/usr/bin/env bash
set -euo pipefail

VERSION="${GITLEAKS_VERSION:-8.24.2}"
VERSION="${VERSION#v}"
BIN_DIR="${GITLEAKS_BIN_DIR:-$HOME/.local/bin}"
BIN_PATH="${BIN_DIR}/gitleaks"

install_gitleaks() {
  local os
  local arch
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  arch="$(uname -m)"

  case "${arch}" in
    x86_64) arch="x64" ;;
    aarch64|arm64) arch="arm64" ;;
    *)
      echo "Unsupported architecture for gitleaks install: ${arch}" >&2
      exit 1
      ;;
  esac

  case "${os}" in
    linux|darwin) ;;
    *)
      echo "Unsupported OS for gitleaks install: ${os}" >&2
      exit 1
      ;;
  esac

  local archive
  local url
  local tmp_dir
  archive="gitleaks_${VERSION}_${os}_${arch}.tar.gz"
  url="https://github.com/gitleaks/gitleaks/releases/download/v${VERSION}/${archive}"
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "${tmp_dir}"' RETURN

  curl -fsSL -o "${tmp_dir}/${archive}" "${url}"
  tar -xzf "${tmp_dir}/${archive}" -C "${tmp_dir}"
  mkdir -p "${BIN_DIR}"
  install -m 0755 "${tmp_dir}/gitleaks" "${BIN_PATH}"
}

if command -v gitleaks >/dev/null 2>&1; then
  GITLEAKS_BIN="$(command -v gitleaks)"
elif [[ -x "${BIN_PATH}" ]]; then
  GITLEAKS_BIN="${BIN_PATH}"
else
  install_gitleaks
  GITLEAKS_BIN="${BIN_PATH}"
fi

"${GITLEAKS_BIN}" version
"${GITLEAKS_BIN}" dir --no-banner --redact --exit-code 1 .
