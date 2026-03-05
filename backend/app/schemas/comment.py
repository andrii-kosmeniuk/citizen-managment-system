from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CommentCreate(BaseModel):
    author_user_id: int
    comment_text: str


class CommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    request_id: int
    author_user_id: int
    comment_text: str
    created_at: datetime
