from src.otto.prompt_cache import build_cached_messages, estimate_cache_savings


def test_system_prompt_has_cache_control():
    messages = build_cached_messages(
        system_prompt="You are Otto.",
        user_message="Hello",
    )
    assert len(messages) == 2
    system_msg = messages[0]
    assert system_msg["role"] == "system"
    assert isinstance(system_msg["content"], list)
    assert system_msg["content"][0]["type"] == "text"
    assert system_msg["content"][0]["text"] == "You are Otto."
    assert system_msg["content"][0]["cache_control"] == {"type": "ephemeral"}


def test_user_message_is_plain():
    messages = build_cached_messages(
        system_prompt="You are Otto.",
        user_message="Hello",
    )
    user_msg = messages[1]
    assert user_msg["role"] == "user"
    assert user_msg["content"] == "Hello"


def test_with_conversation_history():
    history = [
        {"role": "user", "content": "First message"},
        {"role": "assistant", "content": "First response"},
    ]
    messages = build_cached_messages(
        system_prompt="You are Otto.",
        user_message="Follow up",
        conversation_history=history,
    )
    assert len(messages) == 4  # system + 2 history + user
    assert messages[1]["role"] == "user"
    assert messages[2]["role"] == "assistant"
    assert messages[3]["content"] == "Follow up"


def test_without_conversation_history():
    messages = build_cached_messages(
        system_prompt="You are Otto.",
        user_message="Hello",
        conversation_history=None,
    )
    assert len(messages) == 2


def test_cache_savings_20_turn_sonnet():
    result = estimate_cache_savings(
        system_prompt_tokens=900,
        session_turns=20,
        model_tier="sonnet",
    )
    assert result["savings_pct"] > 10
    assert result["savings_usd"] > 0
    assert result["cached_cost"] < result["uncached_cost"]


def test_cache_savings_single_turn_negative():
    """Single turn has no savings — cache write costs MORE."""
    result = estimate_cache_savings(
        system_prompt_tokens=900,
        session_turns=1,
        model_tier="sonnet",
    )
    assert result["savings_usd"] < 0  # Cache write premium makes single turn more expensive
