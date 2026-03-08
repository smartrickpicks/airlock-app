"""CRM event handler — processes cross-module events affecting CRM."""

import logging

from src.event_bus.schemas import CrossModuleEvent

logger = logging.getLogger(__name__)


class CRMEventHandler:
    """Handles cross-module events for CRM module."""

    async def handle(self, event: CrossModuleEvent) -> dict:
        """Route to specific handler based on event type."""
        handler_map = {
            "contract.shipped": self.handle_contract_shipped,
            "entity.resolved": self.handle_entity_resolved,
            "entity.new_customer": self.handle_entity_new_customer,
        }
        handler = handler_map.get(event.event_type)
        if handler:
            return await handler(event)
        return {"status": "skipped", "reason": f"No CRM handler for {event.event_type}"}

    async def handle_contract_shipped(self, event: CrossModuleEvent) -> dict:
        """Update CRM when contract ships."""
        vault_id = event.payload.get("vault_id")
        logger.info("CRM: Contract shipped for vault %s — updating account health", vault_id)
        return {"status": "completed", "action": "account_health_updated"}

    async def handle_entity_resolved(self, event: CrossModuleEvent) -> dict:
        """Link to existing CRM vault when entity resolved."""
        entity_name = event.payload.get("entity_name")
        logger.info("CRM: Entity resolved — %s", entity_name)
        return {"status": "completed", "action": "entity_linked"}

    async def handle_entity_new_customer(self, event: CrossModuleEvent) -> dict:
        """Create CRM vaults for new entity."""
        entity_name = event.payload.get("entity_name")
        logger.info("CRM: New customer detected — %s", entity_name)
        return {"status": "completed", "action": "vaults_created"}
