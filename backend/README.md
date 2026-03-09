# Citizen Request System Backend

Backend service for the Citizen Request Management System.

Run locally:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
uvicorn app.main:app --reload --port 8000
```
