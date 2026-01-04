"""
Configuration pytest et fixtures pour les tests
"""
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ajouter le répertoire backend au chemin Python
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from app.main import app


@pytest.fixture
def client():
      """Client de test FastAPI"""
      return TestClient(app)


@pytest.fixture
def test_status_data():
      """Données de test pour les vérifications de statut"""
      return {
          "client_name": "Test Client"
      }


@pytest.fixture
def test_payment_data():
      """Données de test pour les paiements Stripe"""
      return {
          "amount": 1000,  # 10 euros
          "currency": "eur",
          "metadata": {
              "user_id": "test_user_123",
              "service_id": "test_service_456"
          }
      }


@pytest.fixture
def invalid_payment_data():
      """Données de test invalides pour les paiements"""
      return {
          "amount": -100,  # Montant invalide
          "currency": "invalid"  # Devise invalide
      }
  
