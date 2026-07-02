"""MCP server and skill admin routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.db import get_db
from src.mcp.manifest import build_agent_manifest
from src.mcp.schemas import (
    CreateMcpServerRequest,
    CreateSkillRequest,
    ToggleSkillRequest,
    UpdateMcpServerRequest,
)
from src.mcp.service import (
    create_mcp_server,
    create_skill,
    list_mcp_servers,
    list_skills,
    test_mcp_server,
    toggle_skill,
    update_mcp_server,
)
from src.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/admin", tags=["mcp"])


# --- MCP Servers ---


@router.get("/mcp-servers")
def get_mcp_servers(
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """List all registered MCP servers."""
    servers = list_mcp_servers(db, user.get("workspace_id", "ws_dev"))
    return {"servers": servers}


@router.post("/mcp-servers")
def register_mcp_server(
    request: CreateMcpServerRequest,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Register a new MCP server."""
    return create_mcp_server(
        db,
        workspace_id=user.get("workspace_id", "ws_dev"),
        name=request.name,
        description=request.description,
        endpoint_url=request.endpoint_url,
        auth_type=request.auth_type,
        auth_config=request.auth_config,
        health_check_url=request.health_check_url,
    )


@router.put("/mcp-servers/{server_id}")
def update_server(
    server_id: str,
    request: UpdateMcpServerRequest,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Update an MCP server."""
    result = update_mcp_server(db, server_id, request.model_dump(exclude_none=True))
    if not result:
        raise HTTPException(status_code=404, detail="Server not found")
    return result


@router.post("/mcp-servers/{server_id}/test")
def test_server(
    server_id: str,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Test MCP server health."""
    return test_mcp_server(db, server_id)


# --- Skills ---


@router.get("/skills")
def get_skills(
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """List all skills."""
    skills = list_skills(db, user.get("workspace_id", "ws_dev"))
    return {"skills": skills}


@router.post("/skills")
def register_skill(
    request: CreateSkillRequest,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Create a new skill."""
    return create_skill(
        db,
        workspace_id=user.get("workspace_id", "ws_dev"),
        name=request.name,
        description=request.description,
        skill_type=request.skill_type,
        mcp_server_id=request.mcp_server_id,
        tool_name=request.tool_name,
        config=request.config,
    )


@router.post("/skills/{skill_id}/toggle")
def toggle_skill_endpoint(
    skill_id: str,
    request: ToggleSkillRequest,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Enable or disable a skill."""
    result = toggle_skill(db, skill_id, request.enabled)
    if not result:
        raise HTTPException(status_code=404, detail="Skill not found")
    return result


# --- Agent Manifest ---


@router.get("/agent-manifest")
def get_agent_manifest(
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Export workspace capability tree as W3C-aligned agent description manifest."""
    workspace_id = user.get("workspace_id", "ws_dev")
    return build_agent_manifest(db, workspace_id)
