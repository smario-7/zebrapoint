from sqlalchemy import Column, DateTime, Integer, SmallInteger
from sqlalchemy.sql import func

from app.database import Base


class MlAdminSettings(Base):
    """Singleton (id=1): próg nowych profili do automatycznego retrainu."""

    __tablename__ = "ml_admin_settings"

    id = Column(SmallInteger, primary_key=True, default=1)
    retrain_every_n = Column(Integer, nullable=False, default=10)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
