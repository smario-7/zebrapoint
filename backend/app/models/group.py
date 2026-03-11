from sqlalchemy import Column, String, Boolean, Integer, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base


class Group(Base):
    __tablename__ = "groups"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name         = Column(String(200), default="Nowa grupa")
    description  = Column(Text, nullable=True)
    cluster_id   = Column(Integer, nullable=True)
    is_active    = Column(Boolean, default=True)
    member_count = Column(Integer, default=0)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    members        = relationship("GroupMember", back_populates="group")
    messages       = relationship("Message", back_populates="group")
    symptom_profiles = relationship("SymptomProfile", back_populates="group")
