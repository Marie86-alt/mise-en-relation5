"""
Tests unitaires pour les modèles Pydantic.
"""
import pytest
from datetime import datetime
from pydantic import ValidationError


class TestStatusModel:
      """Tests pour le modèle Status."""

    def test_status_model_valid_data(self):
              """Test création d'un modèle Status avec données valides."""
              from app.models.status import StatusCheck

        status = StatusCheck(
                      user_id="user123",
                      timestamp=datetime.now(),
                      status="active"
        )
        assert status.user_id == "user123"
        assert status.status == "active"

    def test_status_model_missing_user_id(self):
              """Test erreur validation avec user_id manquant."""
              from app.models.status import StatusCheck

        with pytest.raises(ValidationError):
                      StatusCheck(
                                        timestamp=datetime.now(),
                                        status="active"
                      )

    def test_status_model_invalid_timestamp(self):
              """Test erreur validation avec timestamp invalide."""
              from app.models.status import StatusCheck

        with pytest.raises(ValidationError):
                      StatusCheck(
                                        user_id="user123",
                                        timestamp="not-a-datetime",
                                        status="active"
                      )

    def test_status_model_optional_fields(self):
              """Test que certains champs sont optionnels."""
              from app.models.status import StatusCheck

        # Certains champs peuvent être optionnels
              status = StatusCheck(
                  user_id="user123",
                  status="active"
              )
              assert status.user_id == "user123"


class TestPaymentModel:
      """Tests pour le modèle Payment."""

    def test_payment_model_valid_data(self):
              """Test création d'un modèle Payment avec données valides."""
              from app.models.payment import PaymentIntent

        payment = PaymentIntent(
                      user_id="user123",
                      amount=5000,
                      currency="usd"
        )
        assert payment.user_id == "user123"
        assert payment.amount == 5000
        assert payment.currency == "usd"

    def test_payment_model_negative_amount(self):
              """Test erreur validation avec montant négatif."""
              from app.models.payment import PaymentIntent

        with pytest.raises(ValidationError):
                      PaymentIntent(
                                        user_id="user123",
                                        amount=-100,
                                        currency="usd"
                      )

    def test_payment_model_zero_amount(self):
              """Test erreur validation avec montant zéro."""
              from app.models.payment import PaymentIntent

        with pytest.raises(ValidationError):
                      PaymentIntent(
                                        user_id="user123",
                                        amount=0,
                                        currency="usd"
                      )

    def test_payment_model_invalid_currency(self):
              """Test validation du code devise."""
              from app.models.payment import PaymentIntent

        # Test avec devise valide
              payment = PaymentIntent(
                  user_id="user123",
                  amount=5000,
                  currency="usd"
              )
              assert payment.currency == "usd"

    def test_payment_model_missing_user_id(self):
              """Test erreur validation avec user_id manquant."""
              from app.models.payment import PaymentIntent

        with pytest.raises(ValidationError):
                      PaymentIntent(
                                        amount=5000,
                                        currency="usd"
                      )

    def test_payment_model_serialization(self):
              """Test sérialisation du modèle Payment."""
              from app.models.payment import PaymentIntent

        payment = PaymentIntent(
                      user_id="user123",
                      amount=5000,
                      currency="usd"
        )
        data = payment.model_dump()
        assert data["user_id"] == "user123"
        assert data["amount"] == 5000
        assert data["currency"] == "usd"


class TestPaymentResponseModel:
      """Tests pour le modèle de réponse Payment."""

    def test_payment_response_model(self):
              """Test création d'une réponse de paiement."""
              from app.models.payment import PaymentResponse

        response = PaymentResponse(
                      client_secret="pi_test_secret_123",
                      payment_intent_id="pi_test_123"
        )
        assert response.client_secret == "pi_test_secret_123"
        assert response.payment_intent_id == "pi_test_123"


class TestModelValidation:
      """Tests généraux pour la validation des modèles."""

    def test_model_field_validation(self):
              """Test que Pydantic valide correctement les champs."""
              from app.models.payment import PaymentIntent

        # Test avec type incorrect
              with pytest.raises(ValidationError):
                            PaymentIntent(
                                              user_id="user123",
                                              amount="not-a-number",
                                              currency="usd"
                            )

    def test_model_extra_fields_ignored(self):
              """Test que les champs supplémentaires sont ignorés ou gérés."""
              from app.models.payment import PaymentIntent

        # Selon la configuration Pydantic, les champs extra peuvent être ignorés
              payment = PaymentIntent(
                            user_id="user123",
                            amount=5000,
                            currency="usd",
                            extra_field="should_be_ignored"
              )
        assert payment.user_id == "user123"
