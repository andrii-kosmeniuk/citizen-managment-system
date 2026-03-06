from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CommentCreate(BaseModel):
    author_user_id: int | None = None
    comment_text: str


class CommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    request_id: int
    author_user_id: int | None
    author_role: str
    author_display_name: str
    comment_text: str
    created_at: datetime
