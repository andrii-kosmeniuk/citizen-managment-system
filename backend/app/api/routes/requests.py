from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.comment import RequestComment
from app.db.models.request import CitizenRequest
from app.db.models.status_history import RequestStatusHistory
from app.db.models.user import StaffUser
from app.db.session import get_db
from app.schemas.comment import CommentCreate, CommentRead
from app.schemas.enums import RequestPriority, RequestStatus
from app.schemas.request import (
    RequestClaim,
    RequestCreate,
    RequestDetail,
    RequestRead,
    RequestStatusUpdate,
)
from app.services.request_service import apply_status_timestamps
from app.services.workflow import is_valid_transition

router = APIRouter(prefix="/requests", tags=["requests"])


def _require_user(db: Session, user_id: int) -> StaffUser:
    user = db.get(StaffUser, user_id)
    if not user:
        raise HTTPException(status_code=404, detail=f"Staff user {user_id} not found")
    return user


def _require_request(db: Session, request_id: int) -> CitizenRequest:
    req = db.get(CitizenRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    return req


@router.get("", response_model=list[RequestRead])
def list_requests(
    status_filter: RequestStatus | None = Query(default=None, alias="status"),
    category_id: int | None = None,
    priority: RequestPriority | None = None,
    db: Session = Depends(get_db),
) -> list[CitizenRequest]:
    stmt = select(CitizenRequest)
    if status_filter is not None:
        stmt = stmt.where(CitizenRequest.status == status_filter)
    if category_id is not None:
        stmt = stmt.where(CitizenRequest.category_id == category_id)
    if priority is not None:
        stmt = stmt.where(CitizenRequest.priority == priority)
    stmt = stmt.order_by(CitizenRequest.created_at.desc())

    return list(db.scalars(stmt).all())


@router.post("", response_model=RequestRead, status_code=status.HTTP_201_CREATED)
def create_request(payload: RequestCreate, db: Session = Depends(get_db)) -> CitizenRequest:
    _require_user(db, payload.creator_user_id)

    request = CitizenRequest(
        title=payload.title.strip(),
        description=payload.description.strip(),
        category_id=payload.category_id,
        priority=payload.priority,
        citizen_name=payload.citizen_name,
        status=RequestStatus.NEW,
    )
    db.add(request)
    db.flush()

    db.add(
        RequestStatusHistory(
            request_id=request.id,
            from_status=None,
            to_status=RequestStatus.NEW,
            changed_by_user_id=payload.creator_user_id,
            change_note="Initial status",
        )
    )

    db.commit()
    db.refresh(request)
    return request


@router.get("/{request_id}", response_model=RequestDetail)
def get_request_detail(request_id: int, db: Session = Depends(get_db)) -> RequestDetail:
    req = _require_request(db, request_id)

    comments = list(
        db.scalars(
            select(RequestComment)
            .where(RequestComment.request_id == request_id)
            .order_by(RequestComment.created_at.asc())
        ).all()
    )

    status_history = list(
        db.scalars(
            select(RequestStatusHistory)
            .where(RequestStatusHistory.request_id == request_id)
            .order_by(RequestStatusHistory.changed_at.asc())
        ).all()
    )

    return RequestDetail(request=req, comments=comments, status_history=status_history)


@router.post("/{request_id}/claim", response_model=RequestRead)
def claim_request(request_id: int, payload: RequestClaim, db: Session = Depends(get_db)) -> CitizenRequest:
    req = _require_request(db, request_id)
    _require_user(db, payload.actor_user_id)

    if req.status == RequestStatus.CLOSED:
        raise HTTPException(status_code=409, detail="Closed request cannot be modified")

    req.assigned_to_user_id = payload.actor_user_id
    db.commit()
    db.refresh(req)
    return req


@router.patch("/{request_id}/status", response_model=RequestRead)
def update_status(request_id: int, payload: RequestStatusUpdate, db: Session = Depends(get_db)) -> CitizenRequest:
    req = _require_request(db, request_id)
    _require_user(db, payload.actor_user_id)

    if req.status == RequestStatus.CLOSED:
        raise HTTPException(status_code=409, detail="Closed request cannot be modified")

    if not is_valid_transition(req.status, payload.to_status):
        raise HTTPException(
            status_code=409,
            detail=f"Invalid transition from {req.status.value} to {payload.to_status.value}",
        )

    from_status = req.status
    req.status = payload.to_status

    resolved_at, closed_at = apply_status_timestamps(from_status, payload.to_status)
    if resolved_at is not None:
        req.resolved_at = resolved_at
    if closed_at is not None:
        req.closed_at = closed_at

    db.add(
        RequestStatusHistory(
            request_id=req.id,
            from_status=from_status,
            to_status=payload.to_status,
            changed_by_user_id=payload.actor_user_id,
            change_note=payload.change_note,
            changed_at=datetime.now(timezone.utc),
        )
    )

    db.commit()
    db.refresh(req)
    return req


@router.post("/{request_id}/comments", response_model=CommentRead, status_code=status.HTTP_201_CREATED)
def add_comment(request_id: int, payload: CommentCreate, db: Session = Depends(get_db)) -> RequestComment:
    req = _require_request(db, request_id)
    _require_user(db, payload.author_user_id)

    if req.status == RequestStatus.CLOSED:
        raise HTTPException(status_code=409, detail="Closed request cannot be modified")

    comment = RequestComment(
        request_id=request_id,
        author_user_id=payload.author_user_id,
        comment_text=payload.comment_text.strip(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment
