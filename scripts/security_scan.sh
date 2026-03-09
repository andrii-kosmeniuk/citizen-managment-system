#!/usr/bin/env bash
set -euo pipefail

if command -v trivy >/dev/null 2>&1; then
  CACHE_DIR="${TRIVY_CACHE_DIR:-.trivycache}"
  mkdir -p "${CACHE_DIR}"

  trivy fs \
    --cache-dir "${CACHE_DIR}" \
    --scanners vuln \
    --severity CRITICAL,HIGH \
    --ignore-unfixed \
    --exit-code 1 \
    --skip-dirs frontend/node_modules \
    --skip-dirs frontend/dist \
    --skip-dirs backend/.venv \
    --no-progress \
    .
else
  echo "trivy not installed; skipping security scan"
fi
