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

# Dernière erreur d'initialisation (type + message court), pour le diagnostic /health/integrations
last_init_error: Optional[str] = None


def service_account_diagnostic() -> dict:
    """État du compte de service sans exposer de valeur : source, JSON lisible, champs clés, projet."""
    source = None
    raw = None
    if settings.SERVICE_ACCOUNT_PATH.exists():
        source = "file"
        try:
            raw = settings.SERVICE_ACCOUNT_PATH.read_text(encoding="utf-8")
        except OSError:
            raw = None
    elif settings.FIREBASE_SERVICE_ACCOUNT_JSON:
        source = "env"
        raw = settings.FIREBASE_SERVICE_ACCOUNT_JSON

    info = {
        "source": source,
        "length": len(raw) if raw else 0,
        "jsonValid": False,
        "hasPrivateKey": False,
        "privateKeyLooksValid": False,
        "clientEmailDomain": None,
        "projectId": None,
        "projectMatches": None,
        "lastInitError": last_init_error,
    }
    if not raw:
        return info
    try:
        data = json.loads(raw)
    except (ValueError, TypeError):
        # Collage avec guillemets autour ou caractères d'échappement doublés ?
        stripped = raw.strip()
        info["wrappedInQuotes"] = stripped[:1] in ("'", '"') and stripped[-1:] == stripped[:1]
        return info
    if not isinstance(data, dict):
        return info
    info["jsonValid"] = True
    key = data.get("private_key") or ""
    info["hasPrivateKey"] = bool(key)
    info["privateKeyLooksValid"] = key.startswith("-----BEGIN PRIVATE KEY-----") and "
" in key
    email = data.get("client_email") or ""
    info["clientEmailDomain"] = email.split("@", 1)[1] if "@" in email else None
    info["projectId"] = data.get("project_id")
    info["projectMatches"] = (
        data.get("project_id") == settings.FIREBASE_PROJECT_ID if settings.FIREBASE_PROJECT_ID else None
    )
    return info


def _build_credentials() -> Optional[credentials.Base]:
    """Compte de service : fichier local, sinon JSON en variable d'environnement."""
    if settings.SERVICE_ACCOUNT_PATH.exists():
        return credentials.Certificate(str(settings.SERVICE_ACCOUNT_PATH))
    if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
        try:
            return credentials.Certificate(json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON))
        except Exception as exc:  # noqa: BLE001 - JSON illisible, clé invalide…
            _remember_error("credentials", exc)
            logger.exception("FIREBASE_SERVICE_ACCOUNT_JSON illisible")
    return None


def _remember_error(stage: str, exc: Exception) -> None:
    global last_init_error
    last_init_error = f"{stage}: {type(exc).__name__}: {str(exc)[:160]}"


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
    except Exception as exc:  # noqa: BLE001
        _remember_error("initialize_app", exc)
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
    except Exception as exc:  # noqa: BLE001
        _remember_error("firestore.client", exc)
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
