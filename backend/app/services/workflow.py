from app.db.models.enums import RequestStatus


_ALLOWED_TRANSITIONS: dict[RequestStatus, set[RequestStatus]] = {
    RequestStatus.NEW: {RequestStatus.IN_PROGRESS, RequestStatus.CLARIFICATION_NEEDED},
    RequestStatus.IN_PROGRESS: {RequestStatus.CLARIFICATION_NEEDED, RequestStatus.RESOLVED},
    RequestStatus.CLARIFICATION_NEEDED: {RequestStatus.IN_PROGRESS},
    RequestStatus.RESOLVED: {RequestStatus.CLOSED},
    RequestStatus.CLOSED: set(),
}


def is_valid_transition(from_status: RequestStatus, to_status: RequestStatus) -> bool:
    return to_status in _ALLOWED_TRANSITIONS[from_status]
