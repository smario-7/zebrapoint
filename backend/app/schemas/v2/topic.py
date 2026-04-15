from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ChatSearchRequest(BaseModel):
    query: str
    target_count: int
    include_location: bool = False


class ChatSearchResult(BaseModel):
    """Wynik wyszukiwania — przed potwierdzeniem."""

    search_id: str
    found_count: int
    target_count: int


class ChatConfirmRequest(BaseModel):
    search_id: str


class ChatOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    query_text: str
    target_count: int
    status: str
    created_at: datetime
    member_count: int = 0
    pending_count: int = 0


class InvitationOut(BaseModel):
    """Zaproszenie do czatu widoczne przez zaproszonego."""

    chat_id: uuid.UUID
    inviter_username: str
    query_preview: str
    invited_at: datetime


class InvitationActionRequest(BaseModel):
    action: str


class ChatMessageCreate(BaseModel):
    content: str


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    author_username: str
    content: str
    created_at: datetime


class ChatMemberOut(BaseModel):
    username: str
    role: str
    status: str


class ChatDetailOut(BaseModel):
    id: uuid.UUID
    query_text: str
    target_count: int
    status: str
    created_at: datetime
    members: list[ChatMemberOut]
    is_creator: bool
