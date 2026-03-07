import os
import subprocess
from pathlib import Path

import psycopg
import pytest
from fastapi.testclient import TestClient

# Ensure DB URL is present before app/session import.
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/citizen_requests")

from app.db.session import SessionLocal
from app.main import app


def _to_psycopg_dsn(sqlalchemy_url: str) -> str:
    return sqlalchemy_url.replace("postgresql+psycopg://", "postgresql://", 1)


def _reset_db_with_sqlalchemy_url(sqlalchemy_url: str) -> None:
    repo_root = Path(__file__).resolve().parents[3]
    migrations = sorted((repo_root / "database" / "migrations").glob("*.sql"))
    dsn = _to_psycopg_dsn(sqlalchemy_url)
    with psycopg.connect(dsn, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;")
            for migration in migrations:
                cur.execute(migration.read_text(encoding="utf-8"))


@pytest.fixture(scope="session", autouse=True)
def reset_database_once() -> None:
    reset_mode = os.getenv("TEST_DB_RESET_MODE", "script")
    if reset_mode == "sql":
        _reset_db_with_sqlalchemy_url(os.environ["DATABASE_URL"])
        return

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
