#!/usr/bin/env sh
set -eu

DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-citizen_requests}"
MAINTENANCE_DB_NAME="${MAINTENANCE_DB_NAME:-postgres}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-/migrations}"
CURRENT_SCHEMA_FILE="${CURRENT_SCHEMA_FILE:-/schema/current_schema.sql}"
SEED_FILE="${SEED_FILE:-/seed/001_test_values.sql}"

export PGPASSWORD="${DB_PASSWORD:-postgres}"

echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$MAINTENANCE_DB_NAME" >/dev/null 2>&1; do
  sleep 1
done

echo "PostgreSQL server is ready."

MAINTENANCE_PSQL="psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${MAINTENANCE_DB_NAME} -v ON_ERROR_STOP=1"

db_exists="$($MAINTENANCE_PSQL -Atc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}' LIMIT 1;")"
if [ "$db_exists" != "1" ]; then
  echo "Creating application database: ${DB_NAME}"
  $MAINTENANCE_PSQL -c "CREATE DATABASE ${DB_NAME};"
fi

PSQL="psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -v ON_ERROR_STOP=1"

# Track one-time applied migrations.
$PSQL -c "CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW());"

has_core_schema="$($PSQL -Atc "SELECT (to_regclass('public.citizen_request') IS NOT NULL AND to_regtype('public.request_status') IS NOT NULL);")"
applied_migrations="$($PSQL -Atc "SELECT COUNT(*) FROM schema_migrations;")"

if [ "$has_core_schema" != "t" ] && [ "$applied_migrations" = "0" ] && [ -f "$CURRENT_SCHEMA_FILE" ]; then
  echo "Empty database detected. Applying canonical schema snapshot: $(basename "$CURRENT_SCHEMA_FILE")"
  $PSQL -f "$CURRENT_SCHEMA_FILE"
  for file in $(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' | sort); do
    filename="$(basename "$file")"
    $PSQL -c "INSERT INTO schema_migrations (filename) VALUES ('${filename}') ON CONFLICT (filename) DO NOTHING;"
  done
fi

for file in $(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' | sort); do
  filename="$(basename "$file")"
  applied="$($PSQL -Atc "SELECT 1 FROM schema_migrations WHERE filename = '${filename}' LIMIT 1;")"
  if [ "$applied" = "1" ]; then
    echo "Skipping already applied migration: ${filename}"
    continue
  fi

  # Bootstrap legacy DB volumes where schema exists but schema_migrations table did not.
  if [ "$filename" = "db_version_001.sql" ]; then
    has_core="$($PSQL -Atc "SELECT (to_regclass('public.citizen_request') IS NOT NULL AND to_regtype('public.request_status') IS NOT NULL);")"
    if [ "$has_core" = "t" ]; then
      echo "Detected existing core schema; marking ${filename} as applied."
      $PSQL -c "INSERT INTO schema_migrations (filename) VALUES ('${filename}');"
      continue
    fi
  fi

  if [ "$filename" = "db_version_002.sql" ]; then
    has_identity="$($PSQL -Atc "SELECT (to_regclass('public.person') IS NOT NULL AND to_regclass('public.role') IS NOT NULL);")"
    if [ "$has_identity" = "t" ]; then
      echo "Detected existing identity schema; marking ${filename} as applied."
      $PSQL -c "INSERT INTO schema_migrations (filename) VALUES ('${filename}');"
      continue
    fi
  fi

  echo "Applying migration: ${filename}"
  $PSQL -f "$file"
  $PSQL -c "INSERT INTO schema_migrations (filename) VALUES ('${filename}');"
done

# Apply seed each run (seed SQL is idempotent for this project).
if [ -f "$SEED_FILE" ]; then
  echo "Applying seed data: $(basename "$SEED_FILE")"
  $PSQL -f "$SEED_FILE"
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
