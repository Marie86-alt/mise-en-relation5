"""
Configuration module for the FastAPI application.

Centralized configuration management for environment variables and application settings.
"""

import os
from pathlib import Path
from typing import List
import logging

# Get root directory
ROOT_DIR = Path(__file__).parent.parent

logger = logging.getLogger(__name__)


class Settings:
    """Application settings"""

    # API Settings
    API_TITLE: str = "API Mise en Relation - A La Case Nout Gramoun"
    API_DESCRIPTION: str = "API pour l'application de mise en relation"
    API_VERSION: str = "1.0.0"

    # Firebase Settings
    FIREBASE_PROJECT_ID: str = os.environ.get("FIREBASE_PROJECT_ID", "")
    SERVICE_ACCOUNT_PATH: Path = ROOT_DIR / "service-account.json"

    # Stripe Settings
    STRIPE_SECRET_KEY: str = os.environ.get("STRIPE_SECRET_KEY", "")
    STRIPE_PUBLIC_KEY: str = os.environ.get("STRIPE_PUBLIC_KEY", "")

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
            logger.warning(
                "⚠️ STRIPE_SECRET_KEY non défini - les paiements ne fonctionneront pas"
            )


# Create global settings instance
settings = Settings()
