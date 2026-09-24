"""
Configuration module for the FastAPI application.

Centralized configuration management for environment variables and application settings.
"""

import logging
import os
from decimal import Decimal
from pathlib import Path
from typing import List

# Get root directory
ROOT_DIR = Path(__file__).parent.parent

logger = logging.getLogger(__name__)


def _env_flag(name: str, default: str = "false") -> bool:
    return os.environ.get(name, default).lower() in ("1", "true", "yes")


def _env_decimal(name: str, default: str) -> Decimal:
    try:
        return Decimal(os.environ.get(name, default))
    except Exception:  # valeur illisible → on garde la valeur par défaut
        logger.warning("⚠️ %s illisible, valeur par défaut %s utilisée", name, default)
        return Decimal(default)


class Settings:
    """Application settings"""

    # API Settings
    API_TITLE: str = "API Mise en Relation - A La Case Nout Gramoun"
    API_DESCRIPTION: str = "API pour l'application de mise en relation"
    API_VERSION: str = "1.1.0"

    # Firebase Settings
    FIREBASE_PROJECT_ID: str = os.environ.get("FIREBASE_PROJECT_ID", "")
    SERVICE_ACCOUNT_PATH: Path = ROOT_DIR / "service-account.json"
    # Alternative au fichier : contenu JSON du compte de service (pratique sur Railway)
    FIREBASE_SERVICE_ACCOUNT_JSON: str = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "")

    # Authentification obligatoire sur les routes de paiement.
    # ⚠️ Laisser à false tant que l'application publiée (1.0.2) n'envoie pas de token Firebase ;
    # passer à true dès que la version suivante est sur les stores.
    PAYMENT_AUTH_REQUIRED: bool = _env_flag("PAYMENT_AUTH_REQUIRED", "false")

    # Stripe Settings
    STRIPE_SECRET_KEY: str = os.environ.get("STRIPE_SECRET_KEY", "")
    STRIPE_PUBLIC_KEY: str = os.environ.get("STRIPE_PUBLIC_KEY", "")
    # Secret de signature du webhook (Dashboard Stripe → Développeurs → Webhooks → whsec_…)
    STRIPE_WEBHOOK_SECRET: str = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

    # Règles métier (source de vérité côté serveur)
    DEPOSIT_RATE: Decimal = _env_decimal("DEPOSIT_RATE", "0.20")  # acompte à la réservation
    COMMISSION_RATE: Decimal = _env_decimal("COMMISSION_RATE", "0.40")  # part plateforme

    # CORS Settings
    ALLOWED_ORIGINS: List[str] = (
        os.environ.get("ALLOWED_ORIGINS", "").split(",")
        if os.environ.get("ALLOWED_ORIGINS")
        else [
            "http://localhost:3000",
            "http://localhost:8081",
            "http://localhost:19006",
        ]
    )

    # Logging
    LOG_LEVEL: str = os.environ.get("LOG_LEVEL", "INFO")

    def __init__(self):
        """Initialize settings and validate required variables"""
        self._validate_settings()

    def _validate_settings(self):
        """Validate required environment variables"""
        if not self.FIREBASE_PROJECT_ID:
            logger.warning("⚠️ FIREBASE_PROJECT_ID n'est pas défini")

        if not self.STRIPE_SECRET_KEY:
            logger.warning("⚠️ STRIPE_SECRET_KEY non défini - les paiements ne fonctionneront pas")

        if not self.STRIPE_WEBHOOK_SECRET:
            logger.warning(
                "⚠️ STRIPE_WEBHOOK_SECRET non défini - les paiements ne seront pas enregistrés "
                "côté serveur (webhook désactivé)"
            )

        if not self.PAYMENT_AUTH_REQUIRED:
            logger.warning(
                "⚠️ PAYMENT_AUTH_REQUIRED=false : les routes de paiement acceptent les requêtes "
                "sans token Firebase (compatibilité avec l'application publiée)"
            )

        if not (Decimal("0") < self.DEPOSIT_RATE < Decimal("1")):
            raise ValueError("DEPOSIT_RATE doit être strictement compris entre 0 et 1")
        if not (Decimal("0") <= self.COMMISSION_RATE < Decimal("1")):
            raise ValueError("COMMISSION_RATE doit être compris entre 0 et 1")


# Create global settings instance
settings = Settings()
