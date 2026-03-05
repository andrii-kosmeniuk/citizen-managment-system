from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models.enums import RequestStatus


class RequestStatusHistory(Base):
    __tablename__ = "request_status_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("citizen_requests.id", ondelete="CASCADE"), nullable=False)
    from_status: Mapped[RequestStatus | None] = mapped_column(Enum(RequestStatus, name="request_status"), nullable=True)
    to_status: Mapped[RequestStatus] = mapped_column(Enum(RequestStatus, name="request_status"), nullable=False)
    changed_by_user_id: Mapped[int] = mapped_column(ForeignKey("staff_users.id"), nullable=False)
    change_note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    request = relationship("CitizenRequest", back_populates="status_changes")
