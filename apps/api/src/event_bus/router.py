"""Event router — maps event types to target queues."""

from src.event_bus.schemas import QueueName

# Maps event_type -> list of target queues
EVENT_ROUTES: dict[str, list[QueueName]] = {
    # Contracts -> Other modules
    "contract.shipped": [
        QueueName.CRM,
        QueueName.TASKS,
        QueueName.CALENDAR,
        QueueName.NOTIFICATIONS,
    ],
    "contract.failed": [QueueName.ADMIN, QueueName.NOTIFICATIONS],
    "entity.resolved": [QueueName.CRM],
    "entity.new_customer": [QueueName.CRM, QueueName.TASKS],
    "extraction.completed": [QueueName.ANALYTICS],
    "health.updated": [QueueName.NOTIFICATIONS],
    "gate.advanced": [QueueName.NOTIFICATIONS, QueueName.ANALYTICS],
    "patch.submitted": [QueueName.NOTIFICATIONS],
    "patch.approved": [QueueName.NOTIFICATIONS],
    "batch.completed": [QueueName.NOTIFICATIONS, QueueName.ANALYTICS],
    "batch.failed": [QueueName.ADMIN, QueueName.NOTIFICATIONS],
    # CRM -> Other modules
    "account.created": [QueueName.NOTIFICATIONS],
    "account.health_changed": [QueueName.NOTIFICATIONS],
    # Tasks -> Other modules
    "task.created": [QueueName.NOTIFICATIONS],
    "task.overdue": [QueueName.NOTIFICATIONS, QueueName.ADMIN],
    # SLA
    "sla.warning": [QueueName.NOTIFICATIONS],
    "sla.breached": [QueueName.NOTIFICATIONS, QueueName.ADMIN],
    # System
    "feature.circuit_breaker": [QueueName.ADMIN, QueueName.NOTIFICATIONS],
}


def get_target_queues(event_type: str) -> list[QueueName]:
    """Get target queues for an event type. Returns empty list if unrouted."""
    return EVENT_ROUTES.get(event_type, [])
