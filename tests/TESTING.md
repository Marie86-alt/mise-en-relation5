# Testing Guide - A La Case Nout Gramoun

## Overview

This document describes the comprehensive test suite for the backend API of the "A La Case Nout Gramoun" application. The test suite ensures code quality, reliability, and correctness of all backend functionality.

## Test Structure

### Directory Layout

```
tests/
├── __init__.py                 # Package initialization
├── conftest.py                 # Pytest configuration and fixtures
├── pytest.ini                  # Pytest settings
├── test_api_endpoints.py       # Integration tests for API endpoints
├── test_models.py              # Unit tests for Pydantic models
└── TESTING.md                  # This file
```

## Running Tests

### Prerequisites

Install test dependencies:

```bash
pip install pytest pytest-cov fastapi[all] httpx
```

### Run All Tests

```bash
pytest
```

### Run Tests with Coverage

```bash
pytest --cov=app --cov-report=html --cov-report=term
```

### Run Specific Test File

```bash
pytest tests/test_api_endpoints.py
pytest tests/test_models.py
```

### Run Tests by Marker

```bash
# Unit tests only
pytest -m unit

# Integration tests only
pytest -m integration

# Stripe integration tests
pytest -m stripe
```

### Run Tests Verbosely

```bash
pytest -v
```

### Run Tests with Output

```bash
pytest -s
```

## Test Files

### conftest.py

Contains shared fixtures and configuration:

- **client**: FastAPI TestClient for making HTTP requests
- - **test_status_data**: Valid status check data fixture
  - - **test_payment_data**: Valid payment data fixture
    - - **invalid_payment_data**: Invalid payment data for error testing
     
      - ### test_api_endpoints.py
     
      - Integration tests for API endpoints:
     
      - #### TestStatusEndpoints
      - - `test_post_status_success`: Valid POST request to /api/status
        - - `test_post_status_invalid_data`: Invalid data validation
          - - `test_post_status_missing_fields`: Required fields validation
            - - `test_get_status_success`: Valid GET request to /api/status
              - - `test_get_status_not_found`: Handling of missing resources
               
                - #### TestPaymentEndpoints
                - - `test_create_payment_intent_success`: Valid payment intent creation
                  - - `test_create_payment_intent_invalid_amount`: Invalid amount validation
                    - - `test_create_payment_intent_stripe_error`: Stripe CardError handling
                      - - `test_create_payment_intent_invalid_request`: Stripe InvalidRequestError handling
                       
                        - #### TestHealthEndpoints
                        - - `test_health_check`: Health check endpoint (GET /health)
                          - - `test_root_endpoint`: Root endpoint (GET /)
                           
                            - #### TestErrorHandling
                            - - `test_invalid_route`: 404 error handling
                              - - `test_invalid_method`: 405 Method Not Allowed handling
                                - - `test_malformed_json`: JSON validation error handling
                                 
                                  - ### test_models.py
                                 
                                  - Unit tests for Pydantic models:
                                 
                                  - #### TestStatusModel
                                  - - `test_status_model_valid_data`: Valid model creation
                                    - - `test_status_model_missing_user_id`: Required field validation
                                      - - `test_status_model_invalid_timestamp`: Type validation
                                        - - `test_status_model_optional_fields`: Optional field handling
                                         
                                          - #### TestPaymentModel
                                          - - `test_payment_model_valid_data`: Valid model creation
                                            - - `test_payment_model_negative_amount`: Amount validation (negative)
                                              - - `test_payment_model_zero_amount`: Amount validation (zero)
                                                - - `test_payment_model_invalid_currency`: Currency code validation
                                                  - - `test_payment_model_missing_user_id`: Required field validation
                                                    - - `test_payment_model_serialization`: Model serialization
                                                     
                                                      - #### TestPaymentResponseModel
                                                      - - `test_payment_response_model`: Response model creation
                                                       
                                                        - #### TestModelValidation
                                                        - - `test_model_field_validation`: Pydantic type validation
                                                          - - `test_model_extra_fields_ignored`: Extra field handling
                                                           
                                                            - ## Mocking and Fixtures
                                                           
                                                            - ### Stripe Mocking
                                                           
                                                            - Stripe API calls are mocked using `unittest.mock.patch`:
                                                           
                                                            - ```python
                                                              @patch('stripe.PaymentIntent.create')
                                                              def test_payment(mock_create, client):
                                                                  mock_intent = MagicMock()
                                                                  mock_intent.client_secret = "pi_test_secret_123"
                                                                  mock_create.return_value = mock_intent

                                                                  response = client.post("/api/payments/create-intent", json=data)
                                                                  assert response.status_code == 200
                                                              ```

                                                              ## Test Coverage

                                                              Current test coverage targets:

                                                              - **Status Check Endpoints**: 5 tests
                                                              - - **Payment Endpoints**: 4 tests
                                                                - - **Health Endpoints**: 2 tests
                                                                  - - **Error Handling**: 3 tests
                                                                    - - **Status Model**: 4 tests
                                                                      - - **Payment Model**: 7 tests
                                                                        - - **Total**: 25+ tests
                                                                         
                                                                          - Target coverage: 80%+
                                                                         
                                                                          - ## Best Practices
                                                                         
                                                                          - 1. **Test Isolation**: Each test is independent and can run in any order
                                                                            2. 2. **Clear Naming**: Test names describe what is being tested
                                                                               3. 3. **Arrange-Act-Assert**: Tests follow the AAA pattern
                                                                                  4. 4. **Mocking External Services**: Stripe API calls are mocked
                                                                                     5. 5. **Fixture Usage**: Reusable test data in conftest.py
                                                                                        6. 6. **Error Testing**: All error scenarios are tested
                                                                                          
                                                                                           7. ## Continuous Integration
                                                                                          
                                                                                           8. Tests should be run on every commit:
                                                                                          
                                                                                           9. ```bash
                                                                                              # Local testing before commit
                                                                                              pytest --cov=app

                                                                                              # CI/CD pipeline integration
                                                                                              pytest --cov=app --cov-fail-under=80
                                                                                              ```

                                                                                              ## Debugging Tests

                                                                                              ### Run Single Test

                                                                                              ```bash
                                                                                              pytest tests/test_models.py::TestStatusModel::test_status_model_valid_data -v
                                                                                              ```

                                                                                              ### Run with PDB Debugger

                                                                                              ```bash
                                                                                              pytest --pdb tests/test_api_endpoints.py
                                                                                              ```

                                                                                              ### Show Print Statements

                                                                                              ```bash
                                                                                              pytest -s tests/test_models.py
                                                                                              ```

                                                                                              ### Verbose Output

                                                                                              ```bash
                                                                                              pytest -vv tests/test_api_endpoints.py
                                                                                              ```

                                                                                              ## Future Test Improvements

                                                                                              1. Add tests for database integration (if applicable)
                                                                                              2. 2. Add performance/load tests
                                                                                                 3. 3. Add end-to-end tests
                                                                                                    4. 4. Increase coverage to 90%+
                                                                                                       5. 5. Add contract tests for API stability
                                                                                                         
                                                                                                          6. ## Troubleshooting
                                                                                                         
                                                                                                          7. ### Import Errors
                                                                                                         
                                                                                                          8. If you get import errors, ensure the project structure is correct:
                                                                                                          9. - `app/__init__.py` exists
                                                                                                             - - `tests/__init__.py` exists
                                                                                                               - - Run tests from project root directory
                                                                                                                
                                                                                                                 - ### Fixture Not Found
                                                                                                                
                                                                                                                 - Ensure `conftest.py` is in the tests directory and fixtures are properly decorated with `@pytest.fixture`
                                                                                                                
                                                                                                                 - ### Mocking Not Working
                                                                                                                
                                                                                                                 - Verify the mock path matches the actual import path in the code being tested
                                                                                                                
                                                                                                                 - ## References
                                                                                                                
                                                                                                                 - - [Pytest Documentation](https://docs.pytest.org/)
                                                                                                                   - - [FastAPI Testing](https://fastapi.tiangolo.com/advanced/testing-dependencies/)
                                                                                                                     - - [Unittest Mock](https://docs.python.org/3/library/unittest.mock.html)
                                                                                                                       - - [Pydantic Validation](https://docs.pydantic.dev/)
