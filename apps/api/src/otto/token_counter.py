"""Token counting and cost estimation for Otto LLM calls."""

from dataclasses import dataclass

# OpenRouter pricing (March 2026) per million tokens, including 5.5% OR fee
PRICING = {
    "haiku": {"input": 1.055, "output": 5.275},
    "sonnet": {"input": 3.165, "output": 15.825},
    "opus": {"input": 5.275, "output": 26.375},
}

CC_COST = {"haiku": 1, "sonnet": 3, "opus": 5}


@dataclass(frozen=True)
class TokenUsage:
    prompt_tokens: int
    completion_tokens: int

    @property
    def total_tokens(self) -> int:
        return self.prompt_tokens + self.completion_tokens


def extract_token_usage(prompt_tokens: int, completion_tokens: int, model: str = "") -> TokenUsage:
    return TokenUsage(prompt_tokens=prompt_tokens, completion_tokens=completion_tokens)


def model_name_to_tier(model_name: str) -> str:
    name = model_name.lower()
    if "haiku" in name:
        return "haiku"
    if "opus" in name:
        return "opus"
    if "sonnet" in name:
        return "sonnet"
    return "sonnet"


def estimate_cost_usd(
    prompt_tokens: int, completion_tokens: int, model_tier: str = "sonnet"
) -> float:
    tier = model_tier if model_tier in PRICING else "sonnet"
    prices = PRICING[tier]
    input_cost = (prompt_tokens / 1_000_000) * prices["input"]
    output_cost = (completion_tokens / 1_000_000) * prices["output"]
    return input_cost + output_cost


def estimate_cc_cost(model_tier: str) -> int:
    return CC_COST.get(model_tier, 3)
