#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
SEED_FILE="$ROOT_DIR/database/seed/001_test_values.sql"
DB_SERVICE="${DB_SERVICE:-db}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-citizen_requests}"
FRESH_START=false

cleanup() {
  echo
  echo "Stopping frontend/backend..."
  if [[ -n "${FRONTEND_PID:-}" ]]; then kill "$FRONTEND_PID" >/dev/null 2>&1 || true; fi
  if [[ -n "${BACKEND_PID:-}" ]]; then kill "$BACKEND_PID" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT INT TERM

if [[ "${1:-}" == "--fresh" ]]; then
  FRESH_START=true
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required" >&2
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required" >&2
  exit 1
fi

# Start DB container for the backend.
cd "$ROOT_DIR"
docker compose up -d "$DB_SERVICE" >/dev/null

echo "Waiting for PostgreSQL to be ready..."
until docker compose exec -T "$DB_SERVICE" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
  sleep 1
done

if [[ "$FRESH_START" == "true" ]]; then
  echo "Fresh mode: resetting database and applying current_schema.sql..."
  "$ROOT_DIR/scripts/reset_db.sh" >/dev/null
else
  echo "Skipping DB reset (default mode). Use --fresh to reset DB."
  schema_ready="$(docker compose exec -T "$DB_SERVICE" psql -U "$DB_USER" -d "$DB_NAME" -Atc "SELECT to_regclass('public.citizen_request') IS NOT NULL;")"
  if [[ "$schema_ready" != "t" ]]; then
    echo "Database schema not initialized. Run: ./scripts/run_fullstack.sh --fresh" >&2
    exit 1
  fi
fi

if [[ ! -f "$SEED_FILE" ]]; then
  echo "Seed file not found: $SEED_FILE" >&2
  exit 1
fi

echo "Seeding database test values..."
docker compose exec -T "$DB_SERVICE" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f /dev/stdin < "$SEED_FILE" >/dev/null

# Backend setup.
if [[ ! -d "$BACKEND_DIR/.venv" ]]; then
  echo "Creating backend virtual environment..."
  python3 -m venv "$BACKEND_DIR/.venv"
fi

# shellcheck disable=SC1091
source "$BACKEND_DIR/.venv/bin/activate"
if ! python -c "import fastapi, sqlalchemy, psycopg" >/dev/null 2>&1; then
  echo "Installing backend dependencies..."
  pip install -e "$BACKEND_DIR"[dev]
fi

# Frontend setup.
if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "Installing frontend dependencies..."
  cd "$FRONTEND_DIR"
  npm install --no-audit --no-fund >/dev/null
fi

# Start backend.
cd "$BACKEND_DIR"
export DATABASE_URL="${DATABASE_URL:-postgresql+psycopg://postgres:postgres@localhost:5432/citizen_requests}"
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

# Start frontend.
cd "$FRONTEND_DIR"
npm run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!

echo "Backend:  http://localhost:8000"
echo "Swagger:  http://localhost:8000/docs"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop both services."

wait "$BACKEND_PID" "$FRONTEND_PID"
