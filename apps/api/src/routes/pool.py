"""Community pool dashboard API endpoints."""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.db import get_db
from src.models.schemas.credits import PoolHealthResponse, PoolStatsResponse
from src.services.pool_service import PoolService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/pool", tags=["pool"])


@router.get("/stats", response_model=PoolStatsResponse)
def get_pool_stats(db: Session = Depends(get_db)):  # noqa: B008
    """Get community pool statistics — public endpoint for dashboard."""
    svc = PoolService(db=db)
    stats = svc.get_stats()
    return PoolStatsResponse(**stats)


@router.get("/health", response_model=PoolHealthResponse)
def get_pool_health(db: Session = Depends(get_db)):  # noqa: B008
    """Get pool health status — used by circuit breakers and UI."""
    svc = PoolService(db=db)
    details = svc.get_health_details()
    return PoolHealthResponse(**details)
