from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, foreign
from sqlalchemy.sql import func
import uuid
from app.database import Base


class Comment(Base):
    __tablename__ = "comments"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id    = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content    = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", lazy="joined")
    post = relationship("Post", back_populates="comments")
    reactions = relationship(
        "Reaction",
        primaryjoin="and_(Comment.id == foreign(Reaction.target_id), "
                    "Reaction.target_type == 'comment')",
        lazy="dynamic"
    )
