"""
Avis clients et notes des aidants, calculés côté serveur.

Le client mobile n'écrit plus `aidant_stats` ni `users.averageRating` (les règles Firestore
le lui interdisaient déjà : l'écriture échouait en silence et les notes ne bougeaient jamais).
Ici, chaque avis enregistré déclenche un recalcul complet à partir de la collection `avis`,
ce qui rend le résultat insensible aux doublons, rejeux ou avis supprimés par un admin.
"""

import logging
from typing import Any, Dict, Iterable, Optional, Set

try:  # API moderne de google-cloud-firestore ; repli sur la forme positionnelle sinon
    from google.cloud.firestore_v1.base_query import FieldFilter
except Exception:  # pragma: no cover - dépend de la version installée
    FieldFilter = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)

RATING_MIN = 1
RATING_MAX = 5


def _where_equals(collection, field: str, value: Any):
    if FieldFilter is not None:
        return collection.where(filter=FieldFilter(field, "==", value))
    return collection.where(field, "==", value)


def review_doc_id(conversation_id: str, client_id: str) -> str:
    """Un seul avis par client et par conversation : identifiant déterministe (idempotence)."""
    return f"{conversation_id}__{client_id}"


def compute_stats(ratings: Iterable[Any]) -> Dict[str, Any]:
    """Moyenne (1 décimale), total et répartition 1..5 ; les notes invalides sont ignorées."""
    values = []
    for raw in ratings:
        try:
            value = int(raw)
        except (TypeError, ValueError):
            continue
        if RATING_MIN <= value <= RATING_MAX:
            values.append(value)

    distribution = {str(n): 0 for n in range(RATING_MIN, RATING_MAX + 1)}
    for value in values:
        distribution[str(value)] += 1

    total = len(values)
    average = round(sum(values) / total, 1) if total else 0
    return {"averageRating": average, "totalReviews": total, "ratingDistribution": distribution}


def upsert_review(
    db,
    *,
    aidant_id: str,
    client_id: str,
    conversation_id: str,
    rating: int,
    comment: str,
    client_name: Optional[str],
    service_date: Optional[str],
    secteur: Optional[str],
    duree_service: Optional[float],
    montant_service: Optional[float],
    server_timestamp: Any,
) -> Dict[str, Any]:
    """Crée ou remplace l'avis de ce client pour cette conversation. Retourne {"reviewId", "created"}."""
    review_id = review_doc_id(conversation_id, client_id)
    ref = db.collection("avis").document(review_id)
    existing = ref.get()
    previous = (existing.to_dict() or {}) if existing.exists else {}

    data: Dict[str, Any] = {
        "aidantId": aidant_id,
        "clientId": client_id,
        "conversationId": conversation_id,
        "rating": int(rating),
        "comment": (comment or "").strip() or "Service satisfaisant.",
        "clientName": client_name or previous.get("clientName") or "Client anonyme",
        "serviceDate": service_date or previous.get("serviceDate"),
        "secteur": secteur or previous.get("secteur"),
        "dureeService": duree_service if duree_service is not None else previous.get("dureeService"),
        "montantService": montant_service if montant_service is not None else previous.get("montantService"),
        "isVerified": True,
        "source": "api",
        "createdAt": previous.get("createdAt") or server_timestamp,
        "updatedAt": server_timestamp,
    }
    ref.set(data)
    return {"reviewId": review_id, "created": not existing.exists}


def recompute_aidant_stats(db, aidant_id: str, server_timestamp: Any) -> Dict[str, Any]:
    """Recalcule la note d'un aidant depuis `avis` et l'écrit sur son profil (+ aidant_stats, compat)."""
    docs = _where_equals(db.collection("avis"), "aidantId", aidant_id).stream()
    stats = compute_stats((doc.to_dict() or {}).get("rating") for doc in docs)

    user_ref = db.collection("users").document(aidant_id)
    if user_ref.get().exists:
        user_ref.set({**stats, "reviewsUpdatedAt": server_timestamp}, merge=True)
    else:
        logger.warning("Recalcul des notes : profil %s introuvable, seul aidant_stats est mis à jour", aidant_id)

    db.collection("aidant_stats").document(aidant_id).set({**stats, "lastReviewAt": server_timestamp}, merge=True)
    return stats


def recompute_all_stats(db, server_timestamp: Any) -> Dict[str, Any]:
    """Recalcule la note de tous les aidants ayant au moins un avis (réparation / migration)."""
    aidant_ids: Set[str] = set()
    for doc in db.collection("avis").stream():
        aidant_id = (doc.to_dict() or {}).get("aidantId")
        if aidant_id:
            aidant_ids.add(str(aidant_id))

    for aidant_id in sorted(aidant_ids):
        recompute_aidant_stats(db, aidant_id, server_timestamp)

    logger.info("Notes recalculées pour %d aidant(s)", len(aidant_ids))
    return {"aidants": len(aidant_ids)}
