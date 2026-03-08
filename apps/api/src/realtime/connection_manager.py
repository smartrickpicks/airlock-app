"""WebSocket connection manager — tracks connections, subscriptions, presence."""

import logging
from dataclasses import dataclass

from starlette.websockets import WebSocket

logger = logging.getLogger(__name__)


@dataclass
class UserContext:
    """Metadata for a connected WebSocket."""

    user_id: str
    workspace_id: str
    email: str
    org_role: str


class ConnectionManager:
    """Manages WebSocket connections, topic subscriptions, and presence."""

    def __init__(self) -> None:
        self._connections: dict[str, WebSocket] = {}
        self._contexts: dict[str, UserContext] = {}
        self._subscriptions: dict[str, set[str]] = {}
        self._counter = 0

    async def connect(self, ws: WebSocket, user_ctx: UserContext) -> str:
        """Register a new WebSocket connection. Returns connection_id."""
        await ws.accept()
        self._counter += 1
        connection_id = f"conn_{user_ctx.user_id}_{self._counter}"
        self._connections[connection_id] = ws
        self._contexts[connection_id] = user_ctx
        logger.info("WebSocket connected: %s (user: %s)", connection_id, user_ctx.user_id)
        return connection_id

    async def disconnect(self, connection_id: str) -> None:
        """Remove connection and clean up subscriptions."""
        self._connections.pop(connection_id, None)
        self._contexts.pop(connection_id, None)
        for topic, conn_ids in list(self._subscriptions.items()):
            conn_ids.discard(connection_id)
            if not conn_ids:
                del self._subscriptions[topic]
        logger.info("WebSocket disconnected: %s", connection_id)

    def subscribe(self, connection_id: str, topic: str) -> None:
        """Subscribe a connection to a topic."""
        if topic not in self._subscriptions:
            self._subscriptions[topic] = set()
        self._subscriptions[topic].add(connection_id)

    def unsubscribe(self, connection_id: str, topic: str) -> None:
        """Unsubscribe a connection from a topic."""
        if topic in self._subscriptions:
            self._subscriptions[topic].discard(connection_id)
            if not self._subscriptions[topic]:
                del self._subscriptions[topic]

    async def broadcast(self, topic: str, data: dict) -> None:
        """Send a message to all connections subscribed to a topic."""
        conn_ids = self._subscriptions.get(topic, set()).copy()

        # Also check wildcard subscribers
        if ":" in topic:
            wildcard = topic.split(":")[0] + ":*"
            if wildcard in self._subscriptions:
                conn_ids = conn_ids | self._subscriptions[wildcard]

        stale: list[str] = []
        for conn_id in conn_ids:
            ws = self._connections.get(conn_id)
            if ws is None:
                stale.append(conn_id)
                continue
            try:
                await ws.send_json(data)
            except Exception:
                logger.warning("Failed to send to %s, marking stale", conn_id)
                stale.append(conn_id)

        for conn_id in stale:
            await self.disconnect(conn_id)

    async def send_personal(self, user_id: str, data: dict) -> None:
        """Send a message to all connections for a specific user."""
        for conn_id, ctx in list(self._contexts.items()):
            if ctx.user_id == user_id:
                ws = self._connections.get(conn_id)
                if ws:
                    try:
                        await ws.send_json(data)
                    except Exception:
                        await self.disconnect(conn_id)

    def get_presence(self, workspace_id: str) -> list[dict]:
        """Get list of connected users in a workspace."""
        seen: set[str] = set()
        users: list[dict] = []
        for ctx in self._contexts.values():
            if ctx.workspace_id == workspace_id and ctx.user_id not in seen:
                seen.add(ctx.user_id)
                users.append(
                    {
                        "user_id": ctx.user_id,
                        "email": ctx.email,
                        "status": "online",
                    }
                )
        return users

    @property
    def connection_count(self) -> int:
        return len(self._connections)


# Global singleton
manager = ConnectionManager()
