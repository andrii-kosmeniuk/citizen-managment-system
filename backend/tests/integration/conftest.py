import os
import subprocess
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure DB URL is present before app/session import.
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/citizen_requests")

from app.main import app
from app.db.session import SessionLocal


@pytest.fixture(scope="session", autouse=True)
def reset_database_once() -> None:
    repo_root = Path(__file__).resolve().parents[3]
    subprocess.run(["bash", "-lc", "./scripts/reset_db.sh"], cwd=repo_root, check=True)


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture()
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
