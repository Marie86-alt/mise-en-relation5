"""
Tests de la configuration tarifaire côté serveur (config/pricing) et de son usage dans les routes.
"""

from decimal import Decimal

from app.routes import payments
from app.services import pricing_config


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


def configure_fake_stripe(monkeypatch):
    monkeypatch.setattr(payments.settings, "STRIPE_SECRET_KEY", "sk_test_fake")
    monkeypatch.setattr(payments.settings, "PAYMENT_AUTH_REQUIRED", False)
    monkeypatch.setattr(payments.stripe, "PaymentIntent", FakePaymentIntent)


def test_parse_document_applies_bounds_and_fallbacks():
    parsed = pricing_config.parse_pricing_document(
        {"hourlyRate": "25", "minHours": 3, "depositRate": 0.3, "commissionRate": "n'importe quoi"}
    )

    assert parsed.hourly_rate == Decimal("25")
    assert parsed.min_hours == 3
    assert parsed.deposit_rate == Decimal("0.3")
    assert parsed.commission_rate == pricing_config.defaults().commission_rate  # valeur illisible → défaut
    assert parsed.source == "firestore"


def test_parse_document_rejects_out_of_range_values():
    parsed = pricing_config.parse_pricing_document({"hourlyRate": 0, "depositRate": 1.5, "minHours": 40})
    base = pricing_config.defaults()

    assert parsed.hourly_rate == base.hourly_rate
    assert parsed.deposit_rate == base.deposit_rate
    assert parsed.min_hours == base.min_hours


def test_missing_document_gives_defaults():
    assert pricing_config.parse_pricing_document(None).source == "defaults"


def test_get_pricing_config_uses_defaults_without_firestore(monkeypatch):
    pricing_config.clear_cache()
    monkeypatch.setattr(pricing_config, "get_firestore_client", lambda: None)

    config = pricing_config.get_pricing_config(force_refresh=True)

    assert config.source == "defaults"
    assert config.deposit_rate == pricing_config.settings.DEPOSIT_RATE


def test_get_pricing_config_reads_firestore_and_caches(monkeypatch):
    class Snap:
        exists = True

        @staticmethod
        def to_dict():
            return {"depositRate": 0.25, "commissionRate": 0.35}

    calls = {"n": 0}

    class Db:
        def collection(self, name):
            return self

        def document(self, doc_id):
            return self

        def get(self):
            calls["n"] += 1
            return Snap()

    pricing_config.clear_cache()
    monkeypatch.setattr(pricing_config, "get_firestore_client", lambda: Db())

    first = pricing_config.get_pricing_config(force_refresh=True)
    second = pricing_config.get_pricing_config()

    assert first.deposit_rate == Decimal("0.25") and first.commission_rate == Decimal("0.35")
    assert second is first
    assert calls["n"] == 1  # servi par le cache
    pricing_config.clear_cache()


def test_create_intent_uses_deposit_rate_from_config(client, monkeypatch):
    """Acompte à 30 % : pour 100 €, l'app doit envoyer 3000 c et le solde 7000 c."""
    configure_fake_stripe(monkeypatch)
    monkeypatch.setattr(
        payments,
        "get_pricing_config",
        lambda: pricing_config.PricingConfig(Decimal("22"), 2, Decimal("0.30"), Decimal("0.40"), "test"),
    )

    old_rate = client.post(
        "/api/payments/create-intent",
        json={"amount": 2000, "currency": "eur", "metadata": {"type": "deposit", "totalAmount": "100"}},
    )
    deposit = client.post(
        "/api/payments/create-intent",
        json={"amount": 3000, "currency": "eur", "metadata": {"type": "deposit", "totalAmount": "100"}},
    )
    final = client.post(
        "/api/payments/create-intent",
        json={"amount": 7000, "currency": "eur", "metadata": {"type": "final", "totalAmount": "100"}},
    )

    assert old_rate.status_code == 400
    assert deposit.status_code == 200
    assert final.status_code == 200
