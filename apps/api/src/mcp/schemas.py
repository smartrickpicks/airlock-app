"""MCP server and skill Pydantic schemas."""

from pydantic import BaseModel, Field


class CreateMcpServerRequest(BaseModel):
    name: str
    description: str | None = None
    endpoint_url: str
    auth_type: str | None = None
    auth_config: dict = Field(default_factory=dict)
    health_check_url: str | None = None


class UpdateMcpServerRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    endpoint_url: str | None = None
    auth_type: str | None = None
    auth_config: dict | None = None
    status: str | None = None
    health_check_url: str | None = None


class CreateSkillRequest(BaseModel):
    name: str
    description: str | None = None
    skill_type: str | None = None
    mcp_server_id: str | None = None
    tool_name: str | None = None
    config: dict = Field(default_factory=dict)


class ToggleSkillRequest(BaseModel):
    enabled: bool
