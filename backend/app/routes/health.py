"""
Health check routes
"""

from fastapi import APIRouter
from datetime import datetime

router = APIRouter()
logger_module = None


@router.get("/health")
async def health_check():
    """Check API health status"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "message": "API is running",
    }


@router.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "API Mise en Relation - A La Case Nout Gramoun",
        "version": "1.0.0",
        "status": "running",
    }
