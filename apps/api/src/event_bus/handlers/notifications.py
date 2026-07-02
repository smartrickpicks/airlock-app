"""Notifications event handler."""

import logging

from src.event_bus.schemas import CrossModuleEvent

logger = logging.getLogger(__name__)


class NotificationsEventHandler:
    async def handle(self, event: CrossModuleEvent) -> dict:
        logger.info("Notifications: %s from %s", event.event_type, event.source_module)
        return {
            "status": "completed",
            "action": "notification_sent",
            "event_type": event.event_type,
        }
