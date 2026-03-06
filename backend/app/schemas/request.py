from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.comment import CommentRead
from app.schemas.enums import RequestPriority, RequestStatus


class RequestCreate(BaseModel):
    creator_user_id: int
    title: str
    description: str
    category_id: int
    priority: RequestPriority
    citizen_first_name: str
    citizen_last_name: str


class RequestStatusUpdate(BaseModel):
    actor_user_id: int
    to_status: RequestStatus
    change_note: str | None = None


class RequestClaim(BaseModel):
    actor_user_id: int


class RequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    category_id: int
    priority: RequestPriority
    status: RequestStatus
    citizen_first_name: str
    citizen_last_name: str
    assigned_to_user_id: int | None
    resolved_at: datetime | None
    closed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class RequestStatusHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    request_id: int
    from_status: RequestStatus | None
    to_status: RequestStatus
    changed_by_user_id: int
    change_note: str | None
    changed_at: datetime


class RequestDetail(BaseModel):
    request: RequestRead
    comments: list[CommentRead]
    status_history: list[RequestStatusHistoryRead]
