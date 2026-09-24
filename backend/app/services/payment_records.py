"""
Enregistrement des paiements dans Firestore à partir des événements Stripe.

C'est ici — et seulement ici — que naissent les documents `transactions` et `services` :
le client mobile n'a plus le droit d'y écrire (voir firestore.rules). Les écritures sont
idempotentes : un même PaymentIntent rejoué par Stripe ne produit qu'une transaction.
"""

import json
import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, Optional

from ..config import settings

logger = logging.getLogger(__name__)

# Statuts partagés avec l'application (chatService.StatutServiceType / statisticsService)
STATUS_BY_PAYMENT_TYPE = {
    "deposit": "acompte_paye",
    "final": "termine",
}
TRANSACTION_TYPE_BY_PAYMENT_TYPE = {
    "deposit": "acompte",
    "final": "final",
}


def _cents_to_euros(cents: int) -> float:
    return float((Decimal(cents) / Decimal(100)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _to_float(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(Decimal(str(value)))
    except Exception:
        return None


def _parse_service_details(raw: Any) -> Dict[str, Any]:
    """`serviceDetails` arrive sérialisé en JSON dans les métadonnées Stripe."""
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    try:
        parsed = json.loads(str(raw))
        return parsed if isinstance(parsed, dict) else {}
    except (ValueError, TypeError):
        return {}


def build_transaction_record(intent: Dict[str, Any], server_timestamp: Any) -> Dict[str, Any]:
    """Document `transactions/{paymentIntentId}` à partir d'un PaymentIntent réussi."""
    metadata = intent.get("metadata") or {}
    payment_type = str(metadata.get("type") or "")
    amount_cents = int(intent.get("amount_received") or intent.get("amount") or 0)
    montant = _cents_to_euros(amount_cents)
    commission = float(
        (Decimal(str(montant)) * settings.COMMISSION_RATE).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    )

    return {
        "paymentIntentId": intent.get("id"),
        "type": TRANSACTION_TYPE_BY_PAYMENT_TYPE.get(payment_type, payment_type or "unknown"),
        "serviceId": metadata.get("conversationId"),
        "clientId": metadata.get("clientId"),
        "aidantId": metadata.get("aidantId"),
        "montant": montant,
        "amountCents": amount_cents,
        "currency": intent.get("currency"),
        "commission": commission,
        "commissionRate": float(settings.COMMISSION_RATE),
        "montantAidant": round(montant - commission, 2),
        "totalAmount": _to_float(metadata.get("totalAmount")),
        "status": "completed",
        "stripeStatus": intent.get("status"),
        "source": "stripe_webhook",
        "createdAt": server_timestamp,
    }


def build_service_update(intent: Dict[str, Any], server_timestamp: Any) -> Dict[str, Any]:
    """Champs à fusionner dans `services/{conversationId}`."""
    metadata = intent.get("metadata") or {}
    payment_type = str(metadata.get("type") or "")
    details = _parse_service_details(metadata.get("serviceDetails"))

    update: Dict[str, Any] = {
        "serviceId": metadata.get("conversationId"),
        "clientId": metadata.get("clientId"),
        "aidantId": metadata.get("aidantId"),
        "montant": _to_float(metadata.get("totalAmount")),
        "status": STATUS_BY_PAYMENT_TYPE.get(payment_type, "acompte_paye"),
        "updatedAt": server_timestamp,
    }

    for key in ("secteur", "jour", "heureDebut", "heureFin", "adresse"):
        if details.get(key):
            update[key] = details[key]

    if payment_type == "deposit":
        update["depositPaidAt"] = server_timestamp
        # Date de création du service : retirée par record_payment_intent_succeeded si le doc existe déjà
        update["createdAt"] = server_timestamp
    elif payment_type == "final":
        update["finalPaidAt"] = server_timestamp
        update["completedAt"] = server_timestamp

    return update


def record_payment_intent_succeeded(db, intent: Dict[str, Any], server_timestamp: Any) -> Dict[str, Any]:
    """
    Persiste un PaymentIntent réussi. Retourne un résumé {"recorded": bool, "reason": str}.

    `db` est un client Firestore Admin ; `server_timestamp` la sentinelle SERVER_TIMESTAMP
    (injectée pour rester testable sans Firebase).
    """
    intent_id = intent.get("id")
    metadata = intent.get("metadata") or {}
    payment_type = str(metadata.get("type") or "")
    conversation_id = metadata.get("conversationId")

    if not intent_id:
        return {"recorded": False, "reason": "missing_intent_id"}
    if payment_type not in STATUS_BY_PAYMENT_TYPE:
        logger.warning("PaymentIntent %s ignoré : type inconnu %r", intent_id, payment_type)
        return {"recorded": False, "reason": "unknown_payment_type"}

    tx_ref = db.collection("transactions").document(str(intent_id))
    existing = tx_ref.get()
    if existing.exists and (existing.to_dict() or {}).get("status") == "completed":
        logger.info("PaymentIntent %s déjà enregistré (rejeu du webhook)", intent_id)
        return {"recorded": False, "reason": "already_recorded"}

    tx_ref.set(build_transaction_record(intent, server_timestamp))

    if conversation_id:
        service_update = build_service_update(intent, server_timestamp)
        service_ref = db.collection("services").document(str(conversation_id))
        if payment_type == "deposit" and service_ref.get().exists:
            service_update.pop("createdAt", None)  # ne pas réécrire la date de création
        service_ref.set(service_update, merge=True)

        conv_ref = db.collection("conversations").document(str(conversation_id))
        if conv_ref.get().exists:
            conv_update: Dict[str, Any] = {
                "status": STATUS_BY_PAYMENT_TYPE[payment_type],
                "updatedAt": server_timestamp,
            }
            if payment_type == "final":
                conv_update["completedAt"] = server_timestamp
            conv_ref.set(conv_update, merge=True)
    else:
        logger.warning("PaymentIntent %s sans conversationId : transaction seule enregistrée", intent_id)

    logger.info("PaymentIntent %s enregistré (%s, conversation %s)", intent_id, payment_type, conversation_id)
    return {"recorded": True, "reason": "ok"}


def record_payment_intent_failed(db, intent: Dict[str, Any], server_timestamp: Any) -> Dict[str, Any]:
    """Trace un échec de paiement (utile au support), sans toucher au parcours."""
    intent_id = intent.get("id")
    if not intent_id:
        return {"recorded": False, "reason": "missing_intent_id"}

    metadata = intent.get("metadata") or {}
    error = (intent.get("last_payment_error") or {}) if isinstance(intent.get("last_payment_error"), dict) else {}
    db.collection("payment_failures").document(str(intent_id)).set(
        {
            "paymentIntentId": intent_id,
            "type": metadata.get("type"),
            "serviceId": metadata.get("conversationId"),
            "clientId": metadata.get("clientId"),
            "aidantId": metadata.get("aidantId"),
            "amountCents": int(intent.get("amount") or 0),
            "errorCode": error.get("code"),
            "declineCode": error.get("decline_code"),
            "message": error.get("message"),
            "createdAt": server_timestamp,
        },
        merge=True,
    )
    return {"recorded": True, "reason": "ok"}
