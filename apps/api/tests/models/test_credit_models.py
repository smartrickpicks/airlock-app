from src.models.credit_account import CreditAccount
from src.models.credit_plan import CreditPlan
from src.models.credit_pool import CreditPool, CreditPoolTransaction
from src.models.credit_transaction import CreditTransaction


def test_credit_plan_tablename():
    assert CreditPlan.__tablename__ == "credit_plans"


def test_credit_account_tablename():
    assert CreditAccount.__tablename__ == "credit_accounts"


def test_credit_transaction_tablename():
    assert CreditTransaction.__tablename__ == "credit_transactions"


def test_credit_pool_tablename():
    assert CreditPool.__tablename__ == "credit_pool"


def test_credit_pool_transaction_tablename():
    assert CreditPoolTransaction.__tablename__ == "credit_pool_transactions"


def test_models_importable_from_init():
    from src.models import (
        CreditAccount,
        CreditPlan,
        CreditPool,
        CreditPoolTransaction,
        CreditTransaction,
    )

    assert CreditPlan is not None
    assert CreditAccount is not None
    assert CreditTransaction is not None
    assert CreditPool is not None
    assert CreditPoolTransaction is not None
