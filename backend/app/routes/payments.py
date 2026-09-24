"""
Payment routes for Stripe integration.
"""

import logging
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Dict, Optional

import stripe
from fastapi import APIRouter, Header, HTTPException, Request

from ..config import settings
from ..firebase_auth import get_firestore_client, verify_bearer_token
from ..models import (
    PaymentConfirmRequest,
    PaymentIntentCreate,
    PaymentStatusRequest,
    RefundRequest,
)
from ..services.payment_records import (
    record_payment_intent_failed,
    record_payment_intent_succeeded,
)
from ..services.pricing_config import get_pricing_config

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
    Le serveur recalcule le montant à partir du total et du type de paiement ;
    le montant envoyé par l'application doit correspondre exactement.

    Les métadonnées `type` et `totalAmount` sont obligatoires : toutes les versions
    publiées de l'application les envoient.
    """
    metadata = _metadata_to_strings(body.metadata)
    payment_type = metadata.get("type")
    total_amount = _decimal_from_metadata(metadata, "totalAmount")

    if not payment_type or total_amount is None:
        raise HTTPException(status_code=400, detail="Missing pricing metadata (type, totalAmount)")

    if total_amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid total payment amount")

    # Taux d'acompte : config/pricing (Firestore), sinon DEPOSIT_RATE de l'environnement
    deposit_rate = get_pricing_config().deposit_rate
    deposit_cents = _euros_to_cents(total_amount * deposit_rate)
    total_cents = _euros_to_cents(total_amount)

    if payment_type == "deposit":
        expected_amount = deposit_cents
    elif payment_type == "final":
        # Le solde est le complément exact de l'acompte (évite les écarts d'arrondi)
        expected_amount = total_cents - deposit_cents
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


# ---------------------------------------------------------------------------
# Webhook Stripe : source de vérité des paiements
# ---------------------------------------------------------------------------

HANDLED_EVENTS = {"payment_intent.succeeded", "payment_intent.payment_failed"}


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(default=None, alias="Stripe-Signature"),
):
    """
    Reçoit les événements Stripe. La signature est vérifiée avec STRIPE_WEBHOOK_SECRET ;
    `payment_intent.succeeded` crée la transaction et met à jour service + conversation.
    """
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook not configured")
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing Stripe-Signature header")

    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        logger.warning("Stripe webhook: invalid signature")
        raise HTTPException(status_code=400, detail="Invalid signature")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")

    event_type = event.get("type") if isinstance(event, dict) else getattr(event, "type", None)
    if event_type not in HANDLED_EVENTS:
        return {"received": True, "handled": False, "type": event_type}

    data = event["data"]["object"] if isinstance(event, dict) else event.data.object
    intent = dict(data) if not isinstance(data, dict) else data

    db = get_firestore_client()
    if db is None:
        # On répond 500 pour que Stripe réessaie plus tard (la configuration sera corrigée entre-temps)
        logger.error("Stripe webhook: Firestore indisponible, événement %s non enregistré", event_type)
        raise HTTPException(status_code=500, detail="Firestore unavailable")

    from firebase_admin import firestore as admin_firestore

    server_timestamp = admin_firestore.SERVER_TIMESTAMP
    try:
        if event_type == "payment_intent.succeeded":
            result = record_payment_intent_succeeded(db, intent, server_timestamp)
        else:
            result = record_payment_intent_failed(db, intent, server_timestamp)
    except Exception:
        logger.exception("Stripe webhook: échec d'enregistrement de %s", intent.get("id"))
        raise HTTPException(status_code=500, detail="Recording failed")

    return {"received": True, "handled": True, "type": event_type, **result}


# ---------------------------------------------------------------------------
# Routes appelées par l'application
# ---------------------------------------------------------------------------


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
    L'enregistrement de la transaction est fait par le webhook, pas ici.
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
    # Un remboursement est une action sensible : token obligatoire quelle que soit la configuration.
    decoded = verify_bearer_token(authorization, required=True)
    logger.info("Refund requested by %s for %s", decoded.get("uid") if decoded else "?", body.paymentIntentId)
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


# ---------------------------------------------------------------------------
# Routes de compatibilité : utilisées par l'application publiée (1.0.2).
# À retirer une fois que plus aucune version en circulation ne les appelle.
# ---------------------------------------------------------------------------


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
