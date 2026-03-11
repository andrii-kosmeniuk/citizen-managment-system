#!/usr/bin/env bash
set -euo pipefail

DB_SERVICE="${DB_SERVICE:-db}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-citizen_requests}"
CURRENT_SCHEMA_FILE="${CURRENT_SCHEMA_FILE:-database/current_schema.sql}"

if [[ ! -f "$CURRENT_SCHEMA_FILE" ]]; then
  echo "Current schema file not found: $CURRENT_SCHEMA_FILE" >&2
  exit 1
fi

echo "Starting database container..."
docker compose up -d "$DB_SERVICE"

echo "Waiting for PostgreSQL to be ready..."
until docker compose exec -T "$DB_SERVICE" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
  sleep 1
done

echo "Resetting schema public in database '$DB_NAME'..."
docker compose exec -T "$DB_SERVICE" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"

echo "Applying canonical schema snapshot: $CURRENT_SCHEMA_FILE"
docker compose exec -T "$DB_SERVICE" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f /dev/stdin < "$CURRENT_SCHEMA_FILE"

echo "Database reset and current schema applied successfully."
