from sqlalchemy import Column, String, Boolean, Integer, DateTime, Text, Float, ForeignKey, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
import uuid
from app.database import Base


class Group(Base):
    __tablename__ = "groups"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name             = Column(String(200), default="Nowa grupa")
    description      = Column(Text, nullable=True)
    cluster_id       = Column(Integer, nullable=True)
    is_active        = Column(Boolean, default=True)
    member_count     = Column(Integer, default=0)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    accent_color     = Column(String(7), default="#0d9488")
    keywords         = Column(ARRAY(String), nullable=True)
    age_range        = Column(String(20), nullable=True)
    symptom_category = Column(String(50), nullable=True)
    avg_match_score  = Column(Float, nullable=True)
    centroid         = Column(Vector(384), nullable=True)
    admin_note       = Column(Text, nullable=True)
    admin_note_by    = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    admin_note_at    = Column(DateTime(timezone=True), nullable=True)
    ai_description   = Column(Text, nullable=True)

    members        = relationship("GroupMember", back_populates="group")
    messages       = relationship("Message", back_populates="group")
    symptom_profiles = relationship("SymptomProfile", back_populates="group")
