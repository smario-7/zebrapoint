from __future__ import annotations

import uuid
from datetime import datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, ENUM, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.v2.base import Base, TimestampMixin

lens_type_enum = ENUM("diagnostic", "symptomatic", "topical", name="lens_type", create_type=False)
lens_activity_enum = ENUM("high", "medium", "low", name="lens_activity", create_type=False)


class Lens(Base, TimestampMixin):
    __tablename__ = "lenses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[str] = mapped_column(lens_type_enum, nullable=False)
    emoji: Mapped[str | None] = mapped_column(Text, nullable=True)

    embedding: Mapped[list | None] = mapped_column(Vector(384), nullable=True)
    hpo_cluster: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)

    orpha_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("orpha_diseases.orpha_id", ondelete="SET NULL"),
        nullable=True,
    )
    data_source: Mapped[str | None] = mapped_column(String(50), nullable=True)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    activity_level: Mapped[str] = mapped_column(lens_activity_enum, default="low", nullable=False)
    post_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    post_matches: Mapped[list["PostLensMatch"]] = relationship(
        "PostLensMatch", back_populates="lens"
    )
    user_scores: Mapped[list["UserLensScore"]] = relationship(
        "UserLensScore", back_populates="lens"
    )


class UserLensScore(Base):
    __tablename__ = "user_lens_scores"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lens_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lenses.id", ondelete="CASCADE"),
        nullable=False,
    )
    score: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False)
    score_breakdown: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    calculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    user: Mapped["User"] = relationship("User", back_populates="lens_scores")
    lens: Mapped["Lens"] = relationship("Lens", back_populates="user_scores")