"""
Tests for Stripe payment route compatibility and server-side amount validation.
"""

from app.routes import payments


class FakePaymentIntent:
    @staticmethod
    def create(**kwargs):
        return {
            "id": "pi_test_123",
            "client_secret": "pi_test_123_secret_test",
            "amount": kwargs["amount"],
            "currency": kwargs["currency"],
            "status": "requires_payment_method",
        }

    @staticmethod
    def retrieve(payment_intent_id):
        return {
            "id": payment_intent_id,
            "client_secret": f"{payment_intent_id}_secret_test",
            "amount": 2000,
            "currency": "eur",
            "status": "succeeded",
        }


def configure_fake_stripe(monkeypatch):
    monkeypatch.setattr(payments.settings, "STRIPE_SECRET_KEY", "sk_test_fake")
    monkeypatch.setattr(payments.settings, "PAYMENT_AUTH_REQUIRED", False)
    monkeypatch.setattr(payments.stripe, "PaymentIntent", FakePaymentIntent)


def test_create_payment_intent_legacy_endpoint(client, monkeypatch):
    configure_fake_stripe(monkeypatch)

    response = client.post(
        "/api/create-payment-intent",
        json={
            "amount": 2000,
            "currency": "eur",
            "metadata": {"type": "deposit", "totalAmount": "100"},
        },
    )

    assert response.status_code == 200
    assert response.json()["amount"] == 2000
    assert response.json()["client_secret"] == "pi_test_123_secret_test"


def test_create_payment_intent_canonical_endpoint(client, monkeypatch):
    configure_fake_stripe(monkeypatch)

    response = client.post(
        "/api/payments/create-intent",
        json={
            "amount": 8000,
            "currency": "eur",
            "metadata": {"type": "final", "totalAmount": "100"},
        },
    )

    assert response.status_code == 200
    assert response.json()["amount"] == 8000


def test_create_payment_intent_rejects_mismatched_amount(client, monkeypatch):
    configure_fake_stripe(monkeypatch)

    response = client.post(
        "/api/payments/create-intent",
        json={
            "amount": 100,
            "currency": "eur",
            "metadata": {"type": "deposit", "totalAmount": "100"},
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid payment amount"


def test_confirm_payment_returns_payment_intent_status(client, monkeypatch):
    configure_fake_stripe(monkeypatch)

    response = client.post(
        "/api/payments/confirm-payment",
        json={"paymentIntentId": "pi_test_123"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "succeeded"


def test_confirm_payment_legacy_endpoint_returns_payment_intent_status(client, monkeypatch):
    configure_fake_stripe(monkeypatch)

    response = client.post(
        "/api/confirm-payment",
        json={"paymentIntentId": "pi_test_123"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "succeeded"


def test_payment_status_endpoint_returns_payment_intent_status(client, monkeypatch):
    configure_fake_stripe(monkeypatch)

    response = client.post(
        "/api/payments/payment-status",
        json={"paymentIntentId": "pi_test_123"},
    )

    assert response.status_code == 200
    assert response.json()["id"] == "pi_test_123"


def test_required_payment_auth_rejects_missing_token(client, monkeypatch):
    configure_fake_stripe(monkeypatch)
    monkeypatch.setattr(payments.settings, "PAYMENT_AUTH_REQUIRED", True)

    response = client.post(
        "/api/payments/create-intent",
        json={
            "amount": 2000,
            "currency": "eur",
            "metadata": {
                "type": "deposit",
                "totalAmount": "100",
                "clientId": "user_123",
            },
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication required"


def test_payment_auth_rejects_client_id_mismatch(client, monkeypatch):
    configure_fake_stripe(monkeypatch)
    monkeypatch.setattr(
        payments,
        "verify_bearer_token",
        lambda authorization, *, required=False: {"uid": "other_user"},
    )

    response = client.post(
        "/api/payments/create-intent",
        headers={"Authorization": "Bearer test-token"},
        json={
            "amount": 2000,
            "currency": "eur",
            "metadata": {
                "type": "deposit",
                "totalAmount": "100",
                "clientId": "user_123",
            },
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Payment user mismatch"
