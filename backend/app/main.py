"""
FastAPI application factory and configuration
Main entry point for the API application
"""
import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .config import settings
from .routes import api_router

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
      level=settings.LOG_LEVEL,
      format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
      """Startup and shutdown events"""
      logger.info("🚀 API démarrage")
      yield
      logger.info("🛑 API arrêt")

# Create FastAPI application
app = FastAPI(
      title=settings.API_TITLE,
      description=settings.API_DESCRIPTION,
      version=settings.API_VERSION,
      lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
      CORSMiddleware,
      allow_origins=settings.ALLOWED_ORIGINS,
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
)

logger.info(f"✅ CORS configured with origins: {settings.ALLOWED_ORIGINS}")

# Include routers
app.include_router(api_router)

# Root endpoint
@app.get("/")
async def root():
      """Root endpoint"""
      return {
          "message": settings.API_TITLE,
          "version": settings.API_VERSION,
          "status": "running"
      }

logger.info("✅ FastAPI application initialized successfully")

# Export app for server
__all__ = ["app"]
