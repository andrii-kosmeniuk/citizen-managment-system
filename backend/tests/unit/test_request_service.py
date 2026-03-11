from app.db.models.enums import RequestStatus
from app.services.request_service import apply_status_timestamps


def test_apply_status_timestamps_sets_both_values_when_closing_from_resolved():
    resolved_at, closed_at = apply_status_timestamps(RequestStatus.RESOLVED, RequestStatus.CLOSED)

    assert resolved_at is not None
    assert closed_at is not None
    assert resolved_at == closed_at


def test_apply_status_timestamps_sets_only_resolved_at_when_resolving():
    resolved_at, closed_at = apply_status_timestamps(RequestStatus.IN_PROGRESS, RequestStatus.RESOLVED)

    assert resolved_at is not None
    assert closed_at is None


def test_apply_status_timestamps_leaves_timestamps_empty_for_non_terminal_transition():
    resolved_at, closed_at = apply_status_timestamps(RequestStatus.NEW, RequestStatus.IN_PROGRESS)

    assert resolved_at is None
    assert closed_at is None
