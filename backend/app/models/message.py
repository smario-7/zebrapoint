from sqlalchemy import Column, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base


class Message(Base):
    __tablename__ = "messages"

    id       = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    user_id  = Column(UUID(as_uuid=True), ForeignKey("users.id",  ondelete="CASCADE"), nullable=False)
    content  = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user  = relationship("User",  back_populates="messages")
    group = relationship("Group", back_populates="messages")
