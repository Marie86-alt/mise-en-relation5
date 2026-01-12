"""
Status check data models
"""

from datetime import datetime
from pydantic import BaseModel, Field
import uuid


class StatusCheck(BaseModel):
    """Status check response model"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class StatusCheckCreate(BaseModel):
    """Status check creation model"""

    client_name: str
