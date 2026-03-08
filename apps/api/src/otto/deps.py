"""Otto VaultContext — dependency injection for PydanticAI agent."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


@dataclass
class GateState:
    gate_color: str  # "green" | "yellow" | "red"
    health_score: float
    processing_status: str  # "pending" | "in_progress" | "complete" | "failed"


@dataclass
class FieldSummary:
    pass_count: int
    fail_count: int
    review_count: int
    skip_count: int


@dataclass
class ContractHealth:
    score: float
    gate_color: str
    total_checks: int


@dataclass
class DomainRules:
    categories: list[str]


@dataclass
class PreflightSection:
    name: str
    status: str  # "pending" | "running" | "passed" | "failed" | "skipped"


@dataclass
class ExtractionMeta:
    page_count: int
    encoding_type: str
    mojibake_count: int


@dataclass
class PatchSummary:
    open: int
    in_review: int
    resolved: int
    dismissed: int


@dataclass
class DealFields:
    territory: str | None = None
    term_length: str | None = None
    contract_type: str | None = None
    deal_type: str | None = None
    counterparty_type: str | None = None
    legal_entity: str | None = None


@dataclass
class VaultContext:
    """Full context injected into Otto agent for each message."""

    vault_id: str
    workspace_id: str
    user_id: str
    user_role: str

    # Enrichment results (any can be None if source failed)
    gate_state: GateState | None = None
    field_summary: FieldSummary | None = None
    contract_health: ContractHealth | None = None
    domain_rules: DomainRules | None = None
    preflight_sections: list[PreflightSection] | None = None
    corpus_lines: list[str] | None = None
    extraction_meta: ExtractionMeta | None = None
    patch_summary: PatchSummary | None = None
    deal_fields: DealFields | None = None


@dataclass
class PermittedTool:
    """A tool available to this user in the current context."""

    name: str
    server: str
    risk_tier: str  # "read" | "write" | "dangerous"
    module_scope: list[str]


@dataclass
class UserAgentContext:
    """Full agent context — extends VaultContext with identity, capabilities, preferences.

    Maps to W3C Personal Agent pattern: Otto assembles this at session init
    to understand who is asking, what they can do, and how they prefer responses.
    """

    # Identity (who)
    user_id: str
    workspace_id: str
    org_role: str  # member | lead | director | executive | architect
    module_role: str  # builder | gatekeeper | owner | designer | viewer

    # Scope (where)
    vault_id: str
    module: str  # contracts | crm | tasks | calendar | documents
    chamber: str  # discover | build | review | ship

    # Capabilities (what tools are available)
    permitted_tools: list[PermittedTool]
    personal_connections: list[str]  # connected integrations

    # Context (enrichment)
    vault_context: VaultContext

    # Preferences (how)
    response_style: str = "concise"  # "concise" | "detailed" | "technical"
    auto_approve_reads: bool = True
    notification_prefs: dict | None = None


@dataclass
class RecipeNode:
    """A single node in a recipe sequence."""

    type: str  # extraction | review | fill | tag | approve | notify | gate
    config: dict
    gate_conditions: list[dict]
    description: str = ""


@dataclass
class OttoState:
    """Shared typed state for the Otto agent graph.

    Every node reads and writes to this. Passed through PydanticAI Graph's
    GraphRunContext[OttoState].
    """

    # --- Identity ---
    user_id: str
    workspace_id: str
    org_role: str  # owner | conductor | member
    module_roles: dict[str, str]  # {"contracts": "gatekeeper", ...}
    archetype: str | None = (
        None  # analyst | strategist | executor | connector | guardian | architect
    )

    # --- Location ---
    surface: Literal["task_runner", "messenger", "context_menu"] = "messenger"
    module: str | None = None  # contracts | crm | triage | calendar | documents
    chamber: str | None = None  # discover | build | review | ship
    vault_id: str | None = None

    # --- Recipe ---
    active_recipe_id: str | None = None
    current_node_index: int | None = None
    current_node: dict | None = None  # {type, config, gate_conditions}
    total_recipe_nodes: int | None = None

    # --- Conversation ---
    messages: list[dict] = field(default_factory=list)
    session_id: str = ""

    # --- Surface behavior ---
    can_execute_actions: bool | None = None

    # --- Enrichment (lazy-loaded) ---
    vault_context: dict | None = None
    recipe_context: dict | None = None
    enrichment_cache: dict[str, tuple[dict, float]] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.can_execute_actions is None:
            self.can_execute_actions = self.surface == "task_runner"
