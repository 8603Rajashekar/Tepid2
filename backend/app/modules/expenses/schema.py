from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.modules.expenses.model import ExpenseCategory, ExpenseStatus


class ExpenseCreate(BaseModel):
    title: str              = Field(..., min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    amount: Decimal         = Field(..., gt=0, le=1_000_000, decimal_places=2)
    category: ExpenseCategory
    receipt_url: Optional[str] = Field(None, max_length=500)


class ExpenseUpdate(BaseModel):
    title: Optional[str]        = Field(None, min_length=3, max_length=200)
    description: Optional[str]  = Field(None, max_length=2000)
    amount: Optional[Decimal]   = Field(None, gt=0, le=1_000_000, decimal_places=2)
    category: Optional[ExpenseCategory] = None
    receipt_url: Optional[str]  = Field(None, max_length=500)


class ExpenseApprove(BaseModel):
    """Used for supervisor /approve and finance /finance — approval only."""
    pass  # no body needed; the action is implicit from the endpoint


class ExpenseReject(BaseModel):
    """Used at any stage by /reject endpoint."""
    reason: str = Field(..., min_length=5, max_length=1000)


class ExpenseResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    amount: Decimal
    category: ExpenseCategory
    receipt_url: Optional[str]
    status: ExpenseStatus

    submitted_by: UUID
    submitted_at: Optional[datetime]

    supervisor_id: Optional[UUID]
    supervisor_approved_at: Optional[datetime]

    finance_id: Optional[UUID]
    finance_approved_at: Optional[datetime]

    rejected_by: Optional[UUID]
    rejection_reason: Optional[str]

    reimbursed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
