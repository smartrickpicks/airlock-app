"""Otto VaultContext — dependency injection for PydanticAI agent."""

from dataclasses import dataclass


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
