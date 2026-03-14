from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base


class MlPipelineRun(Base):
    """
    Log każdego uruchomienia ML pipeline.
    Używany przez should_retrain() i GET /admin/pipeline/status.
    """
    __tablename__ = "ml_pipeline_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_at = Column(DateTime(timezone=True), server_default=func.now())
    profiles_count = Column(Integer, nullable=False, default=0)
    clusters_found = Column(Integer, nullable=False, default=0)
    noise_count = Column(Integer, nullable=False, default=0)
    reassigned = Column(Integer, nullable=False, default=0)
    duration_ms = Column(Integer)
    status = Column(String(20), default="success")
    error_message = Column(Text)
