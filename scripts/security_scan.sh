#!/usr/bin/env bash
set -euo pipefail

if command -v trivy >/dev/null 2>&1; then
  trivy fs --severity CRITICAL,HIGH --exit-code 1 .
else
  echo "trivy not installed; skipping security scan"
fi
