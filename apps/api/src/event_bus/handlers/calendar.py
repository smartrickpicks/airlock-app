"""Calendar event handler."""

import logging

from src.event_bus.schemas import CrossModuleEvent

logger = logging.getLogger(__name__)


class CalendarEventHandler:
    async def handle(self, event: CrossModuleEvent) -> dict:
        handler_map = {
            "contract.shipped": self.handle_contract_shipped,
        }
        handler = handler_map.get(event.event_type)
        if handler:
            return await handler(event)
        return {"status": "skipped"}

    async def handle_contract_shipped(self, event: CrossModuleEvent) -> dict:
        logger.info("Calendar: Creating renewal dates for vault %s", event.payload.get("vault_id"))
        return {"status": "completed", "action": "renewal_dates_created"}
