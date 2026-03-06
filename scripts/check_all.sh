#!/usr/bin/env bash
set -euo pipefail

./scripts/check_backend.sh
./scripts/check_frontend.sh
