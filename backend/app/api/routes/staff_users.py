from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.auth import require_worker
from app.db.models.user import StaffUser
from app.db.session import get_db
from app.schemas.staff_user import StaffUserRead

router = APIRouter(prefix="/staff-users", tags=["staff-users"])


@router.get("", response_model=list[StaffUserRead])
def list_staff_users(db: Session = Depends(get_db), _: None = Depends(require_worker)) -> list[StaffUser]:
    stmt = select(StaffUser).order_by(StaffUser.id.asc())
    return list(db.scalars(stmt).all())
