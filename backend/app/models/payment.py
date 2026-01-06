"""
Payment data models for Stripe integration
"""

from typing import Dict, Optional
from pydantic import BaseModel, Field


class PaymentIntentCreate(BaseModel):
    """Model for creating a Stripe PaymentIntent"""

    amount: int = Field(
        ..., gt=0, le=999900, description="Amount in centimes (e.g., 880 for 8.80€)"
    )
    currency: str = Field(
        default="eur", pattern="^[a-z]{3}$", description="ISO 4217 currency code"
    )
    metadata: Optional[Dict[str, str]] = Field(
        None, description="Optional metadata for the payment"
    )

    class Config:
        schema_extra = {
            "example": {
                "amount": 880,
                "currency": "eur",
                "metadata": {"user_id": "123", "service_id": "456"},
            }
        }
