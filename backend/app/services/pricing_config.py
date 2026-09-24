"""
Configuration tarifaire lue depuis Firestore (`config/pricing`), la même que l'application.

Le document est modifié par un administrateur depuis l'app ; le serveur le relit (cache 60 s)
pour vérifier les montants d'acompte / solde et calculer la commission. En l'absence de
Firestore ou du document, les valeurs d'environnement (DEPOSIT_RATE, COMMISSION_RATE) s'appliquent.
"""

import logging
import time
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Optional

from ..config import settings
from ..firebase_auth import get_firestore_client

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 60
PRICING_COLLECTION = "config"
PRICING_DOC_ID = "pricing"


@dataclass(frozen=True)
class PricingConfig:
    hourly_rate: Decimal
    min_hours: int
    deposit_rate: Decimal
    commission_rate: Decimal
    source: str  # "firestore" | "defaults"


def defaults() -> PricingConfig:
    return PricingConfig(
        hourly_rate=Decimal("22"),
        min_hours=2,
        deposit_rate=settings.DEPOSIT_RATE,
        commission_rate=settings.COMMISSION_RATE,
        source="defaults",
    )


def _decimal_in(value: Any, low: Decimal, high: Decimal, fallback: Decimal) -> Decimal:
    if value is None or value == "":
        return fallback
    try:
        parsed = Decimal(str(value).replace(",", "."))
    except (InvalidOperation, ValueError, TypeError):
        return fallback
    return parsed if low <= parsed <= high else fallback


def parse_pricing_document(data: Optional[Dict[str, Any]]) -> PricingConfig:
    """Applique les mêmes bornes que sanitizePricingConfig côté application."""
    base = defaults()
    if not data:
        return base
    return PricingConfig(
        hourly_rate=_decimal_in(data.get("hourlyRate"), Decimal("1"), Decimal("500"), base.hourly_rate),
        min_hours=int(_decimal_in(data.get("minHours"), Decimal("1"), Decimal("12"), Decimal(base.min_hours))),
        deposit_rate=_decimal_in(data.get("depositRate"), Decimal("0.01"), Decimal("0.99"), base.deposit_rate),
        commission_rate=_decimal_in(data.get("commissionRate"), Decimal("0"), Decimal("0.99"), base.commission_rate),
        source="firestore",
    )


_cache: Dict[str, Any] = {"expires": 0.0, "value": None}


def clear_cache() -> None:
    _cache["expires"] = 0.0
    _cache["value"] = None


def get_pricing_config(force_refresh: bool = False) -> PricingConfig:
    now = time.monotonic()
    if not force_refresh and _cache["value"] is not None and now < _cache["expires"]:
        return _cache["value"]

    config = defaults()
    db = get_firestore_client()
    if db is not None:
        try:
            snap = db.collection(PRICING_COLLECTION).document(PRICING_DOC_ID).get()
            if snap.exists:
                config = parse_pricing_document(snap.to_dict())
        except Exception:
            logger.exception("Lecture de config/pricing impossible, valeurs par défaut utilisées")

    _cache["expires"] = now + CACHE_TTL_SECONDS
    _cache["value"] = config
    return config
