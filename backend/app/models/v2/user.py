from __future__ import annotations

import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, ENUM, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.v2.base import Base, TimestampMixin

user_role_enum = ENUM("user", "moderator", "admin", name="user_role", create_type=False)
user_status_enum = ENUM(
    "active", "suspended", "pending_onboarding", name="user_status", create_type=False
)


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    username: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(user_role_enum, nullable=False, default="user")
    status: Mapped[str] = mapped_column(
        user_status_enum, nullable=False, default="pending_onboarding"
    )

    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    consent_data_processing: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    consent_searchable_info: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    symptom_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    diagnosis_confirmed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    orpha_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("orpha_diseases.orpha_id", ondelete="SET NULL"),
        nullable=True,
    )

    hpo_vector: Mapped[list | None] = mapped_column(Vector(384), nullable=True)
    post_vector: Mapped[list | None] = mapped_column(Vector(384), nullable=True)
    diagnosis_vector: Mapped[list | None] = mapped_column(Vector(384), nullable=True)

    searchable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    location_city: Mapped[str | None] = mapped_column(Text, nullable=True)
    location_country: Mapped[str] = mapped_column(Text, default="PL", nullable=False)

    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    post_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    chat_response_rate: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)

    hpo_profile: Mapped[list["UserHpoProfile"]] = relationship(  # noqa: F821
        "UserHpoProfile", back_populates="user", lazy="selectin"
    )
    posts: Mapped[list["Post"]] = relationship("Post", back_populates="author")  # noqa: F821
    lens_scores: Mapped[list["UserLensScore"]] = relationship(  # noqa: F821
        "UserLensScore", back_populates="user"
    )

    def __repr__(self) -> str:
        return f"<User {self.username}>"

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

    @property
    def is_moderator(self) -> bool:
        return self.role in ("admin", "moderator")

    @property
    def is_active(self) -> bool:
        return self.status == "active"
