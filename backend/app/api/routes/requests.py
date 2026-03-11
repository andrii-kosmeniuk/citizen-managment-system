from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.dependencies.auth import ActorRole, get_actor_role, require_worker
from app.core.logging import get_logger
from app.db.models.category import Category
from app.db.models.comment import RequestComment
from app.db.models.request import CitizenRequest
from app.db.models.staff_profile import StaffProfile
from app.db.models.status_history import RequestStatusHistory
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
from app.services.identity import ensure_citizen_person
from app.services.request_service import apply_status_timestamps
from app.services.workflow import is_valid_transition

router = APIRouter(prefix="/requests", tags=["requests"])
logger = get_logger(__name__)


def _normalize_optional_name(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _citizen_display_name(first_name: str | None, last_name: str | None) -> str:
    display_name = " ".join(part for part in [first_name, last_name] if part)
    return display_name or "Anonymous"


def _require_staff_profile(db: Session, staff_profile_id: int) -> StaffProfile:
    staff_profile = db.get(StaffProfile, staff_profile_id)
    if not staff_profile:
        raise HTTPException(
            status_code=404,
            detail=f"Mitarbeiterprofil mit ID {staff_profile_id} wurde nicht gefunden.",
        )
    return staff_profile


def _resolve_creator(db: Session, creator_staff_profile_id: int | None) -> StaffProfile:
    if creator_staff_profile_id is not None:
        return _require_staff_profile(db, creator_staff_profile_id)

    fallback = db.scalar(
        select(StaffProfile).where(StaffProfile.is_available.is_(True)).order_by(StaffProfile.id.asc())
    )
    if fallback is None:
        raise HTTPException(
            status_code=409,
            detail="Es ist kein aktives Mitarbeiterprofil verfuegbar, um die Erstellung des Anliegens zu registrieren.",
        )
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


def _require_unassigned_request(req: CitizenRequest) -> None:
    if req.assigned_to_staff_profile_id is not None:
        raise HTTPException(
            status_code=409,
            detail="Das Anliegen ist bereits einem anderen Mitarbeiter zugewiesen.",
        )


def _require_assigned_worker(req: CitizenRequest, actor: StaffProfile) -> None:
    if req.assigned_to_staff_profile_id is None:
        raise HTTPException(
            status_code=409,
            detail="Das Anliegen muss zuerst von einem Mitarbeiter uebernommen werden.",
        )
    if req.assigned_to_staff_profile_id != actor.id:
        raise HTTPException(
            status_code=403,
            detail="Nur der zugewiesene Mitarbeiter darf dieses Anliegen bearbeiten.",
        )


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

    creator = _resolve_creator(db, payload.creator_staff_profile_id)
    _require_category(db, payload.category_id)

    title = payload.title.strip()
    description = payload.description.strip()
    citizen_first_name = _normalize_optional_name(payload.citizen_first_name)
    citizen_last_name = _normalize_optional_name(payload.citizen_last_name)
    if not title:
        raise HTTPException(status_code=422, detail="Der Titel darf nicht leer sein.")
    if not description:
        raise HTTPException(status_code=422, detail="Die Beschreibung darf nicht leer sein.")

    citizen_person = None
    if citizen_first_name and citizen_last_name:
        citizen_person = ensure_citizen_person(db, citizen_first_name, citizen_last_name)

    request = CitizenRequest(
        title=title,
        description=description,
        category_id=payload.category_id,
        priority=payload.priority,
        citizen_first_name=citizen_first_name,
        citizen_last_name=citizen_last_name,
        citizen_person_id=citizen_person.id if citizen_person else None,
        created_by_person_id=creator.person_id,
        status=RequestStatus.NEW,
    )
    db.add(request)
    db.flush()
    logger.info("request_created id=%s creator_staff_profile_id=%s", request.id, creator.id)

    db.add(
        RequestStatusHistory(
            request_id=request.id,
            from_status=None,
            to_status=RequestStatus.NEW,
            changed_by_staff_profile_id=creator.id,
            changed_by_person_id=creator.person_id,
            change_note="Initial status",
        )
    )

    try:
        db.commit()
    except (IntegrityError, SQLAlchemyError) as exc:
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
    actor = _require_staff_profile(db, payload.actor_staff_profile_id)

    if req.status == RequestStatus.CLOSED:
        raise HTTPException(status_code=409, detail="Ein geschlossenes Anliegen kann nicht bearbeitet werden.")
    _require_unassigned_request(req)

    req.assigned_to_staff_profile_id = payload.actor_staff_profile_id
    req.assigned_to_person_id = actor.person_id
    logger.info("request_claimed request_id=%s actor_staff_profile_id=%s", request_id, payload.actor_staff_profile_id)
    try:
        db.commit()
    except (IntegrityError, SQLAlchemyError) as exc:
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
    actor = _require_staff_profile(db, payload.actor_staff_profile_id)

    if req.status == RequestStatus.CLOSED:
        raise HTTPException(status_code=409, detail="Ein geschlossenes Anliegen kann nicht bearbeitet werden.")
    _require_assigned_worker(req, actor)

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
            changed_by_staff_profile_id=payload.actor_staff_profile_id,
            changed_by_person_id=actor.person_id,
            change_note=payload.change_note,
            changed_at=datetime.now(timezone.utc),
        )
    )
    logger.info(
        "request_status_updated request_id=%s from_status=%s to_status=%s actor_staff_profile_id=%s",
        request_id,
        from_status.value,
        payload.to_status.value,
        payload.actor_staff_profile_id,
    )

    try:
        db.commit()
    except (IntegrityError, SQLAlchemyError) as exc:
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

    comment_text = payload.comment_text.strip()
    if not comment_text:
        raise HTTPException(status_code=422, detail="Der Kommentar darf nicht leer sein.")

    if actor_role == "worker":
        if payload.author_staff_profile_id is None:
            raise HTTPException(
                status_code=422,
                detail="Fuer Mitarbeiterkommentare ist author_staff_profile_id erforderlich.",
            )
        author = _require_staff_profile(db, payload.author_staff_profile_id)
        if req.status == RequestStatus.CLOSED:
            raise HTTPException(status_code=409, detail="Ein geschlossenes Anliegen kann nicht bearbeitet werden.")
        _require_assigned_worker(req, author)
        author_staff_profile_id = author.id
        author_person_id = author.person_id
        author_role = "WORKER"
        author_display_name = author.display_name
    else:
        author_staff_profile_id = None
        author_person_id = req.citizen_person_id
        author_role = "CITIZEN"
        author_display_name = _citizen_display_name(
            req.citizen_first_name,
            req.citizen_last_name,
        )

    comment = RequestComment(
        request_id=request_id,
        author_staff_profile_id=author_staff_profile_id,
        author_person_id=author_person_id,
        author_role=author_role,
        author_display_name=author_display_name,
        comment_text=comment_text,
    )
    db.add(comment)
    logger.info(
        "request_comment_added request_id=%s actor_role=%s author_staff_profile_id=%s",
        request_id,
        actor_role,
        author_staff_profile_id,
    )

    try:
        db.commit()
    except (IntegrityError, SQLAlchemyError) as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Der Kommentar verletzt Datenintegritaetsregeln.",
        ) from exc
    db.refresh(comment)
    return comment
