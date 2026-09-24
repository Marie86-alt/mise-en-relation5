"""
Modèles des avis clients.
"""

from typing import Optional

from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    """Avis déposé par le client à la fin d'un service."""

    aidantId: str = Field(..., min_length=1, max_length=128)
    conversationId: str = Field(..., min_length=1, max_length=256)
    rating: int = Field(..., ge=1, le=5, description="Note de 1 à 5 étoiles")
    comment: str = Field("", max_length=1000)
    clientName: Optional[str] = Field(None, max_length=120)
    serviceDate: Optional[str] = Field(None, max_length=32)
    secteur: Optional[str] = Field(None, max_length=120)
    dureeService: Optional[float] = Field(None, ge=0, le=24)
    montantService: Optional[float] = Field(None, ge=0, le=100000)


class RecomputeRequest(BaseModel):
    """Recalcul des notes : un aidant précis, ou tous si absent."""

    aidantId: Optional[str] = Field(None, min_length=1, max_length=128)
