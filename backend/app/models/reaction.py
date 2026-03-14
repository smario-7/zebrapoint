from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base


class Reaction(Base):
    __tablename__ = "reactions"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_type = Column(String(10), nullable=False)
    target_id   = Column(UUID(as_uuid=True), nullable=False)
    emoji       = Column(String(10), nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "user_id", "target_type", "target_id",
            name="uq_reaction_user_target"
        ),
    )

    user = relationship("User")
