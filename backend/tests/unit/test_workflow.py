from app.db.models.enums import RequestStatus
from app.services.workflow import is_valid_transition


def test_valid_transition():
    assert is_valid_transition(RequestStatus.NEW, RequestStatus.IN_PROGRESS)


def test_invalid_transition():
    assert not is_valid_transition(RequestStatus.NEW, RequestStatus.CLOSED)
