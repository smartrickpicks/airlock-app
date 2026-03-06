"""Engine routes for extraction, preflight, and generation."""

from __future__ import annotations

from fastapi import APIRouter

from src.engines.extraction import run_extraction
from src.engines.generation import generate_contract, generate_contract_with_metadata
from src.engines.generation.fake_data import EntertainmentFaker
from src.engines.generation.variation_engine import apply_variations
from src.engines.preflight import run_preflight
from src.schemas.engine import (
    ExtractionRequest,
    ExtractionResponse,
    GenerationRequest,
    GenerationResponse,
    PreflightRequest,
    PreflightResponse,
)

router = APIRouter(prefix="/api/v1/engines", tags=["engines"])


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
