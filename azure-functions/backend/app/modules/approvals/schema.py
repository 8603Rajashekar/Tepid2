from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.modules.approvals.model import ApprovalAction, ApprovalModule, SignatureType


class ApprovalCreate(BaseModel):
    module:           ApprovalModule
    ref_id:           UUID
    action:           ApprovalAction
    signature_type:   SignatureType
    signature_data:   Optional[str] = Field(None, description="Base64 PNG, typed name, or verified OTP token")
    rejection_reason: Optional[str] = Field(None, max_length=2000)

    @model_validator(mode="after")
    def rejection_requires_reason(self):
        if self.action == ApprovalAction.rejected and not self.rejection_reason:
            raise ValueError("rejection_reason is required when action is 'rejected'")
        return self


class ApprovalResponse(BaseModel):
    id:               UUID
    module:           ApprovalModule
    ref_id:           UUID
    actor_id:         UUID
    actor_name:       Optional[str] = None
    actor_email:      Optional[str] = None
    actor_role:       Optional[str] = None
    action:           ApprovalAction
    signature_type:   SignatureType
    signature_data:   Optional[str]
    rejection_reason: Optional[str]
    ip_address:       Optional[str]
    user_agent:       Optional[str]
    timestamp:        datetime
    hash:             str

    class Config:
        from_attributes = True
