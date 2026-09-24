"""
Firebase Admin helpers: authentification des requêtes et accès Firestore côté serveur.
"""

import json
import logging
from typing import Any, Dict, Optional, Tuple

import firebase_admin
from fastapi import HTTPException
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

from .config import settings

logger = logging.getLogger(__name__)

BACKSLASH = chr(92)

# Dernière erreur d'initialisation (type + message court), pour le diagnostic /health/integrations
last_init_error: Optional[str] = None


def _remember_error(stage: str, exc: Exception) -> None:
    global last_init_error
    last_init_error = f"{stage}: {type(exc).__name__}: {str(exc)[:160]}"


def parse_service_account_json(raw: Optional[str]) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Décode le JSON du compte de service en tolérant les collages courants dans une variable
    d'environnement : guillemets autour du JSON, guillemets internes échappés, JSON doublement
    encodé. Retourne (données, note) ; `note` indique la correction appliquée, None si aucune.
    """
    if not raw:
        return None, None
    text = raw.strip()
    candidates = [(text, None)]
    if len(text) >= 2 and text[0] == text[-1] and text[0] in ('"', "'"):
        inner = text[1:-1]
        candidates.append((inner, "stripped_quotes"))
        candidates.append((inner.replace(BACKSLASH + '"', '"'), "unescaped_quotes"))

    for candidate, note in candidates:
        try:
            data = json.loads(candidate)
        except (ValueError, TypeError):
            continue
        if isinstance(data, str):  # JSON doublement encodé : la valeur est elle-même du JSON
            try:
                data = json.loads(data)
                note = note or "double_encoded"
            except (ValueError, TypeError):
                continue
        if isinstance(data, dict):
            return data, note
    return None, None


def _service_account_raw() -> Tuple[Optional[str], Optional[str]]:
    if settings.SERVICE_ACCOUNT_PATH.exists():
        try:
            return settings.SERVICE_ACCOUNT_PATH.read_text(encoding="utf-8"), "file"
        except OSError:
            return None, "file"
    if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
        return settings.FIREBASE_SERVICE_ACCOUNT_JSON, "env"
    return None, None


def service_account_diagnostic() -> dict:
    """État du compte de service sans exposer de valeur : source, JSON lisible, champs clés, projet."""
    raw, source = _service_account_raw()
    info: Dict[str, Any] = {
        "source": source,
        "length": len(raw) if raw else 0,
        "jsonValid": False,
        "jsonFixApplied": None,
        "wrappedInQuotes": False,
        "hasPrivateKey": False,
        "privateKeyLooksValid": False,
        "clientEmailDomain": None,
        "projectId": None,
        "projectMatches": None,
        "lastInitError": last_init_error,
    }
    if not raw:
        return info

    stripped = raw.strip()
    info["wrappedInQuotes"] = len(stripped) >= 2 and stripped[0] == stripped[-1] and stripped[0] in ('"', "'")
    # Indices de structure (aucune valeur) : aident à comprendre comment le JSON a été déformé
    info["structure"] = {
        "startsWith": stripped[:2],
        "realNewlines": stripped.count(chr(10)),
        "backslashN": stripped.count(BACKSLASH + "n"),
        "escapedQuotes": stripped.count(BACKSLASH + '"'),
        "doubleBackslashes": stripped.count(BACKSLASH + BACKSLASH),
    }

    data, note = parse_service_account_json(raw)
    if data is None:
        # Message du décodeur pour la valeur brute et pour la valeur sans guillemets
        errors = {}
        for label, candidate in (("raw", stripped), ("stripped", stripped[1:-1] if info["wrappedInQuotes"] else None)):
            if candidate is None:
                continue
            try:
                json.loads(candidate)
                errors[label] = "ok (mais pas un objet)"
            except (ValueError, TypeError) as exc:
                errors[label] = str(exc)[:120]
        info["jsonErrors"] = errors
        return info

    info["jsonValid"] = True
    info["jsonFixApplied"] = note
    key = data.get("private_key") or ""
    info["hasPrivateKey"] = bool(key)
    info["privateKeyLooksValid"] = key.startswith("-----BEGIN PRIVATE KEY-----") and chr(10) in key
    email = data.get("client_email") or ""
    info["clientEmailDomain"] = email.split("@", 1)[1] if "@" in email else None
    info["projectId"] = data.get("project_id")
    info["projectMatches"] = (
        data.get("project_id") == settings.FIREBASE_PROJECT_ID if settings.FIREBASE_PROJECT_ID else None
    )
    return info


def _build_credentials() -> Optional[credentials.Base]:
    """Compte de service : fichier local, sinon JSON en variable d'environnement."""
    raw, source = _service_account_raw()
    if not raw:
        return None
    data, note = parse_service_account_json(raw)
    if data is None:
        _remember_error("credentials", ValueError("JSON du compte de service illisible"))
        logger.error("Compte de service (%s) illisible : JSON invalide", source)
        return None
    if note:
        logger.warning("Compte de service (%s) : correction de collage appliquée (%s)", source, note)
    try:
        return credentials.Certificate(data)
    except Exception as exc:  # noqa: BLE001 - clé invalide, champs manquants…
        _remember_error("credentials", exc)
        logger.exception("Compte de service (%s) invalide", source)
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
