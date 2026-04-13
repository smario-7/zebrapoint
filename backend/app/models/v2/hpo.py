from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.v2.base import Base


class HpoTerm(Base):
    __tablename__ = "hpo_terms"

    hpo_id: Mapped[str] = mapped_column(String, primary_key=True)
    label_en: Mapped[str] = mapped_column(Text, nullable=False)
    label_pl: Mapped[str | None] = mapped_column(Text, nullable=True)
    synonyms_en: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    parent_ids: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    depth: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source_version: Mapped[str] = mapped_column(Text, nullable=False)
    is_clinical: Mapped[bool | None] = mapped_column(Boolean, default=True)


class OrphaDisease(Base):
    __tablename__ = "orpha_diseases"

    orpha_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    orpha_code: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name_pl: Mapped[str] = mapped_column(Text, nullable=False)
    name_en: Mapped[str] = mapped_column(Text, nullable=False)
    hpo_associations: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class UserHpoProfile(Base):
    __tablename__ = "user_hpo_profile"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    hpo_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("hpo_terms.hpo_id", ondelete="CASCADE"),
        nullable=False,
    )
    confidence: Mapped[float] = mapped_column(Numeric(3, 2), nullable=False, default=1.00)
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="hpo_profile")
