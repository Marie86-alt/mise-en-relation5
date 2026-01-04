"""
Status check routes
"""
from fastapi import APIRouter, HTTPException
from typing import List
import logging
from ..models import StatusCheck, StatusCheckCreate
from ...config import settings

router = APIRouter(prefix="/status")
logger = logging.getLogger(__name__)

# Simulated database (should use Firebase in production)
status_db = []

@router.post("/", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
      """Create a new status check"""
      try:
                status_obj = StatusCheck(**input.model_dump())
                status_dict = status_obj.model_dump()
                # TODO: Save to Firebase Firestore
                status_db.append(status_dict)
                logger.info(f"✅ Status check created: {status_obj.id}")
                return status_obj
except Exception as e:
        logger.error(f"❌ Error creating status check: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/", response_model=List[StatusCheck])
async def get_status_checks():
      """Retrieve all status checks"""
      try:
                # TODO: Fetch from Firebase Firestore
                logger.info(f"✅ Retrieved {len(status_db)} status checks")
                return [StatusCheck(**item) for item in status_db]
except Exception as e:
        logger.error(f"❌ Error retrieving status checks: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
