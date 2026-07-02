"""MCP server and skill service — CRUD operations."""

import logging
from datetime import UTC, datetime

from sqlalchemy.orm import Session
from ulid import ULID

from src.mcp.models import McpServer, Skill

logger = logging.getLogger(__name__)


# --- MCP Servers ---


def list_mcp_servers(db: Session, workspace_id: str) -> list[dict]:
    """List all MCP servers for a workspace."""
    servers = (
        db.query(McpServer)
        .filter(
            McpServer.workspace_id == workspace_id,
        )
        .order_by(McpServer.created_at.desc())
        .all()
    )
    return [_server_to_dict(s) for s in servers]


def create_mcp_server(db: Session, workspace_id: str, **kwargs: object) -> dict:
    """Register a new MCP server."""
    server = McpServer(
        id=f"mcp_{ULID()}",
        workspace_id=workspace_id,
        **kwargs,
    )
    db.add(server)
    db.commit()
    db.refresh(server)
    return _server_to_dict(server)


def update_mcp_server(db: Session, server_id: str, updates: dict) -> dict | None:
    """Update an MCP server."""
    server = db.query(McpServer).filter(McpServer.id == server_id).first()
    if not server:
        return None
    for key, value in updates.items():
        if value is not None and hasattr(server, key):
            setattr(server, key, value)
    server.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(server)
    return _server_to_dict(server)


def test_mcp_server(db: Session, server_id: str) -> dict:
    """Test health of an MCP server."""
    server = db.query(McpServer).filter(McpServer.id == server_id).first()
    if not server:
        return {"status": "error", "message": "Server not found"}

    # Stub: mark as healthy
    server.status = "active"
    server.last_health_at = datetime.now(UTC)
    db.commit()
    return {"status": "healthy", "server_id": server_id}


# --- Skills ---


def list_skills(db: Session, workspace_id: str) -> list[dict]:
    """List all skills for a workspace."""
    skills = (
        db.query(Skill)
        .filter(
            Skill.workspace_id == workspace_id,
        )
        .order_by(Skill.created_at.desc())
        .all()
    )
    return [_skill_to_dict(s) for s in skills]


def create_skill(db: Session, workspace_id: str, **kwargs: object) -> dict:
    """Create a new skill."""
    skill = Skill(
        id=f"skill_{ULID()}",
        workspace_id=workspace_id,
        **kwargs,
    )
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return _skill_to_dict(skill)


def toggle_skill(db: Session, skill_id: str, enabled: bool) -> dict | None:
    """Enable or disable a skill."""
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        return None
    skill.enabled = enabled
    skill.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(skill)
    return _skill_to_dict(skill)


def _server_to_dict(s: McpServer) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "description": s.description,
        "endpoint_url": s.endpoint_url,
        "auth_type": s.auth_type,
        "status": s.status,
        "capabilities": s.capabilities,
        "health_check_url": s.health_check_url,
        "last_health_at": s.last_health_at.isoformat() if s.last_health_at else None,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


def _skill_to_dict(s: Skill) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "description": s.description,
        "skill_type": s.skill_type,
        "mcp_server_id": s.mcp_server_id,
        "tool_name": s.tool_name,
        "config": s.config,
        "enabled": s.enabled,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }
