"""Tasks event handler."""

import logging

from src.event_bus.schemas import CrossModuleEvent

logger = logging.getLogger(__name__)


class TasksEventHandler:
    async def handle(self, event: CrossModuleEvent) -> dict:
        handler_map = {
            "contract.shipped": self.handle_contract_shipped,
            "entity.new_customer": self.handle_entity_new_customer,
            "task.overdue": self.handle_task_overdue,
        }
        handler = handler_map.get(event.event_type)
        if handler:
            return await handler(event)
        return {"status": "skipped"}

    async def handle_contract_shipped(self, event: CrossModuleEvent) -> dict:
        logger.info("Tasks: Creating post-ship tasks for vault %s", event.payload.get("vault_id"))
        return {"status": "completed", "action": "tasks_created"}

    async def handle_entity_new_customer(self, event: CrossModuleEvent) -> dict:
        logger.info("Tasks: Creating onboarding tasks for %s", event.payload.get("entity_name"))
        return {"status": "completed", "action": "onboarding_tasks_created"}

    async def handle_task_overdue(self, event: CrossModuleEvent) -> dict:
        logger.info("Tasks: Escalating overdue task %s", event.payload.get("task_id"))
        return {"status": "completed", "action": "task_escalated"}
