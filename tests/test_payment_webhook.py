"""
Tests du webhook Stripe : signature, idempotence et écritures Firestore (Firestore simulé).
"""

from decimal import Decimal

import stripe

from app.routes import payments
from app.services import payment_records, pricing_config

SERVER_TS = "SERVER_TIMESTAMP"


# --------------------------------------------------------------------------- Firestore simulé
class FakeSnapshot:
    def __init__(self, data):
        self._data = data

    @property
    def exists(self):
        return self._data is not None

    def to_dict(self):
        return dict(self._data) if self._data is not None else None


class FakeDocument:
    def __init__(self, store, path):
        self._store = store
        self._path = path

    def get(self):
        return FakeSnapshot(self._store.get(self._path))

    def set(self, data, merge=False):
        if merge and self._path in self._store:
            self._store[self._path] = {**self._store[self._path], **data}
        else:
            self._store[self._path] = dict(data)


class FakeCollection:
    def __init__(self, store, name):
        self._store = store
        self._name = name

    def document(self, doc_id):
        return FakeDocument(self._store, f"{self._name}/{doc_id}")


class FakeDb:
    def __init__(self, initial=None):
        self.store = dict(initial or {})

    def collection(self, name):
        return FakeCollection(self.store, name)


def make_intent(payment_type="deposit", intent_id="pi_123", amount=1200):
    return {
        "id": intent_id,
        "amount": amount,
        "amount_received": amount,
        "currency": "eur",
        "status": "succeeded",
        "metadata": {
            "type": payment_type,
            "conversationId": "client_aidant",
            "clientId": "client",
            "aidantId": "aidant",
            "totalAmount": "60",
            "serviceDetails": '{"secteur":"Aide au repas","jour":"28/09/2026","heureDebut":"10h00","heureFin":"13h00","adresse":"Saint-Denis"}',
        },
    }


# --------------------------------------------------------------------------- service d'enregistrement
def test_deposit_creates_transaction_service_and_updates_conversation(monkeypatch):
    monkeypatch.setattr(
        payment_records,
        "get_pricing_config",
        lambda: pricing_config.PricingConfig(Decimal("22"), 2, Decimal("0.20"), Decimal("0.40"), "test"),
    )
    db = FakeDb({"conversations/client_aidant": {"status": "acompte_en_cours", "participants": ["client", "aidant"]}})

    result = payment_records.record_payment_intent_succeeded(db, make_intent("deposit"), SERVER_TS)

    assert result == {"recorded": True, "reason": "ok"}
    tx = db.store["transactions/pi_123"]
    assert tx["type"] == "acompte"
    assert tx["montant"] == 12.0
    assert tx["commission"] == 4.8
    assert tx["montantAidant"] == 7.2
    assert tx["status"] == "completed"
    assert tx["clientId"] == "client" and tx["aidantId"] == "aidant"

    service = db.store["services/client_aidant"]
    assert service["status"] == "acompte_paye"
    assert service["montant"] == 60.0
    assert service["secteur"] == "Aide au repas"
    assert service["adresse"] == "Saint-Denis"
    assert service["depositPaidAt"] == SERVER_TS

    assert db.store["conversations/client_aidant"]["status"] == "acompte_paye"
    # Les autres champs de la conversation sont conservés (merge)
    assert db.store["conversations/client_aidant"]["participants"] == ["client", "aidant"]


def test_final_payment_marks_service_and_conversation_done():
    db = FakeDb(
        {
            "conversations/client_aidant": {"status": "evaluation"},
            "services/client_aidant": {"status": "acompte_paye", "createdAt": "T0"},
        }
    )

    result = payment_records.record_payment_intent_succeeded(db, make_intent("final", "pi_final", 4800), SERVER_TS)

    assert result["recorded"] is True
    assert db.store["transactions/pi_final"]["type"] == "final"
    assert db.store["transactions/pi_final"]["montant"] == 48.0
    service = db.store["services/client_aidant"]
    assert service["status"] == "termine"
    assert service["completedAt"] == SERVER_TS
    assert service["createdAt"] == "T0"  # jamais réécrit
    assert db.store["conversations/client_aidant"]["status"] == "termine"


def test_replayed_event_is_idempotent():
    db = FakeDb()
    first = payment_records.record_payment_intent_succeeded(db, make_intent(), SERVER_TS)
    second = payment_records.record_payment_intent_succeeded(db, make_intent(), SERVER_TS)

    assert first["recorded"] is True
    assert second == {"recorded": False, "reason": "already_recorded"}
    assert len([k for k in db.store if k.startswith("transactions/")]) == 1


def test_unknown_payment_type_is_ignored():
    db = FakeDb()
    intent = make_intent()
    intent["metadata"]["type"] = "tip"

    result = payment_records.record_payment_intent_succeeded(db, intent, SERVER_TS)

    assert result == {"recorded": False, "reason": "unknown_payment_type"}
    assert db.store == {}


def test_missing_conversation_does_not_create_conversation_doc():
    db = FakeDb()  # aucune conversation existante

    payment_records.record_payment_intent_succeeded(db, make_intent(), SERVER_TS)

    assert "transactions/pi_123" in db.store
    assert "services/client_aidant" in db.store
    assert "conversations/client_aidant" not in db.store


# --------------------------------------------------------------------------- route HTTP
def configure_webhook(monkeypatch, db=None):
    monkeypatch.setattr(payments.settings, "STRIPE_WEBHOOK_SECRET", "whsec_test")
    monkeypatch.setattr(payments, "get_firestore_client", lambda: db)


def test_webhook_returns_503_when_not_configured(client, monkeypatch):
    monkeypatch.setattr(payments.settings, "STRIPE_WEBHOOK_SECRET", "")

    response = client.post("/api/payments/webhook", content=b"{}", headers={"Stripe-Signature": "t=1,v1=abc"})

    assert response.status_code == 503


def test_webhook_requires_signature_header(client, monkeypatch):
    configure_webhook(monkeypatch, FakeDb())

    response = client.post("/api/payments/webhook", content=b"{}")

    assert response.status_code == 400
    assert response.json()["detail"] == "Missing Stripe-Signature header"


def test_webhook_rejects_invalid_signature(client, monkeypatch):
    configure_webhook(monkeypatch, FakeDb())

    def raise_invalid(payload, sig_header, secret):
        raise stripe.error.SignatureVerificationError("Invalid signature", sig_header)

    monkeypatch.setattr(payments.stripe.Webhook, "construct_event", staticmethod(raise_invalid))

    response = client.post("/api/payments/webhook", content=b"{}", headers={"Stripe-Signature": "t=1,v1=bad"})

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid signature"


def test_webhook_records_succeeded_payment(client, monkeypatch):
    db = FakeDb({"conversations/client_aidant": {"status": "acompte_en_cours"}})
    configure_webhook(monkeypatch, db)
    event = {"type": "payment_intent.succeeded", "data": {"object": make_intent()}}
    monkeypatch.setattr(payments.stripe.Webhook, "construct_event", staticmethod(lambda p, s, k: event))

    response = client.post("/api/payments/webhook", content=b"{}", headers={"Stripe-Signature": "t=1,v1=ok"})

    assert response.status_code == 200
    body = response.json()
    assert body["handled"] is True and body["recorded"] is True
    assert db.store["transactions/pi_123"]["status"] == "completed"
    assert db.store["conversations/client_aidant"]["status"] == "acompte_paye"


def test_webhook_ignores_unhandled_events(client, monkeypatch):
    db = FakeDb()
    configure_webhook(monkeypatch, db)
    event = {"type": "charge.refunded", "data": {"object": {"id": "ch_1"}}}
    monkeypatch.setattr(payments.stripe.Webhook, "construct_event", staticmethod(lambda p, s, k: event))

    response = client.post("/api/payments/webhook", content=b"{}", headers={"Stripe-Signature": "t=1,v1=ok"})

    assert response.status_code == 200
    assert response.json()["handled"] is False
    assert db.store == {}


def test_webhook_returns_500_without_firestore_so_stripe_retries(client, monkeypatch):
    configure_webhook(monkeypatch, db=None)
    event = {"type": "payment_intent.succeeded", "data": {"object": make_intent()}}
    monkeypatch.setattr(payments.stripe.Webhook, "construct_event", staticmethod(lambda p, s, k: event))

    response = client.post("/api/payments/webhook", content=b"{}", headers={"Stripe-Signature": "t=1,v1=ok"})

    assert response.status_code == 500


def test_webhook_records_failed_payment(client, monkeypatch):
    db = FakeDb()
    configure_webhook(monkeypatch, db)
    intent = make_intent()
    intent["status"] = "requires_payment_method"
    intent["last_payment_error"] = {"code": "card_declined", "decline_code": "insufficient_funds", "message": "Refusée"}
    event = {"type": "payment_intent.payment_failed", "data": {"object": intent}}
    monkeypatch.setattr(payments.stripe.Webhook, "construct_event", staticmethod(lambda p, s, k: event))

    response = client.post("/api/payments/webhook", content=b"{}", headers={"Stripe-Signature": "t=1,v1=ok"})

    assert response.status_code == 200
    failure = db.store["payment_failures/pi_123"]
    assert failure["declineCode"] == "insufficient_funds"
    assert "transactions/pi_123" not in db.store
