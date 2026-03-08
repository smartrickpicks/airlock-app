"""WebSocket endpoint handler."""

import asyncio
import json
import logging

from starlette.websockets import WebSocket, WebSocketDisconnect

from src.realtime.connection_manager import UserContext, manager
from src.realtime.emitter import emit_presence
from src.realtime.topics import validate_topic
from src.services.jwt import verify_token

logger = logging.getLogger(__name__)

HEARTBEAT_INTERVAL = 30  # seconds


async def websocket_endpoint(ws: WebSocket) -> None:
    """Main WebSocket handler — authenticate, subscribe, receive/send."""
    token = ws.query_params.get("token")
    if not token:
        await ws.close(code=4001, reason="Missing token")
        return

    # Allow dev mock token
    if token == "dev_mock_token":
        user_ctx = UserContext(
            user_id="dev_user_001",
            workspace_id="ws_dev",
            email="dev@airlock.local",
            org_role="executive",
        )
    else:
        payload = verify_token(token)
        if not payload or payload.get("type") != "access":
            await ws.close(code=4001, reason="Invalid token")
            return
        user_ctx = UserContext(
            user_id=payload["sub"],
            workspace_id=payload["workspace_id"],
            email=payload.get("email", ""),
            org_role=payload.get("org_role", "viewer"),
        )

    # Connect
    connection_id = await manager.connect(ws, user_ctx)

    # Send ACK
    await ws.send_json(
        {
            "type": "connected",
            "connection_id": connection_id,
            "user_id": user_ctx.user_id,
            "workspace_id": user_ctx.workspace_id,
        }
    )

    # Auto-subscribe to personal + workspace topics
    manager.subscribe(connection_id, f"user:{user_ctx.user_id}")
    manager.subscribe(connection_id, "workspace")
    manager.subscribe(connection_id, f"presence:{user_ctx.workspace_id}")
    manager.subscribe(connection_id, "notifications:*")

    # Emit presence online
    await emit_presence(user_ctx.workspace_id, user_ctx.user_id, "online")

    # Start heartbeat task
    heartbeat_task = asyncio.create_task(_heartbeat(ws, connection_id))

    try:
        while True:
            data = await ws.receive_text()
            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type")

            if msg_type == "subscribe":
                topic = msg.get("topic", "")
                if validate_topic(topic):
                    manager.subscribe(connection_id, topic)
                    await ws.send_json({"type": "subscribed", "topic": topic})

            elif msg_type == "unsubscribe":
                topic = msg.get("topic", "")
                manager.unsubscribe(connection_id, topic)
                await ws.send_json({"type": "unsubscribed", "topic": topic})

            elif msg_type == "ping":
                await ws.send_json({"type": "pong"})

            elif msg_type == "presence":
                current_page = msg.get("current_page")
                await emit_presence(user_ctx.workspace_id, user_ctx.user_id, "online", current_page)

    except WebSocketDisconnect:
        logger.info("WebSocket disconnect: %s", connection_id)
    except Exception:
        logger.exception("WebSocket error: %s", connection_id)
    finally:
        heartbeat_task.cancel()
        await emit_presence(user_ctx.workspace_id, user_ctx.user_id, "offline")
        await manager.disconnect(connection_id)


async def _heartbeat(ws: WebSocket, connection_id: str) -> None:
    """Send periodic pings to keep connection alive."""
    try:
        while True:
            await asyncio.sleep(HEARTBEAT_INTERVAL)
            try:
                await ws.send_json({"type": "ping"})
            except Exception:
                logger.info("Heartbeat failed for %s", connection_id)
                break
    except asyncio.CancelledError:
        pass
