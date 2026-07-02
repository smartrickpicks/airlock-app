from src.otto.token_counter import (
    estimate_cc_cost,
    estimate_cost_usd,
    extract_token_usage,
    model_name_to_tier,
)


def test_extract_token_usage():
    usage = extract_token_usage(
        prompt_tokens=950, completion_tokens=600, model="anthropic/claude-sonnet-4-6"
    )
    assert usage.prompt_tokens == 950
    assert usage.completion_tokens == 600
    assert usage.total_tokens == 1550


def test_cost_haiku():
    cost = estimate_cost_usd(prompt_tokens=950, completion_tokens=150, model_tier="haiku")
    assert 0.001 < cost < 0.003


def test_cost_sonnet():
    cost = estimate_cost_usd(prompt_tokens=950, completion_tokens=600, model_tier="sonnet")
    assert 0.01 < cost < 0.015


def test_cost_opus():
    cost = estimate_cost_usd(prompt_tokens=950, completion_tokens=1500, model_tier="opus")
    assert 0.04 < cost < 0.05


def test_model_tier_from_model_name():
    assert model_name_to_tier("anthropic/claude-sonnet-4-6") == "sonnet"
    assert model_name_to_tier("anthropic/claude-opus-4-6") == "opus"
    assert model_name_to_tier("anthropic/claude-haiku-4-5-20251001") == "haiku"
    assert model_name_to_tier("claude-sonnet-4-6") == "sonnet"
    assert model_name_to_tier("unknown-model") == "sonnet"


def test_cc_cost():
    assert estimate_cc_cost("haiku") == 1
    assert estimate_cc_cost("sonnet") == 3
    assert estimate_cc_cost("opus") == 5
    assert estimate_cc_cost("unknown") == 3
