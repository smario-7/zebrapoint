from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.database import Base

VALID_TARGET_TYPES = {"message", "post", "comment", "user"}
VALID_REASONS = {
    "spam", "abuse", "misinformation", "hate_speech", "other"
}
VALID_STATUSES = {"pending", "reviewed", "dismissed"}


class Report(Base):
    __tablename__ = "reports"

    id          = Column(UUID(as_uuid=True), primary_key=True,
                        default=uuid.uuid4)
    reporter_id = Column(UUID(as_uuid=True),
                         ForeignKey("users.id", ondelete="CASCADE"),
                         nullable=False)
    target_type = Column(String(20), nullable=False)
    target_id   = Column(UUID(as_uuid=True), nullable=False)
    reason      = Column(String(50), nullable=False)
    description = Column(Text)
    status      = Column(String(20), default="pending", nullable=False)
    reviewed_by = Column(UUID(as_uuid=True),
                        ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at  = Column(DateTime(timezone=True),
                         server_default=func.now(), nullable=False)

    reporter = relationship("User", foreign_keys=[reporter_id], lazy="joined")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
