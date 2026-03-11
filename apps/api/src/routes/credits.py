"""Constellation Credits API endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.db import get_db
from src.middleware.auth import get_current_user
from src.models.schemas.credits import (
    CreditBalanceResponse,
    CreditOverageRequest,
    CreditTransactionResponse,
)
from src.models.user import User
from src.services.credit_service import CreditService, FreeTierCapError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/credits", tags=["credits"])


@router.get("/balance", response_model=CreditBalanceResponse)
def get_balance(
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
):
    """Get the current user's credit balance and plan info."""
    svc = CreditService(db=db)
    account = svc.get_or_create_account(user_id=current_user.id)
    plan = svc.get_plan(account.plan_id)
    return CreditBalanceResponse(
        balance_cc=account.balance_cc,
        plan_name=plan.name,
        monthly_credits=plan.monthly_credits,
        opus_calls_this_month=account.opus_calls_this_month,
        opus_cap_monthly=plan.opus_cap_monthly,
        lifetime_earned_cc=account.lifetime_earned_cc,
        lifetime_spent_cc=account.lifetime_spent_cc,
        is_byok=plan.is_byok,
    )


@router.get("/transactions", response_model=list[CreditTransactionResponse])
def get_transactions(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
):
    """Get the current user's credit transaction history."""
    svc = CreditService(db=db)
    account = svc.get_or_create_account(user_id=current_user.id)
    return svc.get_transactions(account.id, limit=min(limit, 100), offset=offset)


@router.post("/overage", response_model=CreditTransactionResponse)
def purchase_overage(
    request: CreditOverageRequest,
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
):
    """Purchase additional credits beyond monthly allocation."""
    svc = CreditService(db=db)
    account = svc.get_or_create_account(user_id=current_user.id)
    try:
        return svc.purchase_overage(account.id, request.amount_cc)
    except FreeTierCapError as err:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Free tier cannot purchase overages. Upgrade to Plus or Constellation.",
        ) from err
