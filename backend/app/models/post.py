from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, foreign
from sqlalchemy.sql import func
import uuid
from app.database import Base


class Post(Base):
    __tablename__ = "posts"

    id        = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id  = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    user_id   = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title     = Column(String(200), nullable=False)
    content   = Column(Text, nullable=False)
    is_pinned = Column(Boolean, default=False, nullable=False)
    is_locked = Column(Boolean, default=False, nullable=False)
    views     = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user     = relationship("User", lazy="joined")
    group    = relationship("Group")
    comments = relationship(
        "Comment",
        back_populates="post",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )
    reactions = relationship(
        "Reaction",
        primaryjoin="and_(Post.id == foreign(Reaction.target_id), "
                    "Reaction.target_type == 'post')",
        lazy="dynamic"
    )
