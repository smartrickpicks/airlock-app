"""Workflow Pydantic schemas."""

from pydantic import BaseModel, Field


class CreateWorkflowRequest(BaseModel):
    name: str
    description: str | None = None
    category: str | None = None
    definition: dict = Field(default_factory=lambda: {"nodes": [], "edges": []})
    trigger_type: str | None = None
    trigger_config: dict = Field(default_factory=dict)


class UpdateWorkflowRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    definition: dict | None = None
    status: str | None = None
    trigger_type: str | None = None
    trigger_config: dict | None = None


class ExecuteWorkflowRequest(BaseModel):
    trigger_data: dict = Field(default_factory=dict)
