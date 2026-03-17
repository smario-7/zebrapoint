from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class DmConversation(Base):
    __tablename__ = "dm_conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_a_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_b_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_message_at = Column(DateTime(timezone=True), server_default=func.now())
    last_message_text = Column(Text)
    unread_count_a = Column(Integer, default=0)
    unread_count_b = Column(Integer, default=0)

    user_a = relationship("User", foreign_keys=[user_a_id], lazy="joined")
    user_b = relationship("User", foreign_keys=[user_b_id], lazy="joined")
    messages = relationship(
        "DmMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="DmMessage.created_at",
    )


class DmMessage(Base):
    __tablename__ = "dm_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("dm_conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    sender_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    content = Column(Text, nullable=False)
    message_type = Column(Text, default="text")
    image_url = Column(Text)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("DmConversation", back_populates="messages")
    sender = relationship("User", lazy="joined")
