"""
Unit tests for models
"""

import pytest
from datetime import datetime


class TestStatusModel:
    """Tests for StatusCheck model"""

    def test_status_model_valid_data(self):
        """Test creating a valid StatusCheck"""
        from app.models.status import StatusCheck

        status = StatusCheck(
            client_name="Test Client", id="test-123", timestamp=datetime.utcnow()
        )
        assert status.client_name == "Test Client"
        assert status.id == "test-123"


class TestPaymentModel:
    """Tests for PaymentIntent model"""

    def test_payment_model_valid_data(self):
        """Test creating a valid PaymentIntent"""
        from app.models.payment import PaymentIntentCreate

        payment = PaymentIntentCreate(amount=5000, currency="eur")
        assert payment.amount == 5000
        assert payment.currency == "eur"
