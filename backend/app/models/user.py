from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email         = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    display_name  = Column(String(100), nullable=False)
    avatar_url    = Column(String(500), nullable=True)
    role          = Column(String(20), default="user", nullable=False)
    age_range     = Column(String(20), nullable=True)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    symptom_profile = relationship("SymptomProfile", back_populates="user", uselist=False)
    messages        = relationship("Message", back_populates="user")
    group_memberships = relationship("GroupMember", back_populates="user")

    def __repr__(self):
        return f"<User {self.email}>"
