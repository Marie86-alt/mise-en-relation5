"""
Tests de la route de diagnostic /api/health/integrations.
"""

from app.routes import health
from app.services import pricing_config


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
    assert "STRIPE" not in str(body)  # aucune valeur secrète


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


def test_service_account_diagnostic_detects_broken_json(monkeypatch):
    from app import firebase_auth

    monkeypatch.setattr(firebase_auth.settings, "FIREBASE_SERVICE_ACCOUNT_JSON", '"{not json"')
    monkeypatch.setattr(firebase_auth.settings, "SERVICE_ACCOUNT_PATH", firebase_auth.settings.SERVICE_ACCOUNT_PATH.parent / "absent.json")

    info = firebase_auth.service_account_diagnostic()

    assert info["source"] == "env" and info["jsonValid"] is False
    assert info["wrappedInQuotes"] is True


def test_service_account_diagnostic_valid_json_without_secrets(monkeypatch):
    from app import firebase_auth

    monkeypatch.setattr(
        firebase_auth.settings,
        "FIREBASE_SERVICE_ACCOUNT_JSON",
        '{"project_id":"p","client_email":"svc@p.iam.gserviceaccount.com","private_key":"-----BEGIN PRIVATE KEY-----\nabc\n"}',
    )
    monkeypatch.setattr(firebase_auth.settings, "FIREBASE_PROJECT_ID", "p")
    monkeypatch.setattr(firebase_auth.settings, "SERVICE_ACCOUNT_PATH", firebase_auth.settings.SERVICE_ACCOUNT_PATH.parent / "absent.json")

    info = firebase_auth.service_account_diagnostic()

    assert info["jsonValid"] and info["hasPrivateKey"] and info["privateKeyLooksValid"]
    assert info["projectMatches"] is True
    assert info["clientEmailDomain"] == "p.iam.gserviceaccount.com"
    assert "abc" not in str(info) and "svc@" not in str(info)
