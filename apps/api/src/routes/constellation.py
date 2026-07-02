"""Constellation API proxy — forwards to Otto State Service."""

import os

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/v1/constellation", tags=["constellation"])

STATE_SERVICE_URL = os.environ.get("OTTO_STATE_SERVICE_URL", "http://localhost:8100")


@router.get("/reports")
async def list_reports(command: str | None = None, limit: int = 20):
    async with httpx.AsyncClient(timeout=5.0) as client:
        params = {"limit": limit}
        if command:
            params["command"] = command
        resp = await client.get(f"{STATE_SERVICE_URL}/constellation/reports", params=params)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="State Service error")
        return resp.json()


@router.get("/reports/{report_id}")
async def get_report(report_id: str):
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(f"{STATE_SERVICE_URL}/constellation/reports/{report_id}")
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Report not found")
        return resp.json()


@router.patch("/reports/{report_id}/decision")
async def update_decision(report_id: str, body: dict):
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.patch(
            f"{STATE_SERVICE_URL}/constellation/reports/{report_id}/decision",
            json=body,
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Update failed")
        return resp.json()


@router.get("/relays/repos")
async def list_repo_relays():
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(f"{STATE_SERVICE_URL}/constellation/relays/repos")
        return resp.json()


@router.get("/relays/personas")
async def list_persona_relays():
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(f"{STATE_SERVICE_URL}/constellation/relays/personas")
        return resp.json()


@router.post("/relays/refresh")
async def refresh_relays():
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(f"{STATE_SERVICE_URL}/constellation/relays/repos/refresh")
        return resp.json()
