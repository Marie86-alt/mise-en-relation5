"""
Tests intégration pour les endpoints API.
"""
import json
import pytest
from fastapi import status
from unittest.mock import patch, MagicMock


class TestStatusEndpoints:
      """Tests pour les endpoints de vérification de statut."""

    def test_post_status_success(self, client, test_status_data):
              """Test POST /api/status avec données valides."""
              response = client.post("/api/status", json=test_status_data)
              assert response.status_code == status.HTTP_200_OK
              data = response.json()
              assert "timestamp" in data
              assert "status" in data

    def test_post_status_invalid_data(self, client):
              """Test POST /api/status avec données invalides."""
              invalid_data = {"user_id": None, "timestamp": "invalid"}
              response = client.post("/api/status", json=invalid_data)
              assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_post_status_missing_fields(self, client):
              """Test POST /api/status avec champs manquants."""
              response = client.post("/api/status", json={})
              assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_get_status_success(self, client, test_status_data):
              """Test GET /api/status avec ID valide."""
              client.post("/api/status", json=test_status_data)
              response = client.get(f"/api/status?user_id={test_status_data['user_id']}")
              assert response.status_code == status.HTTP_200_OK

    def test_get_status_not_found(self, client):
        """Test GET /api/status avec ID inexistant."""
              response = client.get("/api/status?user_id=nonexistent")
        # Peut retourner 404 ou une liste vide selon l'implémentation
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]


class TestPaymentEndpoints:
      """Tests pour les endpoints de paiement Stripe."""

    @patch('stripe.PaymentIntent.create')
    def test_create_payment_intent_success(self, mock_create, client, test_payment_data):
              """Test POST /api/payments/create-intent avec données valides."""
              mock_intent = MagicMock()
              mock_intent.client_secret = "pi_test_secret_123"
              mock_intent.id = "pi_test_123"
              mock_create.return_value = mock_intent

        response = client.post("/api/payments/create-intent", json=test_payment_data)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "client_secret" in data
        mock_create.assert_called_once()

    @patch('stripe.PaymentIntent.create')
    def test_create_payment_intent_invalid_amount(self, mock_create, client):
              """Test POST /api/payments/create-intent avec montant invalide."""
              invalid_data = {
                  "user_id": "user123",
                  "amount": -100,
                  "currency": "usd"
              }
              response = client.post("/api/payments/create-intent", json=invalid_data)
              assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @patch('stripe.PaymentIntent.create')
    def test_create_payment_intent_stripe_error(self, mock_create, client, test_payment_data):
              """Test gestion des erreurs Stripe."""
              from stripe.error import CardError
              mock_create.side_effect = CardError(
                  message="Your card was declined",
                  param="",
                  code="card_declined"
              )

        response = client.post("/api/payments/create-intent", json=test_payment_data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "detail" in data

    @patch('stripe.PaymentIntent.create')
    def test_create_payment_intent_invalid_request(self, mock_create, client, test_payment_data):
              """Test gestion des InvalidRequestError."""
              from stripe.error import InvalidRequestError
              mock_create.side_effect = InvalidRequestError(
                  message="Missing required param: amount",
                  param="amount"
              )

        response = client.post("/api/payments/create-intent", json=test_payment_data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestHealthEndpoints:
      """Tests pour les endpoints de santé."""

    def test_health_check(self, client):
              """Test GET /health endpoint."""
              response = client.get("/health")
              assert response.status_code == status.HTTP_200_OK
              data = response.json()
              assert "status" in data
              assert data["status"] == "healthy"

    def test_root_endpoint(self, client):
              """Test GET / endpoint."""
              response = client.get("/")
              assert response.status_code == status.HTTP_200_OK
              data = response.json()
              assert "message" in data
              assert "version" in data


class TestErrorHandling:
      """Tests pour la gestion des erreurs."""

    def test_invalid_route(self, client):
              """Test accès à une route inexistante."""
              response = client.get("/invalid/route")
              assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_invalid_method(self, client):
              """Test méthode HTTP non autorisée."""
              response = client.delete("/health")
              assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_malformed_json(self, client):
              """Test JSON mal formé dans la requête."""
              response = client.post(
                  "/api/status",
                  content="invalid json",
                  headers={"Content-Type": "application/json"}
              )
              assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
      
