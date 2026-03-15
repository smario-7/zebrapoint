from sqlalchemy import Column, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.database import Base


class UserWarning(Base):
    __tablename__ = "user_warnings"

    id         = Column(UUID(as_uuid=True), primary_key=True,
                        default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True),
                        ForeignKey("users.id", ondelete="CASCADE"),
                        nullable=False)
    admin_id   = Column(UUID(as_uuid=True),
                        ForeignKey("users.id", ondelete="CASCADE"),
                        nullable=False)
    message    = Column(Text, nullable=False)
    report_id  = Column(UUID(as_uuid=True),
                        ForeignKey("reports.id"), nullable=True)
    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), nullable=False)

    user   = relationship("User", foreign_keys=[user_id])
    admin  = relationship("User", foreign_keys=[admin_id])
    report = relationship("Report")
