"""
Payment routes for Stripe integration
"""

import stripe
import logging
from fastapi import APIRouter, HTTPException

from ..models import PaymentIntentCreate
from ..config import settings

router = APIRouter(prefix="/payments")
logger = logging.getLogger(__name__)


@router.post("/create-intent")
async def create_payment_intent(body: PaymentIntentCreate):
    """Create a Stripe PaymentIntent"""
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    try:
        stripe.api_key = settings.STRIPE_SECRET_KEY
        intent = stripe.PaymentIntent.create(
            amount=body.amount,
            currency=body.currency,
            automatic_payment_methods={"enabled": True},
            metadata=body.metadata or {},
        )
        logger.info(f"✅ PaymentIntent created: {intent['id']}")
        return {
            "client_secret": intent["client_secret"],
            "clientSecret": intent["client_secret"],
            "id": intent["id"],
        }
    except stripe.error.CardError as e:
        logger.error(f"Card error: {e}")
        raise HTTPException(status_code=402, detail="Card was declined")
    except stripe.error.InvalidRequestError as e:
        logger.error(f"Invalid request: {e}")
        raise HTTPException(
            status_code=400, detail="Invalid payment amount or currency"
        )
    except Exception as e:
        logger.error(f"❌ Stripe error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
