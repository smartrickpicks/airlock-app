"""WebSocket topic pattern helpers."""

VALID_PREFIXES = {
    "vault",
    "view",
    "module",
    "workspace",
    "user",
    "notifications",
    "presence",
    "messenger",
    "chat",
}


def validate_topic(topic: str) -> bool:
    """Check if a topic string is valid."""
    if not topic:
        return False
    if ":" not in topic:
        return topic in ("workspace",)
    prefix = topic.split(":")[0]
    return prefix in VALID_PREFIXES
