from datetime import datetime

from pydantic import BaseModel, ConfigDict


class StaffProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    person_id: int
    first_name: str
    last_name: str
    email: str | None
    employee_code: str
    is_active: bool
    is_available: bool
    created_at: datetime
    updated_at: datetime
