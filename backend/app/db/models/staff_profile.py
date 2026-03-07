from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class StaffProfile(Base):
    __tablename__ = "staff_profile"

    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("person.id", ondelete="CASCADE"), nullable=False, unique=True)
    employee_code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    position_title: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    legacy_staff_user_id: Mapped[int | None] = mapped_column(ForeignKey("staff_user.id"), nullable=True, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
