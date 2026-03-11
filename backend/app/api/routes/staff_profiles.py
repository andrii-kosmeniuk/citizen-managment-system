from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.auth import require_worker
from app.db.models.staff_profile import StaffProfile
from app.db.session import get_db
from app.schemas.staff_profile import StaffProfileRead

router = APIRouter(prefix="/staff-profiles", tags=["staff-profiles"])


@router.get("", response_model=list[StaffProfileRead])
def list_staff_profiles(db: Session = Depends(get_db), _: None = Depends(require_worker)) -> list[StaffProfile]:
    stmt = select(StaffProfile).order_by(StaffProfile.id.asc())
    return list(db.scalars(stmt).all())
