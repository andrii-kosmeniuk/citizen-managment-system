#!/usr/bin/env bash
set -euo pipefail

DB_SERVICE="${DB_SERVICE:-db}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-citizen_requests}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-database/migrations}"

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "Migrations directory not found: $MIGRATIONS_DIR" >&2
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

mapfile -t migrations < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' | sort)
if [[ "${#migrations[@]}" -eq 0 ]]; then
  echo "No SQL migrations found in $MIGRATIONS_DIR" >&2
  exit 1
fi

for migration_file in "${migrations[@]}"; do
  echo "Applying migration: $migration_file"
  docker compose exec -T "$DB_SERVICE" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f /dev/stdin < "$migration_file"
done

echo "Database reset and migration applied successfully."
