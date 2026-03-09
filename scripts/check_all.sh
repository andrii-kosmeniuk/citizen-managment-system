#!/usr/bin/env bash
set -euo pipefail

FAST_MODE=false
if [[ "${1:-}" == "--fast" ]]; then
  FAST_MODE=true
fi

./scripts/check_backend.sh
./scripts/check_frontend.sh

if [[ "${FAST_MODE}" == "false" ]]; then
  ./scripts/security_scan.sh
else
  echo "Fast mode: skipping security scan"
fi

echo "All checks passed!"
