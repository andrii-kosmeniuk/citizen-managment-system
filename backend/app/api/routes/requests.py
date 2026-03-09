from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies.auth import ActorRole, get_actor_role, require_worker
from app.core.logging import get_logger
from app.db.models.category import Category
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
from app.services.identity import ensure_citizen_person, ensure_staff_person
from app.services.request_service import apply_status_timestamps
from app.services.workflow import is_valid_transition

router = APIRouter(prefix="/requests", tags=["requests"])
logger = get_logger(__name__)


def _require_user(db: Session, user_id: int) -> StaffUser:
    user = db.get(StaffUser, user_id)
    if not user:
        raise HTTPException(status_code=404, detail=f"Mitarbeiter mit ID {user_id} wurde nicht gefunden.")
    ensure_staff_person(db, user)
    return user


def _resolve_creator(db: Session, creator_user_id: int | None) -> StaffUser:
    if creator_user_id is not None:
        return _require_user(db, creator_user_id)

    fallback = db.scalar(select(StaffUser).where(StaffUser.is_active.is_(True)).order_by(StaffUser.id.asc()))
    if fallback is None:
        raise HTTPException(
            status_code=409,
            detail="Es ist kein aktiver Mitarbeiter verfuegbar, um die Erstellung des Anliegens zu registrieren.",
        )
    ensure_staff_person(db, fallback)
    return fallback


def _require_request(db: Session, request_id: int) -> CitizenRequest:
    req = db.get(CitizenRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Anliegen nicht gefunden.")
    return req


def _require_category(db: Session, category_id: int) -> Category:
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail=f"Kategorie mit ID {category_id} wurde nicht gefunden.")
    return category


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
    # Keep display order deterministic: higher request IDs are shown first.
    stmt = stmt.order_by(CitizenRequest.id.desc())

    return list(db.scalars(stmt).all())


@router.post("", response_model=RequestRead, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: RequestCreate,
    db: Session = Depends(get_db),
    actor_role: ActorRole = Depends(get_actor_role),
) -> CitizenRequest:
    if actor_role != "citizen":
        raise HTTPException(status_code=403, detail="Fuer diese Aktion ist die Rolle 'citizen' erforderlich.")

    creator = _resolve_creator(db, payload.creator_user_id)
    _require_category(db, payload.category_id)

    title = payload.title.strip()
    description = payload.description.strip()
    citizen_first_name = payload.citizen_first_name.strip()
    citizen_last_name = payload.citizen_last_name.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Der Titel darf nicht leer sein.")
    if not description:
        raise HTTPException(status_code=422, detail="Die Beschreibung darf nicht leer sein.")
    if not citizen_first_name:
        raise HTTPException(status_code=422, detail="Der Vorname darf nicht leer sein.")
    if not citizen_last_name:
        raise HTTPException(status_code=422, detail="Der Nachname darf nicht leer sein.")

    citizen_person = ensure_citizen_person(db, citizen_first_name, citizen_last_name)

    request = CitizenRequest(
        title=title,
        description=description,
        category_id=payload.category_id,
        priority=payload.priority,
        citizen_first_name=citizen_first_name,
        citizen_last_name=citizen_last_name,
        citizen_person_id=citizen_person.id,
        created_by_person_id=creator.person_id,
        status=RequestStatus.NEW,
    )
    db.add(request)
    db.flush()
    logger.info("request_created id=%s creator_user_id=%s", request.id, creator.id)

    db.add(
        RequestStatusHistory(
            request_id=request.id,
            from_status=None,
            to_status=RequestStatus.NEW,
            changed_by_user_id=creator.id,
            changed_by_person_id=creator.person_id,
            change_note="Initial status",
        )
    )

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Das Anliegen konnte aufgrund von Datenintegritaetsregeln nicht erstellt werden.",
        ) from exc
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
def claim_request(
    request_id: int, payload: RequestClaim, db: Session = Depends(get_db), _: None = Depends(require_worker)
) -> CitizenRequest:
    req = _require_request(db, request_id)
    actor = _require_user(db, payload.actor_user_id)

    if req.status == RequestStatus.CLOSED:
        raise HTTPException(status_code=409, detail="Ein geschlossenes Anliegen kann nicht bearbeitet werden.")

    req.assigned_to_user_id = payload.actor_user_id
    req.assigned_to_person_id = actor.person_id
    logger.info("request_claimed request_id=%s actor_user_id=%s", request_id, payload.actor_user_id)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Das Anliegen konnte aufgrund von Datenintegritaetsregeln nicht uebernommen werden.",
        ) from exc
    db.refresh(req)
    return req


@router.patch("/{request_id}/status", response_model=RequestRead)
def update_status(
    request_id: int, payload: RequestStatusUpdate, db: Session = Depends(get_db), _: None = Depends(require_worker)
) -> CitizenRequest:
    req = _require_request(db, request_id)
    actor = _require_user(db, payload.actor_user_id)

    if req.status == RequestStatus.CLOSED:
        raise HTTPException(status_code=409, detail="Ein geschlossenes Anliegen kann nicht bearbeitet werden.")

    if not is_valid_transition(req.status, payload.to_status):
        raise HTTPException(
            status_code=409,
            detail=f"Ungueltiger Statuswechsel von {req.status.value} zu {payload.to_status.value}.",
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
            changed_by_person_id=actor.person_id,
            change_note=payload.change_note,
            changed_at=datetime.now(timezone.utc),
        )
    )
    logger.info(
        "request_status_updated request_id=%s from_status=%s to_status=%s actor_user_id=%s",
        request_id,
        from_status.value,
        payload.to_status.value,
        payload.actor_user_id,
    )

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Die Statusaenderung verletzt Datenintegritaetsregeln.",
        ) from exc
    db.refresh(req)
    return req


@router.post("/{request_id}/comments", response_model=CommentRead, status_code=status.HTTP_201_CREATED)
def add_comment(
    request_id: int,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    actor_role: ActorRole = Depends(get_actor_role),
) -> RequestComment:
    req = _require_request(db, request_id)

    if req.status == RequestStatus.CLOSED:
        raise HTTPException(status_code=409, detail="Ein geschlossenes Anliegen kann nicht bearbeitet werden.")

    comment_text = payload.comment_text.strip()
    if not comment_text:
        raise HTTPException(status_code=422, detail="Der Kommentartext darf nicht leer sein.")

    if actor_role == "worker":
        if payload.author_user_id is None:
            raise HTTPException(status_code=422, detail="Fuer Mitarbeiterkommentare ist author_user_id erforderlich.")
        author = _require_user(db, payload.author_user_id)
        author_user_id = author.id
        author_person_id = author.person_id
        author_role_value = "WORKER"
        author_display_name = f"{author.first_name} {author.last_name}"
    else:
        author_user_id = None
        if req.citizen_person_id is None:
            citizen_person = ensure_citizen_person(db, req.citizen_first_name, req.citizen_last_name)
            req.citizen_person_id = citizen_person.id
        author_person_id = req.citizen_person_id
        author_role_value = "CITIZEN"
        author_display_name = f"{req.citizen_first_name} {req.citizen_last_name}"

    comment = RequestComment(
        request_id=request_id,
        author_user_id=author_user_id,
        author_person_id=author_person_id,
        author_role=author_role_value,
        author_display_name=author_display_name,
        comment_text=comment_text,
    )
    db.add(comment)
    logger.info(
        "request_comment_added request_id=%s actor_role=%s author_user_id=%s",
        request_id,
        actor_role,
        author_user_id,
    )
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Der Kommentar konnte aufgrund von Datenintegritaetsregeln nicht hinzugefuegt werden.",
        ) from exc
    db.refresh(comment)
    return comment
