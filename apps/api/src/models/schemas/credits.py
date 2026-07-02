from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class CreditBalanceResponse(BaseModel):
    balance_cc: int
    plan_name: str
    monthly_credits: int
    opus_calls_this_month: int
    opus_cap_monthly: int
    lifetime_earned_cc: int
    lifetime_spent_cc: int
    is_byok: bool


class CreditSpendRequest(BaseModel):
    amount_cc: int = Field(gt=0)
    source: str
    model_tier: Literal["haiku", "sonnet", "opus"] | None = None
    session_id: str | None = None


class CreditEarnRequest(BaseModel):
    amount_cc: int = Field(gt=0)
    source: str


class CreditTransactionResponse(BaseModel):
    id: str
    amount_cc: int
    balance_after: int
    type: str
    source: str
    model_tier: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class CreditOverageRequest(BaseModel):
    amount_cc: int = Field(gt=0, le=1000)


class PoolStatsResponse(BaseModel):
    balance_cc: int
    total_contributed_cc: int
    total_spent_cc: int
    daily_spend_cc: int
    free_tier_subsidy_cc: int
    top_contributors: list[dict]
    health: Literal["healthy", "low", "critical"]


class PoolHealthResponse(BaseModel):
    health: Literal["healthy", "low", "critical"]
    free_signups_open: bool
    balance_weeks_remaining: float
