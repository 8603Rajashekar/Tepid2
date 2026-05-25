from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

class WorkReportCreate(BaseModel):
    report_date:   date
    hours_logged:  float          = Field(..., gt=0, le=12)
    summary:       str            = Field(..., min_length=10, max_length=5000)
    blockers:      Optional[str]  = Field(None, max_length=2000)
    tomorrow_plan: Optional[str]  = Field(None, max_length=2000)
    tasks:         Optional[list[str]] = None   # list of task ID strings
    attachments:   Optional[list[Any]] = None   # [{name, url}, ...]

    @field_validator("report_date")
    @classmethod
    def validate_date(cls, v: date) -> date:
        from datetime import date as _date
        today = _date.today()
        if v > today:
            raise ValueError("Report date cannot be in the future")
        return v

    @field_validator("hours_logged")
    @classmethod
    def validate_hours(cls, v: float) -> float:
        if v > 12:
            raise ValueError("Max 12 hours allowed")
        return v


class WorkReportResponse(BaseModel):
    id:            UUID
    user_id:       UUID
    report_date:   date
    hours_logged:  float
    summary:       str
    blockers:      Optional[str]
    tomorrow_plan: Optional[str]
    tasks:         Optional[list]
    attachments:   Optional[list]
    created_at:    datetime

    class Config:
        from_attributes = True
