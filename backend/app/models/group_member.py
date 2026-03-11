from sqlalchemy import Column, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class GroupMember(Base):
    __tablename__ = "group_members"

    user_id  = Column(UUID(as_uuid=True), ForeignKey("users.id",  ondelete="CASCADE"), primary_key=True)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    user  = relationship("User",  back_populates="group_memberships")
    group = relationship("Group", back_populates="members")
