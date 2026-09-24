"""
Tests de la route de diagnostic /api/health/integrations et du décodage du compte de service.
"""

from pathlib import Path

from app import firebase_auth
from app.routes import health
from app.services import pricing_config

BS = chr(92)
NL = chr(10)
BACKSLASH_N = BS + "n"  # séquence « backslash n » (deux caractères), telle qu'un JSON l'écrit
VALID_JSON = (
    '{"project_id":"p","client_email":"svc@p.iam.gserviceaccount.com",'
    '"private_key":"-----BEGIN PRIVATE KEY-----' + BACKSLASH_N + 'abc' + BACKSLASH_N + '"}'
)


class FakeSnap:
    exists = True


class FakeDb:
    def collection(self, name):
        return self

    def document(self, doc_id):
        return self

    def get(self):
        return FakeSnap()


class BrokenDb(FakeDb):
    def get(self):
        raise PermissionError("denied")


def _env_only(monkeypatch, raw):
    monkeypatch.setattr(firebase_auth.settings, "SERVICE_ACCOUNT_PATH", Path("absent-service-account.json"))
    monkeypatch.setattr(firebase_auth.settings, "FIREBASE_SERVICE_ACCOUNT_JSON", raw)
    monkeypatch.setattr(firebase_auth.settings, "FIREBASE_PROJECT_ID", "p")


# --------------------------------------------------------------------------- route
def test_integrations_without_service_account(client, monkeypatch):
    monkeypatch.setattr(health, "has_service_account", lambda: False)
    monkeypatch.setattr(health.settings, "STRIPE_SECRET_KEY", "sk_live_x")
    monkeypatch.setattr(health.settings, "STRIPE_WEBHOOK_SECRET", "")
    pricing_config.clear_cache()

    body = client.get("/api/health/integrations").json()

    assert body["ok"] is False
    assert body["serviceAccount"] is False
    assert body["firestore"] == "not_configured"
    assert body["stripeKeyMode"] == "live"
    assert body["webhookSecret"] is False
    assert "sk_live_x" not in str(body)  # aucune valeur secrète


def test_integrations_all_green(client, monkeypatch):
    monkeypatch.setattr(health, "has_service_account", lambda: True)
    monkeypatch.setattr(health, "get_firestore_client", lambda: FakeDb())
    monkeypatch.setattr(health.settings, "STRIPE_SECRET_KEY", "sk_test_x")
    monkeypatch.setattr(health.settings, "STRIPE_WEBHOOK_SECRET", "whsec_x")
    pricing_config.clear_cache()

    body = client.get("/api/health/integrations").json()

    assert body["ok"] is True
    assert body["firestore"] == "ok"
    assert body["pricingConfigDocument"] is True
    assert body["stripeKeyMode"] == "test"


def test_integrations_reports_firestore_error_type_only(client, monkeypatch):
    monkeypatch.setattr(health, "has_service_account", lambda: True)
    monkeypatch.setattr(health, "get_firestore_client", lambda: BrokenDb())
    pricing_config.clear_cache()

    body = client.get("/api/health/integrations").json()

    assert body["ok"] is False
    assert body["firestore"] == "error"
    assert body["firestoreError"] == "PermissionError"
    pricing_config.clear_cache()


# --------------------------------------------------------------------------- décodage du compte de service
def test_parse_accepts_clean_json():
    data, note = firebase_auth.parse_service_account_json(VALID_JSON)
    assert data["project_id"] == "p" and note is None


def test_parse_strips_surrounding_quotes():
    data, note = firebase_auth.parse_service_account_json('"' + VALID_JSON + '"')
    assert data is not None and data["project_id"] == "p"
    assert note == "stripped_quotes"


def test_parse_unescapes_quoted_json():
    escaped = '"' + VALID_JSON.replace('"', BS + '"') + '"'
    data, note = firebase_auth.parse_service_account_json(escaped)
    assert data is not None and data["client_email"].startswith("svc@")
    assert note == "unescaped_quotes"


def test_parse_rejects_real_newline_inside_key():
    broken = '{"project_id":"p","private_key":"-----BEGIN PRIVATE KEY-----' + NL + 'abc"}'
    assert firebase_auth.parse_service_account_json(broken) == (None, None)


def test_diagnostic_reports_quotes_and_recovery(monkeypatch):
    _env_only(monkeypatch, '"' + VALID_JSON + '"')

    info = firebase_auth.service_account_diagnostic()

    assert info["source"] == "env"
    assert info["wrappedInQuotes"] is True
    assert info["jsonValid"] is True
    assert info["jsonFixApplied"] == "stripped_quotes"
    assert info["projectMatches"] is True


def test_diagnostic_valid_json_without_secrets(monkeypatch):
    _env_only(monkeypatch, VALID_JSON)

    info = firebase_auth.service_account_diagnostic()

    assert info["jsonValid"] is True
    assert info["hasPrivateKey"] is True
    assert info["privateKeyLooksValid"] is True
    assert info["clientEmailDomain"] == "p.iam.gserviceaccount.com"
    assert "abc" not in str(info) and "svc@" not in str(info)
