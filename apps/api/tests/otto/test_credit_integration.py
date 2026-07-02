"""Credit integration tests — import verification."""

from src.otto.token_counter import estimate_cc_cost, model_name_to_tier


def test_cc_cost_for_chat():
    """Sonnet chat costs 3 CC."""
    assert estimate_cc_cost("sonnet") == 3


def test_model_tier_detection():
    """OpenRouter model names resolve to correct tiers."""
    assert model_name_to_tier("anthropic/claude-sonnet-4-6") == "sonnet"
    assert model_name_to_tier("anthropic/claude-opus-4-6") == "opus"
    assert model_name_to_tier("anthropic/claude-haiku-4-5-20251001") == "haiku"
