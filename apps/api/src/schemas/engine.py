"""Pydantic schemas for engine routes."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class PreflightPageInput(BaseModel):
    page: int = Field(ge=1)
    text: str = ""
    char_count: int | None = Field(default=None, ge=0)
    image_coverage_ratio: float = Field(default=0.0, ge=0.0, le=1.0)


class PreflightRequest(BaseModel):
    pages_data: list[PreflightPageInput] = Field(default_factory=list)


class PreflightResponse(BaseModel):
    doc_mode: str
    gate_color: str
    gate_reasons: list[str]
    decision_trace: list[dict[str, Any]]
    corruption_samples: list[dict[str, Any]]
    salesforce_match: list[dict[str, Any]] | None = None
    resolution_story: dict[str, Any] | None = None
    entity_resolution: dict[str, Any] | None = None
    opportunities_readiness: dict[str, Any] | None = None
    schedule_readiness: dict[str, Any] | None = None
    contract_classification: dict[str, Any] | None = None
    financials_readiness: dict[str, Any] | None = None
    addons_readiness: dict[str, Any] | None = None
    health_score: dict[str, Any]
    page_classifications: list[dict[str, Any]]
    extracted_text: str | None = None
    text_truncated: bool | None = None
    original_text_length: int | None = None
    extracted_headers: list[str] = Field(default_factory=list)
    low_signal_headers: list[str] = Field(default_factory=list)
    metrics: dict[str, Any]


class ExtractionRequest(BaseModel):
    full_text: str
    target_codes: list[str] | None = None
    contract_id: str | None = None
    workspace_id: str | None = None
    call_site: str = "api"


class ExtractionResponse(BaseModel):
    results: dict[str, dict[str, Any]]


class GenerationRequest(BaseModel):
    contract_type: str
    form_values: dict[str, Any] = Field(default_factory=dict)
    seed: int = 42
    include_metadata: bool = False
    apply_variations: bool = False
    use_fake_data: bool = False


class GenerationResponse(BaseModel):
    text: str
    contract_type: str
    seed: int
    form_values: dict[str, Any]
    metadata: dict[str, Any] | None = None
    variation_details: dict[str, Any] | None = None
