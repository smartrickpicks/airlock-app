"""Agent manifest — export capability tree as agent description document."""

import logging
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from src.mcp.models import McpServer, Skill

logger = logging.getLogger(__name__)


def build_agent_manifest(db: Session, workspace_id: str) -> dict:
    """Build W3C-aligned agent description from workspace configuration.

    The capability tree (admin-configured nodes) defines what the workspace's
    'Enterprise Agent' can do. This export serializes it as a portable manifest.
    """
    # Query MCP servers
    servers = db.query(McpServer).filter(McpServer.workspace_id == workspace_id).all()

    # Query skills
    skills = db.query(Skill).filter(Skill.workspace_id == workspace_id).all()

    # Count totals
    active_servers = [s for s in servers if s.status == "active"]
    total_tools = sum(
        len(s.capabilities) if isinstance(s.capabilities, list) else 0 for s in active_servers
    )
    enabled_skills = [s for s in skills if s.enabled]

    return {
        "agent_description": {
            "version": "1.0",
            "protocol": "airlock-agent-manifest",
            "generated_at": datetime.now(UTC).isoformat(),
            "workspace_id": workspace_id,
            "identity": {
                "type": "enterprise",
                "name": "Airlock Workspace Agent",
                "description": (
                    "Enterprise data operations agent for contract lifecycle management"
                ),
            },
            "capabilities": {
                "mcp_servers": [
                    {
                        "id": s.id,
                        "name": s.name,
                        "endpoint": s.endpoint_url,
                        "status": s.status,
                        "auth_type": s.auth_type,
                        "tool_count": (
                            len(s.capabilities) if isinstance(s.capabilities, list) else 0
                        ),
                        "tools": (s.capabilities if isinstance(s.capabilities, list) else []),
                        "last_health": (s.last_health_at.isoformat() if s.last_health_at else None),
                    }
                    for s in servers
                ],
                "skills": [
                    {
                        "id": s.id,
                        "name": s.name,
                        "description": s.description,
                        "type": s.skill_type,
                        "enabled": s.enabled,
                        "mcp_server_id": s.mcp_server_id,
                        "tool_name": s.tool_name,
                    }
                    for s in skills
                ],
                "otto": {
                    "status": "active",
                    "tools": [
                        "get_gate_status",
                        "get_field_summary",
                        "get_open_patches",
                        "get_contract_health",
                        "get_preflight_status",
                        "get_deal_fields",
                        "get_extraction_meta",
                        "get_corpus_context",
                        "search_vaults",
                        "get_timeline",
                        "suggest_patch",
                        "run_preflight",
                    ],
                    "behavioral_rules": [
                        "Propose patches as drafts — never auto-apply",
                        "Self-approval blocked — AI patches need human review",
                        "Max 8 tool calls per message",
                        "Always cite enrichment sources in responses",
                    ],
                },
            },
            "authorization": {
                "model": "tiered",
                "tiers": {
                    "read": "Auto-execute, no confirmation needed",
                    "write": ("Show confirmation in Otto UI before executing"),
                    "dangerous": ("Require separate approval (Gate-style)"),
                },
                "role_hierarchy": [
                    "viewer",
                    "designer",
                    "builder",
                    "gatekeeper",
                    "owner",
                ],
            },
            "summary": {
                "total_mcp_servers": len(servers),
                "active_mcp_servers": len(active_servers),
                "total_tools": total_tools,
                "total_skills": len(skills),
                "enabled_skills": len(enabled_skills),
            },
        }
    }
