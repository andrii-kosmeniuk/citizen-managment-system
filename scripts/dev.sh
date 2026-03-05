#!/usr/bin/env bash
set -euo pipefail

echo "Start PostgreSQL with docker-compose"
docker compose up -d db

echo "Start backend"
cd backend
uvicorn app.main:app --reload --port 8000
