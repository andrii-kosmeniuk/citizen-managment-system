from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RequestComment(Base):
    __tablename__ = "request_comment"

    id: Mapped[int] = mapped_column(primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("citizen_request.id", ondelete="CASCADE"), nullable=False)
    author_user_id: Mapped[int | None] = mapped_column(ForeignKey("staff_user.id"), nullable=True)
    author_role: Mapped[str] = mapped_column(String(20), nullable=False)
    author_display_name: Mapped[str] = mapped_column(String(150), nullable=False)
    comment_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    request = relationship("CitizenRequest", back_populates="comments")
