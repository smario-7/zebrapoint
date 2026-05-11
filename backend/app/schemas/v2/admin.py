from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AdminUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    username: str
    role: str
    status: str
    onboarding_completed: bool
    searchable: bool
    post_count: int
    last_login_at: datetime | None = None
    created_at: datetime


class BanRequest(BaseModel):
    banned: bool
    reason: str | None = None


class RoleChangeRequest(BaseModel):
    role: str


class AdminPostOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    author_id: uuid.UUID
    title: str
    status: str
    comment_count: int
    published_at: datetime | None = None
    created_at: datetime


class AdminLensOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None = None
    type: str
    emoji: str | None = None
    is_active: bool
    activity_level: str
    post_count: int
    orpha_id: int | None = None
    data_source: str | None = None
    last_synced_at: datetime | None = None
    embedding_ready: bool = False


class LensCreateRequest(BaseModel):
    name: str
    description: str | None = None
    emoji: str | None = None
    type: str = "topical"


class LensUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    emoji: str | None = None


class OrphaSearchResult(BaseModel):
    orpha_id: int
    orpha_code: str
    name_pl: str | None
    name_en: str
    hpo_count: int
    already_imported: bool


class OrphaImportRequest(BaseModel):
    orpha_id: int


class AdminProposalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    proposer_username: str
    name: str
    type: str
    justification: str
    status: str
    admin_comment: str | None = None
    created_at: datetime


class ProposalRejectRequest(BaseModel):
    comment: str


class SystemStats(BaseModel):
    users_total: int
    users_active: int
    posts_total: int
    posts_published: int
    posts_without_embedding: int
    lenses_total: int
    lenses_active: int
    lenses_without_embedding: int
    proposals_pending: int
    last_orphanet_sync: datetime | None = None
    last_hpo_sync: str | None = None
