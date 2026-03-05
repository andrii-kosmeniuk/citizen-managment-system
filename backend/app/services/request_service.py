from datetime import datetime, timezone

from app.db.models.enums import RequestStatus


def apply_status_timestamps(current_status: RequestStatus, new_status: RequestStatus) -> tuple[datetime | None, datetime | None]:
    now = datetime.now(timezone.utc)
    resolved_at = None
    closed_at = None

    if new_status in (RequestStatus.RESOLVED, RequestStatus.CLOSED):
        resolved_at = now
    if new_status == RequestStatus.CLOSED:
        closed_at = now

    if current_status == RequestStatus.RESOLVED and new_status == RequestStatus.CLOSED:
        resolved_at = now

    return resolved_at, closed_at
