#!/usr/bin/env bash
set -euo pipefail

cd backend
source .venv/bin/activate
ruff check app tests
pytest -q
