from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RequestComment(Base):
    __tablename__ = "request_comments"

    id: Mapped[int] = mapped_column(primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("citizen_requests.id", ondelete="CASCADE"), nullable=False)
    author_user_id: Mapped[int] = mapped_column(ForeignKey("staff_users.id"), nullable=False)
    comment_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    request = relationship("CitizenRequest", back_populates="comments")
