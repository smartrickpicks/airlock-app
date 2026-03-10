"""Pydantic schemas for playbook templates and instances.

Templates are static YAML definitions loaded from disk.
Instances are runtime state tracked in the database.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class ActorType(StrEnum):
    """Who executes a playbook node."""

    OTTO = "otto"
    HUMAN = "human"
    HYBRID = "hybrid"


class NodeStatus(StrEnum):
    """Runtime status of a playbook node."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    BLOCKED = "blocked"


class InstanceStatus(StrEnum):
    """Runtime status of a playbook instance."""

    DRAFT = "draft"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class GateType(StrEnum):
    """Types of gate checkpoints."""

    VERIFICATION = "verification"
    APPROVAL = "approval"
    DENSITY = "density"


# ---------------------------------------------------------------------------
# Template Schemas (from YAML)
# ---------------------------------------------------------------------------


class GateConfig(BaseModel):
    """Gate configuration within a playbook node."""

    type: GateType
    required_approvals: int = Field(default=1, ge=1)
    roles: list[str] = Field(default_factory=lambda: ["gatekeeper"])
    description: str | None = None


class PlaybookNode(BaseModel):
    """A single node in a playbook DAG."""

    id: str = Field(description="Unique node identifier within the playbook")
    name: str = Field(description="Human-readable node name")
    description: str = Field(default="", description="What this node does")
    actor: ActorType = Field(default=ActorType.OTTO, description="Who executes this node")
    otto_archetype: str | None = Field(
        default=None,
        description="Otto archetype for this node (analyst, strategist, executor, etc.)",
    )
    chamber: str = Field(description="Which chamber this node belongs to")
    team_type: str | None = Field(default=None, description="Team type for PI-informed assignment")
    depends_on: list[str] = Field(default_factory=list, description="Node IDs this node depends on")
    gate: GateConfig | None = Field(default=None, description="Optional gate checkpoint")


class PlaybookTemplate(BaseModel):
    """A complete playbook template definition."""

    id: str = Field(description="Unique template identifier (kebab-case)")
    name: str = Field(description="Human-readable playbook name")
    description: str = Field(default="", description="What this playbook does")
    module: str = Field(default="contracts", description="Primary module this playbook serves")
    version: str = Field(default="1.0", description="Template version")
    team_composition: str | None = Field(
        default=None,
        description="Recommended team flywheel composition",
    )
    nodes: list[PlaybookNode] = Field(description="DAG nodes in execution order")

    def node_ids(self) -> set[str]:
        """Return all node IDs in this template."""
        return {n.id for n in self.nodes}

    def gate_count(self) -> int:
        """Count how many nodes have gates."""
        return sum(1 for n in self.nodes if n.gate is not None)

    def validate_dag(self) -> list[str]:
        """Validate the DAG structure. Returns list of errors (empty = valid)."""
        errors: list[str] = []
        node_ids = self.node_ids()

        for node in self.nodes:
            for dep in node.depends_on:
                if dep not in node_ids:
                    errors.append(f"Node '{node.id}' depends on unknown node '{dep}'")

        # Check for cycles using DFS
        visited: set[str] = set()
        rec_stack: set[str] = set()
        adj: dict[str, list[str]] = {n.id: n.depends_on for n in self.nodes}

        def _has_cycle(node_id: str) -> bool:
            visited.add(node_id)
            rec_stack.add(node_id)
            for dep in adj.get(node_id, []):
                if dep not in visited:
                    if _has_cycle(dep):
                        return True
                elif dep in rec_stack:
                    return True
            rec_stack.discard(node_id)
            return False

        for nid in node_ids:
            if nid not in visited and _has_cycle(nid):
                errors.append("DAG contains a cycle")
                break

        return errors


# ---------------------------------------------------------------------------
# Instance Schemas (database state)
# ---------------------------------------------------------------------------


class NodeStateResponse(BaseModel):
    """Runtime state of a single playbook node."""

    id: str
    instance_id: str
    node_id: str
    status: NodeStatus
    actor: str
    archetype: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    result: dict[str, Any] | None = None
    gate_response: dict[str, Any] | None = None

    model_config = {"from_attributes": True}


class InstanceResponse(BaseModel):
    """Playbook instance response."""

    id: str
    workspace_id: str
    template_id: str
    vault_id: str | None = None
    status: InstanceStatus
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    node_states: list[NodeStateResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class InstanceListResponse(BaseModel):
    """List of playbook instances."""

    instances: list[InstanceResponse]
    total: int


class CreateInstanceRequest(BaseModel):
    """Request to create a playbook instance from a template."""

    template_id: str = Field(description="Template ID to instantiate")
    vault_id: str | None = Field(default=None, description="Vault to attach this playbook to")
    workspace_id: str = Field(description="Workspace for RLS")


class UpdateInstanceRequest(BaseModel):
    """Request to update a playbook instance status."""

    status: InstanceStatus | None = None


class UpdateNodeStateRequest(BaseModel):
    """Request to update a node's state."""

    status: NodeStatus | None = None
    result: dict[str, Any] | None = None
    gate_response: dict[str, Any] | None = None


# ---------------------------------------------------------------------------
# DAG Execution Schemas (M7)
# ---------------------------------------------------------------------------


class ExecuteRequest(BaseModel):
    """Request to start or advance DAG execution on a playbook instance."""

    vault_context: dict[str, Any] | None = Field(
        default=None, description="Vault data context for prompt composition"
    )
    user_profile: dict[str, Any] | None = Field(
        default=None, description="User profile for prompt composition"
    )


class CompleteNodeRequest(BaseModel):
    """Request to externally complete a blocked node (human/hybrid)."""

    result: dict[str, Any] | None = Field(
        default=None, description="Result data from human completion"
    )


class GateResponseRequest(BaseModel):
    """Request to respond to a gate checkpoint."""

    action: str = Field(description="Gate action: approve, reject, or request_changes")
    responder_id: str = Field(description="ID of the user responding to the gate")
    comment: str | None = Field(default=None, description="Optional comment from reviewer")


class ExecutionResponse(BaseModel):
    """Response from DAG execution operations."""

    instance_id: str
    nodes_executed: list[str] = Field(default_factory=list)
    nodes_blocked: list[str] = Field(default_factory=list)
    is_complete: bool = False
    errors: list[str] = Field(default_factory=list)


class TemplateListResponse(BaseModel):
    """List of available playbook templates."""

    templates: list[PlaybookTemplateSummary]
    total: int


class PlaybookTemplateSummary(BaseModel):
    """Summary of a playbook template (for listing)."""

    id: str
    name: str
    description: str
    module: str
    version: str
    node_count: int
    gate_count: int


# Fix forward reference
TemplateListResponse.model_rebuild()
