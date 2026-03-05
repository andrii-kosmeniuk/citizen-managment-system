# Backend

## Run locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
uvicorn app.main:app --reload --port 8000
```

## Environment

Set `DATABASE_URL`, example:

```bash
export DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/citizen_requests"
```
