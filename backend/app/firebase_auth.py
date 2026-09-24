"""
Firebase Admin helpers: authentification des requêtes et accès Firestore côté serveur.
"""

import json
import logging
from typing import Optional

import firebase_admin
from fastapi import HTTPException
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

from .config import settings

logger = logging.getLogger(__name__)


def _build_credentials() -> Optional[credentials.Base]:
    """Compte de service : fichier local, sinon JSON en variable d'environnement."""
    if settings.SERVICE_ACCOUNT_PATH.exists():
        return credentials.Certificate(str(settings.SERVICE_ACCOUNT_PATH))
    if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
        try:
            return credentials.Certificate(json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON))
        except (ValueError, TypeError):
            logger.exception("FIREBASE_SERVICE_ACCOUNT_JSON illisible")
    return None


def _ensure_firebase_app() -> bool:
    try:
        firebase_admin.get_app()
        return True
    except ValueError:
        pass

    try:
        cred = _build_credentials()
        if cred is not None:
            firebase_admin.initialize_app(cred)
        elif settings.FIREBASE_PROJECT_ID:
            # Suffisant pour vérifier des tokens ; insuffisant pour écrire dans Firestore.
            firebase_admin.initialize_app(options={"projectId": settings.FIREBASE_PROJECT_ID})
        else:
            logger.warning("Firebase Admin is not configured")
            return False
        return True
    except Exception:
        logger.exception("Firebase Admin initialization failed")
        return False


def has_service_account() -> bool:
    """Vrai si des identifiants permettant d'écrire dans Firestore sont disponibles."""
    return settings.SERVICE_ACCOUNT_PATH.exists() or bool(settings.FIREBASE_SERVICE_ACCOUNT_JSON)


def get_firestore_client():
    """
    Client Firestore Admin (contourne les règles de sécurité : réservé au serveur).
    Retourne None si Firebase n'est pas configuré avec un compte de service.
    """
    if not has_service_account() or not _ensure_firebase_app():
        return None
    try:
        from firebase_admin import firestore

        return firestore.client()
    except Exception:
        logger.exception("Firestore client initialization failed")
        return None


def verify_bearer_token(
    authorization: Optional[str],
    *,
    required: bool = False,
) -> Optional[dict]:
    """
    Verify a Firebase ID token from an Authorization header.

    When `required` is false, missing tokens remain compatible with already
    published clients. Invalid supplied tokens are rejected when Firebase Admin
    is available. If Firebase Admin is not configured yet, the request is only
    rejected when strict mode is enabled.
    """
    if not authorization:
        if required:
            raise HTTPException(status_code=401, detail="Authentication required")
        logger.warning("Payment request accepted without Authorization header")
        return None

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid Authorization header")

    if not _ensure_firebase_app():
        if required:
            raise HTTPException(status_code=503, detail="Firebase auth unavailable")
        logger.warning("Payment request accepted without Firebase token verification")
        return None

    try:
        return firebase_auth.verify_id_token(token)
    except Exception:
        logger.exception("Firebase token verification failed")
        raise HTTPException(status_code=401, detail="Invalid Firebase token")
