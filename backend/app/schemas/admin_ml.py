from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MlSettingsUpdate(BaseModel):
    retrain_trigger_new_profiles: int = Field(ge=1, le=500)


class MlSettingsResponse(BaseModel):
    retrain_trigger_new_profiles: int
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
