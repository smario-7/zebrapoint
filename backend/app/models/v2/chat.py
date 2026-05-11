from __future__ import annotations

import uuid
from datetime import datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, Text
from sqlalchemy.dialects.postgresql import ENUM, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.v2.base import Base

chat_status_enum = ENUM("active", "closed", name="chat_status", create_type=False)
chat_member_status_enum = ENUM(
    "pending", "accepted", "rejected", "left", name="chat_member_status", create_type=False
)
chat_member_role_enum = ENUM("creator", "invited", name="chat_member_role", create_type=False)


class DynamicChat(Base):
    __tablename__ = "dynamic_chats"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    creator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    query_text: Mapped[str] = mapped_column(Text, nullable=False)
    query_embedding: Mapped[list | None] = mapped_column(Vector(384), nullable=True)
    target_count: Mapped[int] = mapped_column(Integer, nullable=False)
    include_location: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(chat_status_enum, default="active", nullable=False)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    members: Mapped[list["DynamicChatMember"]] = relationship(
        "DynamicChatMember", back_populates="chat"
    )
    messages: Mapped[list["DynamicChatMessage"]] = relationship(
        "DynamicChatMessage", back_populates="chat"
    )


class DynamicChatMember(Base):
    __tablename__ = "dynamic_chat_members"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("dynamic_chats.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(chat_member_role_enum, nullable=False)
    status: Mapped[str] = mapped_column(chat_member_status_enum, default="pending", nullable=False)
    match_score: Mapped[float | None] = mapped_column(Numeric(4, 3), nullable=True)
    invited_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    chat: Mapped["DynamicChat"] = relationship("DynamicChat", back_populates="members")


class DynamicChatMessage(Base):
    __tablename__ = "dynamic_chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("dynamic_chats.id", ondelete="CASCADE"),
        nullable=False,
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    chat: Mapped["DynamicChat"] = relationship("DynamicChat", back_populates="messages")
