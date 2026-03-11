import pytest
from fastapi import HTTPException

from app.api.dependencies.auth import get_actor_role, require_worker


def test_get_actor_role_normalizes_valid_values():
    assert get_actor_role(" Worker ") == "worker"
    assert get_actor_role("citizen") == "citizen"


def test_get_actor_role_rejects_invalid_value():
    with pytest.raises(HTTPException) as exc_info:
        get_actor_role("admin")

    assert exc_info.value.status_code == 422
    assert "Ungueltiger X-Actor-Role Header" in str(exc_info.value.detail)


def test_require_worker_accepts_worker_role():
    assert require_worker("worker") is None


def test_require_worker_rejects_citizen_role():
    with pytest.raises(HTTPException) as exc_info:
        require_worker("citizen")

    assert exc_info.value.status_code == 403
    assert "Rolle 'worker' erforderlich" in str(exc_info.value.detail)


def test_require_worker_rejects_invalid_role():
    with pytest.raises(HTTPException) as exc_info:
        require_worker("manager")

    assert exc_info.value.status_code == 422
    assert "Ungueltiger X-Actor-Role Header" in str(exc_info.value.detail)
