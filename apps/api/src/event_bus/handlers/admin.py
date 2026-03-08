"""Admin event handler."""

import logging

from src.event_bus.schemas import CrossModuleEvent

logger = logging.getLogger(__name__)


class AdminEventHandler:
    async def handle(self, event: CrossModuleEvent) -> dict:
        logger.info("Admin: %s — severity %d", event.event_type, event.priority)
        return {"status": "completed", "action": "admin_alerted", "event_type": event.event_type}
