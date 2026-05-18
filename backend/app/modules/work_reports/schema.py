from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.modules.work_reports.model import MoodLevel


class WorkReportCreate(BaseModel):
    report_date:   date
    hours_logged:  float = Field(..., gt=0, le=12)
    summary:       str   = Field(..., min_length=10, max_length=5000)
    blockers:      Optional[str] = Field(None, max_length=2000)
    tomorrow_plan: Optional[str] = Field(None, max_length=2000)
    mood:          Optional[MoodLevel] = None

    @field_validator("report_date")
    @classmethod
    def validate_date(cls, v: date) -> date:
        from datetime import date as _date
        today = _date.today()
        if v > today:
            raise ValueError("Report date cannot be in the future")
        if (today - v).days > 2:
            raise ValueError("Cannot submit reports more than 2 days in the past")
        return v


class WorkReportResponse(BaseModel):
    id:            UUID
    user_id:       UUID
    report_date:   date
    hours_logged:  float
    summary:       str
    blockers:      Optional[str]
    tomorrow_plan: Optional[str]
    mood:          Optional[MoodLevel]
    created_at:    datetime

    class Config:
        from_attributes = True
