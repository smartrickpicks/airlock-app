"""Stripe subscription management for Constellation Credits."""

import logging

import stripe

logger = logging.getLogger(__name__)

PLAN_PRICE_MAP = {
    "plus": "stripe_price_plus",
    "constellation": "stripe_price_constellation",
    "byok_pro": "stripe_price_byok_pro",
}


class StripeService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        stripe.api_key = api_key

    def create_customer(self, email: str, user_id: str) -> str:
        customer = stripe.Customer.create(
            email=email,
            metadata={"airlock_user_id": user_id},
        )
        return customer.id

    def create_subscription(
        self,
        customer_id: str,
        price_id: str,
    ) -> stripe.Subscription:
        return stripe.Subscription.create(
            customer=customer_id,
            items=[{"price": price_id}],
            payment_behavior="default_incomplete",
            expand=["latest_invoice.payment_intent"],
        )

    def cancel_subscription(self, subscription_id: str) -> stripe.Subscription:
        return stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=True,
        )

    def verify_webhook(
        self,
        payload: bytes,
        sig_header: str,
        webhook_secret: str,
    ) -> stripe.Event:
        return stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
