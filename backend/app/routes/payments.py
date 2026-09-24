"""
Payment routes for Stripe integration.
"""

import logging
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Dict, Optional

import stripe
from fastapi import APIRouter, Header, HTTPException

from ..config import settings
from ..firebase_auth import verify_bearer_token
from ..models import (
    PaymentConfirmRequest,
    PaymentIntentCreate,
    PaymentStatusRequest,
    RefundRequest,
)

router = APIRouter(prefix="/payments")
compat_router = APIRouter()
logger = logging.getLogger(__name__)


def _configure_stripe() -> None:
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    stripe.api_key = settings.STRIPE_SECRET_KEY


def _metadata_to_strings(metadata: Optional[Dict[str, str]]) -> Dict[str, str]:
    if not metadata:
        return {}

    result: Dict[str, str] = {}
    for key, value in metadata.items():
        result[str(key)] = "" if value is None else str(value)
    return result


def _decimal_from_metadata(metadata: Dict[str, str], key: str) -> Optional[Decimal]:
    raw_value = metadata.get(key)
    if raw_value is None or raw_value == "":
        return None
    try:
        return Decimal(str(raw_value))
    except (InvalidOperation, ValueError):
        raise HTTPException(status_code=400, detail=f"Invalid payment metadata: {key}")


def _euros_to_cents(amount: Decimal) -> int:
    cents = (amount * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(cents)


def _calculate_authoritative_amount(body: PaymentIntentCreate) -> int:
    """
    Prefer server-side amount calculation when the app sends enough context.

    Existing published clients still send `amount`, so requests without payment
    type/total metadata are accepted for backward compatibility. Newer clients
    must match the amount derived here.
    """
    metadata = _metadata_to_strings(body.metadata)
    payment_type = metadata.get("type")
    total_amount = _decimal_from_metadata(metadata, "totalAmount")

    if not payment_type or total_amount is None:
        logger.warning("PaymentIntent accepted without full pricing metadata")
        return body.amount

    if total_amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid total payment amount")

    if payment_type == "deposit":
        expected_amount = _euros_to_cents(total_amount * Decimal("0.20"))
    elif payment_type == "final":
        expected_amount = _euros_to_cents(total_amount * Decimal("0.80"))
    else:
        raise HTTPException(status_code=400, detail="Invalid payment type")

    if body.amount != expected_amount:
        logger.warning(
            "Payment amount mismatch: provided=%s expected=%s type=%s",
            body.amount,
            expected_amount,
            payment_type,
        )
        raise HTTPException(status_code=400, detail="Invalid payment amount")

    return expected_amount


def _verify_payment_auth(authorization: Optional[str], metadata: Dict[str, str]):
    decoded_token = verify_bearer_token(
        authorization,
        required=settings.PAYMENT_AUTH_REQUIRED,
    )
    if not decoded_token:
        return None

    token_uid = decoded_token.get("uid")
    client_id = metadata.get("clientId")
    if client_id and token_uid and client_id != token_uid:
        raise HTTPException(status_code=403, detail="Payment user mismatch")

    return decoded_token


async def _create_payment_intent(
    body: PaymentIntentCreate,
    authorization: Optional[str] = None,
):
    _configure_stripe()

    metadata = _metadata_to_strings(body.metadata)
    _verify_payment_auth(authorization, metadata)
    amount = _calculate_authoritative_amount(body)

    try:
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=body.currency,
            automatic_payment_methods={"enabled": True},
            metadata=metadata,
        )
        logger.info("PaymentIntent created: %s", intent["id"])
        return {
            "client_secret": intent["client_secret"],
            "clientSecret": intent["client_secret"],
            "id": intent["id"],
            "amount": intent.get("amount", amount),
            "currency": intent.get("currency", body.currency),
            "status": intent.get("status"),
        }
    except stripe.error.CardError:
        raise HTTPException(status_code=402, detail="Card was declined")
    except stripe.error.InvalidRequestError:
        raise HTTPException(status_code=400, detail="Invalid payment request")
    except Exception:
        logger.exception("Stripe PaymentIntent creation failed")
        raise HTTPException(status_code=502, detail="Payment provider unavailable")


def _payment_intent_id_from_request(body: PaymentStatusRequest) -> str:
    payment_intent_id = body.paymentIntentId.strip()
    if not payment_intent_id:
        raise HTTPException(status_code=400, detail="Missing paymentIntentId")
    return payment_intent_id


async def _retrieve_payment_intent(
    body: PaymentStatusRequest,
    authorization: Optional[str] = None,
):
    _configure_stripe()
    _verify_payment_auth(authorization, {})
    payment_intent_id = _payment_intent_id_from_request(body)

    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        return {
            "id": intent["id"],
            "amount": intent.get("amount"),
            "currency": intent.get("currency"),
            "status": intent.get("status"),
            "client_secret": intent.get("client_secret"),
            "clientSecret": intent.get("client_secret"),
        }
    except stripe.error.InvalidRequestError:
        raise HTTPException(status_code=404, detail="PaymentIntent not found")
    except Exception:
        logger.exception("Stripe PaymentIntent retrieval failed")
        raise HTTPException(status_code=502, detail="Payment provider unavailable")


@router.post("/create-intent")
async def create_payment_intent(
    body: PaymentIntentCreate,
    authorization: Optional[str] = Header(default=None),
):
    """Canonical endpoint used by the backend API."""
    return await _create_payment_intent(body, authorization)


@router.post("/confirm-payment")
async def confirm_payment_in_payments_namespace(
    body: PaymentConfirmRequest,
    authorization: Optional[str] = Header(default=None),
):
    """
    Compatibility confirmation endpoint.

    The mobile PaymentSheet confirms the payment. This endpoint verifies and
    returns the Stripe status instead of trying to confirm the intent again.
    """
    return await _retrieve_payment_intent(
        PaymentStatusRequest(**body.model_dump()),
        authorization,
    )


@router.post("/payment-status")
async def payment_status_in_payments_namespace(
    body: PaymentStatusRequest,
    authorization: Optional[str] = Header(default=None),
):
    return await _retrieve_payment_intent(body, authorization)


@router.post("/process-refund")
async def process_refund_in_payments_namespace(
    body: RefundRequest,
    authorization: Optional[str] = Header(default=None),
):
    _configure_stripe()
    _verify_payment_auth(authorization, {})
    try:
        payload = {"payment_intent": body.paymentIntentId}
        if body.amount is not None:
            payload["amount"] = body.amount
        refund = stripe.Refund.create(**payload)
        return {
            "id": refund["id"],
            "amount": refund.get("amount"),
            "currency": refund.get("currency"),
            "status": refund.get("status"),
        }
    except stripe.error.InvalidRequestError:
        raise HTTPException(status_code=400, detail="Invalid refund request")
    except Exception:
        logger.exception("Stripe refund failed")
        raise HTTPException(status_code=502, detail="Payment provider unavailable")


@compat_router.post("/create-payment-intent")
async def create_payment_intent_compat(
    body: PaymentIntentCreate,
    authorization: Optional[str] = Header(default=None),
):
    """Legacy endpoint expected by the published mobile app."""
    return await _create_payment_intent(body, authorization)


@compat_router.post("/confirm-payment")
async def confirm_payment_compat(
    body: PaymentConfirmRequest,
    authorization: Optional[str] = Header(default=None),
):
    return await confirm_payment_in_payments_namespace(body, authorization)


@compat_router.post("/payment-status")
async def payment_status_compat(
    body: PaymentStatusRequest,
    authorization: Optional[str] = Header(default=None),
):
    return await payment_status_in_payments_namespace(body, authorization)


@compat_router.post("/process-refund")
async def process_refund_compat(
    body: RefundRequest,
    authorization: Optional[str] = Header(default=None),
):
    return await process_refund_in_payments_namespace(body, authorization)
