# Citizen Request Management System

## Project structure
- `backend/`: FastAPI REST API + business logic
- `frontend/`: React app scaffold
- `database/migrations/`: SQL migrations
- `docs/`: assessment artifacts (spec, architecture, AI usage)
- `scripts/`: helper scripts

## 1) Start database

```bash
docker compose up -d db
```

## 2) Apply schema

```bash
psql "postgresql://postgres:postgres@localhost:5432/citizen_requests" -f database/migrations/001_initial_schema.sql
```

## 3) Run backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
export DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/citizen_requests"
uvicorn app.main:app --reload --port 8000
```

## 4) Run frontend

```bash
cd frontend
npm install
npm run dev
```

## API examples
- `GET /health`
- `GET /categories`
- `POST /categories`
- `GET /requests`
- `POST /requests`
- `GET /requests/{id}`
- `POST /requests/{id}/claim`
- `PATCH /requests/{id}/status`
- `POST /requests/{id}/comments`
