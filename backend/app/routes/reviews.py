"""
Avis clients : dépôt d'un avis et recalcul des notes des aidants (côté serveur).
"""

import logging
from typing import Optional

from fastapi import APIRouter, Header, HTTPException

from ..firebase_auth import get_firestore_client, verify_bearer_token
from ..models import RecomputeRequest, ReviewCreate
from ..services.review_stats import recompute_aidant_stats, recompute_all_stats, upsert_review

router = APIRouter(prefix="/reviews")
logger = logging.getLogger(__name__)

# Un avis n'a de sens qu'une fois le service réalisé
REVIEWABLE_STATUSES = {"evaluation", "termine"}


def _server_timestamp():
    from firebase_admin import firestore as admin_firestore

    return admin_firestore.SERVER_TIMESTAMP


def _require_db():
    db = get_firestore_client()
    if db is None:
        raise HTTPException(status_code=503, detail="Firestore unavailable")
    return db


def _require_uid(authorization: Optional[str]) -> dict:
    decoded = verify_bearer_token(authorization, required=True)
    if not decoded or not decoded.get("uid"):
        raise HTTPException(status_code=401, detail="Authentication required")
    return decoded


def _is_admin(db, uid: str) -> bool:
    snap = db.collection("users").document(uid).get()
    if not snap.exists:
        return False
    data = snap.to_dict() or {}
    return data.get("isAdmin") is True or data.get("role") == "admin"


@router.post("", status_code=201)
async def create_review(body: ReviewCreate, authorization: Optional[str] = Header(default=None)):
    """
    Enregistre l'avis du client pour une conversation terminée, puis recalcule la note de l'aidant.
    Idempotent : renvoyer le même avis met à jour le précédent au lieu d'en créer un second.
    """
    decoded = _require_uid(authorization)
    uid = str(decoded["uid"])
    db = _require_db()

    conversation = db.collection("conversations").document(body.conversationId).get()
    if not conversation.exists:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv = conversation.to_dict() or {}
    participants = conv.get("participants") or []

    if uid not in participants or body.aidantId not in participants or body.aidantId == uid:
        raise HTTPException(status_code=403, detail="Not a participant of this conversation")
    if conv.get("clientId") and conv.get("clientId") != uid:
        raise HTTPException(status_code=403, detail="Only the client can review the service")
    if conv.get("status") not in REVIEWABLE_STATUSES:
        raise HTTPException(status_code=409, detail="Service not finished yet")

    server_timestamp = _server_timestamp()
    try:
        saved = upsert_review(
            db,
            aidant_id=body.aidantId,
            client_id=uid,
            conversation_id=body.conversationId,
            rating=body.rating,
            comment=body.comment,
            client_name=body.clientName or decoded.get("name"),
            service_date=body.serviceDate or conv.get("jour"),
            secteur=body.secteur or conv.get("secteur"),
            duree_service=body.dureeService,
            montant_service=body.montantService,
            server_timestamp=server_timestamp,
        )
        stats = recompute_aidant_stats(db, body.aidantId, server_timestamp)
    except Exception:
        logger.exception("Enregistrement de l'avis impossible (conversation %s)", body.conversationId)
        raise HTTPException(status_code=500, detail="Review could not be saved")

    logger.info("Avis %s enregistré (%s) — aidant %s : %s/5 sur %s avis",
                saved["reviewId"], "créé" if saved["created"] else "mis à jour",
                body.aidantId, stats["averageRating"], stats["totalReviews"])
    return {**saved, **stats}


@router.post("/recompute")
async def recompute_reviews(
    body: Optional[RecomputeRequest] = None,
    authorization: Optional[str] = Header(default=None),
):
    """Recalcule la note d'un aidant (ou de tous). Réservé aux administrateurs."""
    decoded = _require_uid(authorization)
    db = _require_db()
    if not _is_admin(db, str(decoded["uid"])):
        raise HTTPException(status_code=403, detail="Admin only")

    server_timestamp = _server_timestamp()
    try:
        if body and body.aidantId:
            stats = recompute_aidant_stats(db, body.aidantId, server_timestamp)
            return {"aidants": 1, "aidantId": body.aidantId, **stats}
        return recompute_all_stats(db, server_timestamp)
    except Exception:
        logger.exception("Recalcul des notes impossible")
        raise HTTPException(status_code=500, detail="Recompute failed")
