from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.admin_action import VALID_ACTION_TYPES
from app.models.report import VALID_REASONS, VALID_TARGET_TYPES


class ReportCreate(BaseModel):
    target_type: str
    target_id: UUID
    reason: str
    description: str | None = None

    @field_validator("target_type")
    @classmethod
    def validate_target_type(cls, v: str) -> str:
        if v not in VALID_TARGET_TYPES:
            raise ValueError(
                f"target_type musi być jednym z: {VALID_TARGET_TYPES}"
            )
        return v

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, v: str) -> str:
        if v not in VALID_REASONS:
            raise ValueError(
                f"reason musi być jednym z: {VALID_REASONS}"
            )
        return v

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 500:
            raise ValueError("Opis max. 500 znaków")
        return v


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    reporter_id: UUID
    reporter_name: str = ""
    target_type: str
    target_id: UUID
    reason: str
    description: str | None
    status: str
    created_at: datetime
    target_preview: str | None = None
    report_count: int = 1


class ModerationAction(BaseModel):
    action_type: str
    reason: str | None = None
    ban_hours: int | None = None
    warning_message: str | None = None

    @field_validator("action_type")
    @classmethod
    def validate_action(cls, v: str) -> str:
        allowed = VALID_ACTION_TYPES - {"unban"}
        if v not in allowed:
            raise ValueError(
                f"action_type musi być jednym z: {allowed}"
            )
        return v

    @field_validator("ban_hours")
    @classmethod
    def validate_ban_hours(cls, v: int | None) -> int | None:
        if v is not None and (v < 1 or v > 8760):
            raise ValueError("ban_hours musi być między 1 a 8760 (1 rok)")
        return v


class AdminActionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    admin_id: UUID
    admin_name: str = ""
    target_user_id: UUID | None
    target_user_name: str | None = None
    report_id: UUID | None
    action_type: str
    reason: str | None
    expires_at: datetime | None
    created_at: datetime


class UserModerationStatus(BaseModel):
    user_id: UUID
    display_name: str
    email: str
    role: str
    is_banned: bool
    banned_until: datetime | None
    ban_reason: str | None
    warning_count: int = 0
    report_count: int = 0


class GroupNoteUpdate(BaseModel):
    admin_note: str | None


class PostModerationUpdate(BaseModel):
    is_pinned: bool | None = None
    is_locked: bool | None = None
