"""Prompt caching wrapper for OpenRouter/Anthropic calls.

OpenRouter supports Anthropic-style prompt caching via cache_control headers.
Caching the ~900-token system prompt across session turns saves ~15% on input costs.

Cached input tokens are billed at 10% of regular input price.
Cache write cost is 25% more than regular input on the first call.
Net savings across a 20-turn session: ~15%.
"""


def build_cached_messages(
    system_prompt: str,
    user_message: str,
    conversation_history: list[dict] | None = None,
) -> list[dict]:
    """Build message array with cache_control on the system prompt.

    The system prompt is marked with cache_control: ephemeral so that
    OpenRouter/Anthropic caches it for subsequent calls in the same session.

    Args:
        system_prompt: The full system prompt (voice baseline + persona + tools)
        user_message: The current user message
        conversation_history: Optional prior turns to include

    Returns:
        List of message dicts ready for the OpenAI-compatible API
    """
    messages = [
        {
            "role": "system",
            "content": [
                {
                    "type": "text",
                    "text": system_prompt,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
        },
    ]

    if conversation_history:
        messages.extend(conversation_history)

    messages.append(
        {
            "role": "user",
            "content": user_message,
        },
    )

    return messages


def estimate_cache_savings(
    system_prompt_tokens: int,
    session_turns: int,
    model_tier: str = "sonnet",
) -> dict:
    """Estimate cost savings from prompt caching across a session.

    First call: 1.25x cost (cache write premium)
    Subsequent calls: 0.10x cost (cached read discount)

    Args:
        system_prompt_tokens: Number of tokens in the system prompt
        session_turns: Total turns in the session
        model_tier: haiku, sonnet, or opus

    Returns:
        Dict with uncached_cost, cached_cost, savings_usd, savings_pct
    """
    input_prices = {"haiku": 1.055, "sonnet": 3.165, "opus": 5.275}
    price_per_m = input_prices.get(model_tier, 3.165)

    base_cost_per_turn = (system_prompt_tokens / 1_000_000) * price_per_m
    uncached_total = base_cost_per_turn * session_turns

    # First turn: 1.25x (cache write), subsequent: 0.10x (cache read)
    cached_total = (base_cost_per_turn * 1.25) + (base_cost_per_turn * 0.10 * (session_turns - 1))

    savings = uncached_total - cached_total
    savings_pct = (savings / uncached_total * 100) if uncached_total > 0 else 0

    return {
        "uncached_cost": round(uncached_total, 6),
        "cached_cost": round(cached_total, 6),
        "savings_usd": round(savings, 6),
        "savings_pct": round(savings_pct, 1),
    }
