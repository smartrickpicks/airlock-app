"""Otto Moderation client — calls the State Service moderation endpoints.

Used by every user-facing surface to check messages before processing.
When the feature flag is OFF, the State Service returns action="pass" immediately.

Usage:
    from src.otto.moderation import check_moderation, ModerationBlock

    result = await check_moderation(user_id, content, surface="otto_chat")
    if result:
        # Message was blocked — result is a ModerationBlock
        # Return result.otto_message to the user
        # If result.delete_message, remove the original from display
        raise HTTPException(status_code=403, detail=result.to_dict())
"""

import logging
import os
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)

OTTO_STATE_SERVICE_URL = os.environ.get("OTTO_STATE_SERVICE_URL", "http://localhost:8100")


@dataclass
class ModerationBlock:
    """Returned when a message is blocked by moderation."""

    action: str  # warn | delete | timeout | suspend | blocked
    category: str | None
    severity: str | None
    otto_message: str  # Otto's in-character response to show user
    timeout_minutes: int
    timeout_expires: str | None
    strike_count: int
    delete_message: bool
    notify_admin: bool

    def to_dict(self) -> dict:
        return {
            "moderation": True,
            "action": self.action,
            "category": self.category,
            "severity": self.severity,
            "message": self.otto_message,
            "timeout_minutes": self.timeout_minutes,
            "timeout_expires": self.timeout_expires,
            "strike_count": self.strike_count,
            "delete_message": self.delete_message,
        }


async def check_moderation(
    user_id: str,
    content: str,
    surface: str = "otto_chat",
    workspace_id: str = "default",
) -> ModerationBlock | None:
    """Check a message against the moderation engine.

    Returns None if the message passes (or if the service is unreachable).
    Returns ModerationBlock if the message was flagged.

    Surfaces: otto_chat, general_chat, chat, messenger, playbook_chat,
              context_menu, recipe_comment, patch_note
    """
    if not content or not content.strip():
        return None

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{OTTO_STATE_SERVICE_URL}/moderation/check",
                json={
                    "user_id": user_id,
                    "workspace_id": workspace_id,
                    "content": content,
                    "surface": surface,
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        logger.warning("Moderation service unreachable — allowing message through")
        return None

    if data.get("action") == "pass":
        return None

    return ModerationBlock(
        action=data["action"],
        category=data.get("category"),
        severity=data.get("severity"),
        otto_message=data.get("message", "Message blocked by moderation."),
        timeout_minutes=data.get("timeout_minutes", 0),
        timeout_expires=data.get("timeout_expires"),
        strike_count=data.get("strike_count", 0),
        delete_message=data.get("delete_message", False),
        notify_admin=data.get("notify_admin", False),
    )
