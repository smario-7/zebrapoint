from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.database import Base

VALID_ACTION_TYPES = {
    "warn",
    "delete_content",
    "ban_temp",
    "ban_permanent",
    "dismiss",
    "unban",
}


class AdminAction(Base):
    __tablename__ = "admin_actions"

    id             = Column(UUID(as_uuid=True), primary_key=True,
                            default=uuid.uuid4)
    admin_id       = Column(UUID(as_uuid=True),
                            ForeignKey("users.id", ondelete="CASCADE"),
                            nullable=False)
    target_user_id = Column(UUID(as_uuid=True),
                            ForeignKey("users.id", ondelete="SET NULL"),
                            nullable=True)
    report_id      = Column(UUID(as_uuid=True),
                            ForeignKey("reports.id", ondelete="SET NULL"),
                            nullable=True)
    action_type    = Column(String(30), nullable=False)
    reason         = Column(Text)
    expires_at     = Column(DateTime(timezone=True), nullable=True)
    created_at     = Column(DateTime(timezone=True),
                             server_default=func.now(), nullable=False)

    admin       = relationship("User", foreign_keys=[admin_id])
    target_user = relationship("User", foreign_keys=[target_user_id])
    report      = relationship("Report")
