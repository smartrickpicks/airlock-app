from unittest.mock import MagicMock, patch

from src.services.stripe_service import StripeService


def test_create_customer():
    with patch("stripe.Customer.create") as mock_create:
        mock_create.return_value = MagicMock(id="cus_test123")
        svc = StripeService(api_key="sk_test_xxx")
        customer_id = svc.create_customer(email="zac@airlock.dev", user_id="u1")
        assert customer_id == "cus_test123"
        mock_create.assert_called_once()


def test_create_subscription():
    with patch("stripe.Subscription.create") as mock_create:
        mock_create.return_value = MagicMock(id="sub_test456", status="active")
        svc = StripeService(api_key="sk_test_xxx")
        sub = svc.create_subscription(
            customer_id="cus_test123",
            price_id="price_plus_monthly",
        )
        assert sub.id == "sub_test456"


def test_cancel_subscription():
    with patch("stripe.Subscription.modify") as mock_modify:
        mock_modify.return_value = MagicMock(id="sub_test456", cancel_at_period_end=True)
        svc = StripeService(api_key="sk_test_xxx")
        result = svc.cancel_subscription("sub_test456")
        assert result.cancel_at_period_end is True


def test_verify_webhook():
    with patch("stripe.Webhook.construct_event") as mock_verify:
        mock_verify.return_value = MagicMock(type="invoice.paid")
        svc = StripeService(api_key="sk_test_xxx")
        event = svc.verify_webhook(b"payload", "sig_header", "whsec_test")
        assert event.type == "invoice.paid"
