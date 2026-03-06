#!/usr/bin/env bash
set -euo pipefail

DB_SERVICE="${DB_SERVICE:-db}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-citizen_requests}"

# 1) Migration on empty DB + 2) Reapply via reset script
./scripts/reset_db.sh
./scripts/reset_db.sh

# 3-5) Constraint and workflow validation

docker compose exec -T "$DB_SERVICE" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f /dev/stdin < database/tests/phase1_validation.sql

echo "Phase 1 DB validation passed."
