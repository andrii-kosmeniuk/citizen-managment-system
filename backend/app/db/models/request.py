from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models.enums import RequestPriority, RequestStatus


class CitizenRequest(Base):
    __tablename__ = "citizen_request"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category_id: Mapped[int] = mapped_column(ForeignKey("category.id"), nullable=False)
    priority: Mapped[RequestPriority] = mapped_column(Enum(RequestPriority, name="request_priority"), nullable=False)
    status: Mapped[RequestStatus] = mapped_column(
        Enum(RequestStatus, name="request_status"), nullable=False, default=RequestStatus.NEW, server_default="NEW"
    )
    citizen_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    assigned_to_user_id: Mapped[int | None] = mapped_column(ForeignKey("staff_user.id"), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    category = relationship("Category", back_populates="requests")
    assignee = relationship("StaffUser", back_populates="assigned_requests")
    comments = relationship("RequestComment", back_populates="request", cascade="all, delete-orphan")
    status_changes = relationship("RequestStatusHistory", back_populates="request", cascade="all, delete-orphan")
