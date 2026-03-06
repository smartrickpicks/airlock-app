"""Engine routes for extraction, preflight, and generation."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, UploadFile

from src.engines.extraction import run_extraction
from src.engines.generation import generate_contract, generate_contract_with_metadata
from src.engines.generation.fake_data import EntertainmentFaker
from src.engines.generation.variation_engine import apply_variations
from src.engines.preflight import run_preflight
from src.schemas.engine import (
    AnalyzeResponse,
    ExtractionRequest,
    ExtractionResponse,
    GenerationRequest,
    GenerationResponse,
    PreflightRequest,
    PreflightResponse,
)
from src.services.pdf_parser import extract_pages

router = APIRouter(prefix="/api/v1/engines", tags=["engines"])


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_document(file: UploadFile) -> AnalyzeResponse:
    """Upload a PDF, run preflight + extraction, return combined results. No storage."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    pdf_bytes = await file.read()
    if len(pdf_bytes) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 50 MB).")

    try:
        pages_data = extract_pages(pdf_bytes)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not parse PDF: {exc}") from exc

    if not pages_data:
        raise HTTPException(status_code=422, detail="PDF appears to be empty.")

    full_text = "\n".join(p["text"] for p in pages_data)

    preflight = run_preflight(pages_data)
    extraction: dict[str, Any] = {}
    if preflight.get("gate_color") != "RED":
        extraction = run_extraction(full_text, call_site="analyze")

    # Build field summary
    tiers = {"high": 0, "medium": 0, "low": 0, "missing": 0}
    for field in extraction.values():
        conf = field.get("confidence") or 0
        val = field.get("value")
        if not val:
            tiers["missing"] += 1
        elif conf >= 0.85:
            tiers["high"] += 1
        elif conf >= 0.65:
            tiers["medium"] += 1
        else:
            tiers["low"] += 1

    return AnalyzeResponse(
        filename=file.filename or "document.pdf",
        page_count=len(pages_data),
        full_text_length=len(full_text),
        doc_mode=preflight["doc_mode"],
        gate_color=preflight["gate_color"],
        gate_reasons=preflight["gate_reasons"],
        health_score=preflight["health_score"],
        opportunities_readiness=preflight.get("opportunities_readiness"),
        schedule_readiness=preflight.get("schedule_readiness"),
        financials_readiness=preflight.get("financials_readiness"),
        entity_resolution=preflight.get("entity_resolution"),
        contract_classification=preflight.get("contract_classification"),
        extracted_fields=extraction,
        field_summary=tiers,
    )


@router.post("/preflight/run", response_model=PreflightResponse)
def run_preflight_route(body: PreflightRequest) -> PreflightResponse:
    """Run the preflight engine."""
    result = run_preflight([page.model_dump() for page in body.pages_data])
    return PreflightResponse.model_validate(result)


@router.post("/extraction/run", response_model=ExtractionResponse)
def run_extraction_route(body: ExtractionRequest) -> ExtractionResponse:
    """Run the extraction engine."""
    result = run_extraction(
        body.full_text,
        target_codes=set(body.target_codes) if body.target_codes else None,
        contract_id=body.contract_id,
        workspace_id=body.workspace_id,
        call_site=body.call_site,
    )
    return ExtractionResponse(results=result)


@router.post("/generation/run", response_model=GenerationResponse)
def run_generation_route(body: GenerationRequest) -> GenerationResponse:
    """Run the generation engine."""
    form_values = dict(body.form_values)
    if body.use_fake_data:
        faker = EntertainmentFaker(seed=body.seed)
        fake_values = faker.generate_form_values(body.contract_type)
        fake_values.update(form_values)
        form_values = fake_values

    metadata = (
        generate_contract_with_metadata(form_values, body.contract_type, seed=body.seed)
        if body.include_metadata
        else None
    )
    text = (
        metadata["text"]
        if metadata
        else generate_contract(form_values, body.contract_type, seed=body.seed)
    )
    variation_details = None
    if body.apply_variations:
        text, variation_details = apply_variations(text, seed=body.seed)

    return GenerationResponse(
        text=text,
        contract_type=body.contract_type,
        seed=body.seed,
        form_values=form_values,
        metadata=metadata,
        variation_details=variation_details,
    )
