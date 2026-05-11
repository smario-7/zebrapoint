import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LensProposalCreate(BaseModel):
    name: str
    type: str  # symptomatic | topical
    justification: str


class LensProposalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    type: str
    justification: str
    status: str  # pending | approved | rejected
    admin_comment: str | None = None
    reviewed_by: uuid.UUID | None = None
    reviewed_at: datetime | None = None
    created_lens_id: uuid.UUID | None = None
    created_at: datetime
