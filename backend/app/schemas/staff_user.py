from datetime import datetime

from pydantic import BaseModel, ConfigDict


class StaffUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
