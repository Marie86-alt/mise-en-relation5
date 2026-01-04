"""
API routes initialization
"""
from fastapi import APIRouter
from .status import router as status_router
from .payments import router as payments_router
from .health import router as health_router

api_router = APIRouter(prefix="/api")
api_router.include_router(status_router, tags=["status"])
api_router.include_router(payments_router, tags=["payments"])
api_router.include_router(health_router, tags=["health"])

__all__ = ["api_router"]
