"""
Health check routes
"""

from datetime import datetime, timezone

from fastapi import APIRouter

from ..config import settings
from ..firebase_auth import get_firestore_client, has_service_account, service_account_diagnostic
from ..services.pricing_config import PRICING_COLLECTION, PRICING_DOC_ID, get_pricing_config

router = APIRouter()


@router.get("/health")
async def health_check():
    """Check API health status"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "message": "API is running",
    }


def _stripe_key_mode(key: str):
    if key.startswith("sk_live_"):
        return "live"
    if key.startswith("sk_test_"):
        return "test"
    return None


@router.get("/health/integrations")
async def integrations_check():
    """
    Diagnostic des intégrations (lecture seule, aucune valeur secrète exposée) :
    présence des clés, compte de service, et une vraie lecture Firestore côté serveur.
    """
    firestore_status = "not_configured"
    firestore_error = None
    pricing_doc_exists = None

    if has_service_account():
        db = get_firestore_client()
        if db is None:
            firestore_status = "init_failed"
        else:
            try:
                snap = db.collection(PRICING_COLLECTION).document(PRICING_DOC_ID).get()
                firestore_status = "ok"
                pricing_doc_exists = bool(snap.exists)
            except Exception as exc:  # noqa: BLE001 - on veut le type d'erreur, pas la trace
                firestore_status = "error"
                firestore_error = type(exc).__name__

    ok = bool(settings.STRIPE_SECRET_KEY) and bool(settings.STRIPE_WEBHOOK_SECRET) and firestore_status == "ok"

    return {
        "version": settings.API_VERSION,
        "ok": ok,
        "stripeSecretKey": bool(settings.STRIPE_SECRET_KEY),
        "stripeKeyMode": _stripe_key_mode(settings.STRIPE_SECRET_KEY),
        "webhookSecret": bool(settings.STRIPE_WEBHOOK_SECRET),
        "paymentAuthRequired": settings.PAYMENT_AUTH_REQUIRED,
        "serviceAccount": has_service_account(),
        "serviceAccountDiagnostic": service_account_diagnostic(),
        "firestore": firestore_status,
        "firestoreError": firestore_error,
        "pricingConfigDocument": pricing_doc_exists,
        "pricingSource": get_pricing_config(force_refresh=True).source,
    }


@router.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": settings.API_TITLE,
        "version": settings.API_VERSION,
        "status": "running",
    }
