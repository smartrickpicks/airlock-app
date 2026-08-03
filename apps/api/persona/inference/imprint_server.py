"""FastAPI bridge for the 3-question imprint demo.

Wraps run_imprint() so the imprint-onboarding.html can fetch DECF results
without bundling the Python runtime in the browser.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from inference import imprint_decf
from inference.imprint_decf import run_imprint, ImprintResult
from inference.imprint_extractor import ImprintExtractionError


app = FastAPI(title="Airlock Imprint Demo", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # demo only; tighten before prod
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)


class ImprintRequest(BaseModel):
    q1_text: str
    q2_card: str
    q3_card: str


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/imprint")
def post_imprint(req: ImprintRequest) -> dict:
    try:
        result: ImprintResult = run_imprint(
            req.q1_text,
            req.q2_card,
            req.q3_card,
            extractor=imprint_decf.extract_language_style,
        )
    except ImprintExtractionError as exc:
        raise HTTPException(status_code=502, detail=f"LLM extraction failed: {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Unknown card label: {exc}") from exc

    return {
        "decf": {"D": result.decf.D, "E": result.decf.E, "C": result.decf.C, "F": result.decf.F},
        "profile_id": result.profile_id,
        "meta_archetype": result.meta_archetype,
        "empaako_primary": result.empaako_primary,
        "empaako_secondary": result.empaako_secondary,
        "confidence": result.confidence,
        "provenance": result.provenance,
    }
