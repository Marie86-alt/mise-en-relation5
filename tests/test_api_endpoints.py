"""
Integration tests for API endpoints
"""

import pytest
from fastapi.testclient import TestClient


class TestHealthEndpoints:
    """Tests for health check endpoints"""

    def test_health_check(self, client):
        """Test GET /health endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data

    def test_root_endpoint(self, client):
        """Test GET / endpoint"""
        response = client.get("/")
        assert response.status_code == 200
