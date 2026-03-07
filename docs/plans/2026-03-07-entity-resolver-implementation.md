# Contract-First Entity Resolver — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a contract-first entity resolution system that resolves "who is this contract about?" without Salesforce, using a local known_entities table seeded from spreadsheet import and enriched by contract processing.

**Architecture:** Three new DB tables (known_entities, entity_aliases, entity_resolutions) + resolver service with 4-pass fuzzy matching + Signal panel UI card + Accounts Import modal + CRM entity management via react-admin.

**Tech Stack:** FastAPI (async), SQLAlchemy + Alembic, rapidfuzz, Pydantic, Next.js 14 App Router, Zustand, Tailwind (tokens.css), react-admin.

**Design Spec:** `docs/plans/2026-03-07-entity-resolver-design.md`

---

## Task 1: Database Models — known_entities table

**Files:**

- Create: `apps/api/src/models/known_entity.py`
- Test: `apps/api/tests/models/test_known_entity.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/models/test_known_entity.py
import pytest
from src.models.known_entity import KnownEntity, EntityAlias, EntityResolution

def test_known_entity_model_has_required_columns():
    """All required columns exist on the model."""
    required = ["id", "workspace_id", "canonical_name", "entity_type",
                "legal_name", "dba_name", "billing_street", "billing_city",
                "billing_state", "billing_zip", "billing_country",
                "state_of_formation", "type_of_company", "external_id",
                "source", "vault_count", "created_at", "updated_at",
                "deleted_at", "metadata"]
    for col in required:
        assert hasattr(KnownEntity, col), f"Missing column: {col}"

def test_entity_alias_model_has_required_columns():
    required = ["id", "workspace_id", "entity_id", "alias_name",
                "alias_source", "created_at", "metadata"]
    for col in required:
        assert hasattr(EntityAlias, col), f"Missing column: {col}"

def test_entity_resolution_model_has_required_columns():
    required = ["id", "workspace_id", "vault_id", "entity_id",
                "extracted_name", "party_role", "resolution_type",
                "confidence", "evidence", "actor_id", "created_at", "metadata"]
    for col in required:
        assert hasattr(EntityResolution, col), f"Missing column: {col}"
```

**Step 2: Run test to verify it fails**

```bash
cd apps/api && python -m pytest tests/models/test_known_entity.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'src.models.known_entity'`

**Step 3: Write minimal implementation**

```python
# apps/api/src/models/known_entity.py
"""Known entities for contract-first entity resolution.

Three tables:
- known_entities: canonical entity records (accounts)
- entity_aliases: alternative names that map to a known entity
- entity_resolutions: append-only log of resolution decisions per vault
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, Text, Integer, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from src.db.base import Base


class KnownEntity(Base):
    __tablename__ = "known_entities"

    id = Column(Text, primary_key=True)
    workspace_id = Column(Text, ForeignKey("workspaces.id"), nullable=False, index=True)
    canonical_name = Column(Text, nullable=False)
    entity_type = Column(Text)  # Label, Publisher, Artist, Agency, etc.
    legal_name = Column(Text)
    dba_name = Column(Text)
    billing_street = Column(Text)
    billing_city = Column(Text)
    billing_state = Column(Text)
    billing_zip = Column(Text)
    billing_country = Column(Text)
    state_of_formation = Column(Text)
    type_of_company = Column(Text)  # LLC, Corp, etc.
    external_id = Column(Text)  # SF Account ID, NULL until connected
    source = Column(Text, nullable=False, default="manual")
    vault_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime(timezone=True))
    metadata = Column(JSONB, nullable=False, default=dict)

    aliases = relationship("EntityAlias", back_populates="entity", lazy="selectin")


class EntityAlias(Base):
    __tablename__ = "entity_aliases"

    id = Column(Text, primary_key=True)
    workspace_id = Column(Text, ForeignKey("workspaces.id"), nullable=False, index=True)
    entity_id = Column(Text, ForeignKey("known_entities.id"), nullable=False, index=True)
    alias_name = Column(Text, nullable=False)
    alias_source = Column(Text, nullable=False, default="manual")
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    metadata = Column(JSONB, nullable=False, default=dict)

    entity = relationship("KnownEntity", back_populates="aliases")


class EntityResolution(Base):
    __tablename__ = "entity_resolutions"

    id = Column(Text, primary_key=True)
    workspace_id = Column(Text, ForeignKey("workspaces.id"), nullable=False, index=True)
    vault_id = Column(Text, ForeignKey("vaults.id"), nullable=False, index=True)
    entity_id = Column(Text, ForeignKey("known_entities.id"))  # NULL if flagged new
    extracted_name = Column(Text, nullable=False)
    party_role = Column(Text, nullable=False)  # legal_entity / counterparty
    resolution_type = Column(Text, nullable=False)  # auto / confirmed / manual / new / override
    confidence = Column(Numeric(3, 2))
    evidence = Column(JSONB, nullable=False, default=dict)
    actor_id = Column(Text)  # NULL for auto-resolution
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    metadata = Column(JSONB, nullable=False, default=dict)
```

**Step 4: Run test to verify it passes**

```bash
cd apps/api && python -m pytest tests/models/test_known_entity.py -v
```

Expected: PASS

**Step 5: Create Alembic migration**

```bash
cd apps/api && alembic revision --autogenerate -m "add known_entities entity_aliases entity_resolutions tables"
```

Verify both `upgrade()` and `downgrade()` exist.

**Step 6: Commit**

```bash
git add apps/api/src/models/known_entity.py apps/api/tests/models/test_known_entity.py
git commit -m "feat(api): add known_entities, entity_aliases, entity_resolutions models"
```

---

## Task 2: Pydantic Schemas for Entity Resolution

**Files:**

- Create: `apps/api/src/schemas/entity.py`
- Test: `apps/api/tests/schemas/test_entity.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/schemas/test_entity.py
from src.schemas.entity import (
    KnownEntityCreate, KnownEntityResponse,
    EntityAliasCreate, EntityCandidate,
    EntityResolutionResult, EntityImportRow,
    EntityImportResponse,
)

def test_known_entity_create_validates():
    entity = KnownEntityCreate(
        canonical_name="Henderson Music Group",
        entity_type="Label",
        source="spreadsheet_import",
    )
    assert entity.canonical_name == "Henderson Music Group"

def test_entity_candidate_has_evidence():
    candidate = EntityCandidate(
        entity_id="01ABC",
        canonical_name="Henderson Music Group",
        confidence=0.92,
        evidence={"name_fuzzy": 0.88, "address_partial": True},
    )
    assert candidate.confidence == 0.92

def test_entity_import_response():
    resp = EntityImportResponse(
        imported=42, duplicates_merged=3, skipped=2,
        merge_details=[{"source": "Henderson Music", "target": "Henderson Music Group"}],
    )
    assert resp.imported == 42
```

**Step 2: Run test to verify it fails**

```bash
cd apps/api && python -m pytest tests/schemas/test_entity.py -v
```

**Step 3: Write minimal implementation**

```python
# apps/api/src/schemas/entity.py
"""Pydantic schemas for entity resolution API."""
from typing import Optional
from pydantic import BaseModel


class KnownEntityCreate(BaseModel):
    canonical_name: str
    entity_type: Optional[str] = None
    legal_name: Optional[str] = None
    dba_name: Optional[str] = None
    billing_street: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: Optional[str] = None
    billing_zip: Optional[str] = None
    billing_country: Optional[str] = None
    state_of_formation: Optional[str] = None
    type_of_company: Optional[str] = None
    external_id: Optional[str] = None
    source: str = "manual"


class KnownEntityResponse(BaseModel):
    id: str
    workspace_id: str
    canonical_name: str
    entity_type: Optional[str]
    legal_name: Optional[str]
    dba_name: Optional[str]
    billing_city: Optional[str]
    billing_state: Optional[str]
    source: str
    vault_count: int
    aliases: list[str] = []

    class Config:
        from_attributes = True


class EntityAliasCreate(BaseModel):
    entity_id: str
    alias_name: str
    alias_source: str = "manual"


class EntityCandidate(BaseModel):
    entity_id: str
    canonical_name: str
    confidence: float
    evidence: dict


class EntityResolutionResult(BaseModel):
    extracted_name: str
    party_role: str  # legal_entity / counterparty
    resolution_state: str  # auto_resolved / high_confidence / ambiguous / no_match / new
    top_confidence: Optional[float] = None
    candidates: list[EntityCandidate] = []


class EntityImportRow(BaseModel):
    canonical_name: str
    entity_type: Optional[str] = None
    legal_name: Optional[str] = None
    dba_name: Optional[str] = None
    billing_street: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: Optional[str] = None
    billing_zip: Optional[str] = None
    billing_country: Optional[str] = None
    state_of_formation: Optional[str] = None
    type_of_company: Optional[str] = None
    external_id: Optional[str] = None


class EntityImportResponse(BaseModel):
    imported: int
    duplicates_merged: int
    skipped: int
    merge_details: list[dict] = []
```

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add apps/api/src/schemas/entity.py apps/api/tests/schemas/test_entity.py
git commit -m "feat(api): add Pydantic schemas for entity resolution"
```

---

## Task 3: Entity Resolver Service (Core Logic)

**Files:**

- Create: `apps/api/src/services/entity_resolver.py`
- Test: `apps/api/tests/services/test_entity_resolver.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/services/test_entity_resolver.py
import pytest
from unittest.mock import AsyncMock, patch
from src.services.entity_resolver import EntityResolverService

@pytest.fixture
def resolver():
    return EntityResolverService()

@pytest.fixture
def sample_entities():
    return [
        {"id": "ent_1", "canonical_name": "Henderson Music Group", "entity_type": "Label",
         "billing_city": "Los Angeles", "billing_state": "CA",
         "aliases": ["henderson music", "HMG"]},
        {"id": "ent_2", "canonical_name": "Summit Publishing LLC", "entity_type": "Publisher",
         "billing_city": "Nashville", "billing_state": "TN", "aliases": []},
    ]

def test_exact_alias_match(resolver, sample_entities):
    """Exact alias match returns confidence 1.0."""
    candidates = resolver.match("henderson music", sample_entities)
    assert len(candidates) >= 1
    assert candidates[0]["entity_id"] == "ent_1"
    assert candidates[0]["confidence"] == 1.0
    assert "name_exact" in candidates[0]["evidence"]

def test_exact_canonical_match(resolver, sample_entities):
    """Exact canonical name match returns confidence 0.95."""
    candidates = resolver.match("Henderson Music Group", sample_entities)
    assert candidates[0]["confidence"] == 0.95

def test_fuzzy_match(resolver, sample_entities):
    """Fuzzy match returns score between 0.50 and 0.90."""
    candidates = resolver.match("Henderson Music Grp", sample_entities)
    assert 0.50 <= candidates[0]["confidence"] <= 0.95
    assert "name_fuzzy" in candidates[0]["evidence"]

def test_no_match(resolver, sample_entities):
    """Unknown name returns empty candidates."""
    candidates = resolver.match("Totally Unknown Corp", sample_entities)
    assert len(candidates) == 0

def test_address_boost(resolver, sample_entities):
    """Matching address fields boost confidence."""
    candidates = resolver.match(
        "Henderson Music Grp",
        sample_entities,
        extracted_fields={"billing_city": "Los Angeles", "billing_state": "CA"},
    )
    base_candidates = resolver.match("Henderson Music Grp", sample_entities)
    assert candidates[0]["confidence"] > base_candidates[0]["confidence"]

def test_candidates_sorted_by_confidence(resolver, sample_entities):
    """Candidates are returned sorted by confidence descending."""
    candidates = resolver.match("Music Publishing", sample_entities)
    if len(candidates) > 1:
        assert candidates[0]["confidence"] >= candidates[1]["confidence"]
```

**Step 2: Run test to verify it fails**

```bash
cd apps/api && python -m pytest tests/services/test_entity_resolver.py -v
```

**Step 3: Write minimal implementation**

```python
# apps/api/src/services/entity_resolver.py
"""Entity resolver service — 4-pass fuzzy matching against known_entities."""
from rapidfuzz import fuzz


class EntityResolverService:
    """Matches extracted party names against a known entities list.

    Four-pass matching:
      Pass 1: Exact alias match → confidence 1.0
      Pass 2: Exact canonical name match → confidence 0.95
      Pass 3: Fuzzy name match → confidence 0.50-0.90
      Pass 4: Address + type boost → adds up to 0.15
    """

    FUZZY_THRESHOLD = 70  # minimum fuzz.ratio to consider a match
    ADDRESS_CITY_BOOST = 0.05
    ADDRESS_STATE_BOOST = 0.05
    ENTITY_TYPE_BOOST = 0.05

    def match(
        self,
        extracted_name: str,
        entities: list[dict],
        extracted_fields: dict | None = None,
    ) -> list[dict]:
        extracted_fields = extracted_fields or {}
        extracted_lower = extracted_name.lower().strip()
        candidates = []

        for entity in entities:
            evidence = {}
            confidence = 0.0
            canonical = entity["canonical_name"]
            aliases = entity.get("aliases", [])

            # Pass 1: Exact alias match
            if extracted_lower in [a.lower() for a in aliases]:
                confidence = 1.0
                evidence["name_exact"] = True
            # Pass 2: Exact canonical match
            elif extracted_lower == canonical.lower():
                confidence = 0.95
                evidence["name_exact"] = True
            else:
                # Pass 3: Fuzzy match
                ratio = fuzz.ratio(extracted_lower, canonical.lower())
                if ratio >= self.FUZZY_THRESHOLD:
                    confidence = round(ratio / 100 * 0.90, 2)  # scale to 0-0.90
                    evidence["name_fuzzy"] = round(ratio / 100, 2)
                else:
                    # Check aliases too
                    best_alias_ratio = 0
                    for alias in aliases:
                        r = fuzz.ratio(extracted_lower, alias.lower())
                        best_alias_ratio = max(best_alias_ratio, r)
                    if best_alias_ratio >= self.FUZZY_THRESHOLD:
                        confidence = round(best_alias_ratio / 100 * 0.90, 2)
                        evidence["name_fuzzy"] = round(best_alias_ratio / 100, 2)

            if confidence == 0.0:
                continue

            # Pass 4: Address + type boost
            if extracted_fields.get("billing_city") and entity.get("billing_city"):
                if extracted_fields["billing_city"].lower() == entity["billing_city"].lower():
                    confidence = min(confidence + self.ADDRESS_CITY_BOOST, 1.0)
                    evidence["address_partial"] = True
            if extracted_fields.get("billing_state") and entity.get("billing_state"):
                if extracted_fields["billing_state"].lower() == entity["billing_state"].lower():
                    confidence = min(confidence + self.ADDRESS_STATE_BOOST, 1.0)
                    evidence["address_partial"] = True
            if extracted_fields.get("entity_type") and entity.get("entity_type"):
                if extracted_fields["entity_type"].lower() == entity["entity_type"].lower():
                    confidence = min(confidence + self.ENTITY_TYPE_BOOST, 1.0)
                    evidence["entity_type_match"] = True

            candidates.append({
                "entity_id": entity["id"],
                "canonical_name": canonical,
                "confidence": round(confidence, 2),
                "evidence": evidence,
            })

        candidates.sort(key=lambda c: c["confidence"], reverse=True)
        return candidates[:5]  # Top 5 candidates
```

**Step 4: Run test, verify pass**

**Step 5: Commit**

```bash
git add apps/api/src/services/entity_resolver.py apps/api/tests/services/test_entity_resolver.py
git commit -m "feat(api): add entity resolver service with 4-pass fuzzy matching"
```

---

## Task 4: Entity Import Service

**Files:**

- Create: `apps/api/src/services/entity_import.py`
- Test: `apps/api/tests/services/test_entity_import.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/services/test_entity_import.py
import pytest
from src.services.entity_import import EntityImportService
from src.schemas.entity import EntityImportRow

@pytest.fixture
def import_service():
    return EntityImportService()

def test_parse_csv_rows():
    rows = [
        {"Account Name": "Henderson Music", "Account Type": "Label", "City": "Los Angeles"},
        {"Account Name": "Summit Publishing", "Account Type": "Publisher", "City": "Nashville"},
    ]
    column_map = {
        "Account Name": "canonical_name",
        "Account Type": "entity_type",
        "City": "billing_city",
    }
    result = EntityImportService.map_rows(rows, column_map)
    assert len(result) == 2
    assert result[0].canonical_name == "Henderson Music"
    assert result[0].entity_type == "Label"

def test_auto_map_columns():
    headers = ["Account Name", "Type", "Legal Name", "Billing City", "State", "SF Account ID"]
    mapping = EntityImportService.auto_map_columns(headers)
    assert mapping["Account Name"] == "canonical_name"
    assert mapping["SF Account ID"] == "external_id"

def test_detect_duplicates():
    existing = [
        {"canonical_name": "Henderson Music Group", "id": "ent_1"},
    ]
    new_rows = [
        EntityImportRow(canonical_name="Henderson Music"),
        EntityImportRow(canonical_name="Totally New Corp"),
    ]
    dupes, clean = EntityImportService.detect_duplicates(new_rows, existing, threshold=0.80)
    assert len(dupes) == 1
    assert len(clean) == 1
    assert dupes[0]["source_name"] == "Henderson Music"
```

**Step 2: Run test to verify it fails**

**Step 3: Write minimal implementation**

```python
# apps/api/src/services/entity_import.py
"""Service for bulk importing entities from spreadsheets."""
from rapidfuzz import fuzz
from src.schemas.entity import EntityImportRow

# Fuzzy column name → Airlock field mapping
COLUMN_ALIASES = {
    "canonical_name": ["account name", "name", "company", "entity name", "canonical name"],
    "entity_type": ["type", "account type", "entity type", "category"],
    "legal_name": ["legal name", "legal entity", "full legal name"],
    "dba_name": ["dba", "dba name", "pka", "aka", "doing business as"],
    "billing_street": ["street", "address", "billing street", "billing address"],
    "billing_city": ["city", "billing city"],
    "billing_state": ["state", "billing state", "province", "state/province"],
    "billing_zip": ["zip", "postal code", "zip code", "billing zip"],
    "billing_country": ["country", "billing country"],
    "state_of_formation": ["state of formation", "incorporation state"],
    "type_of_company": ["company type", "type of company", "entity structure", "structure"],
    "external_id": ["sf account id", "salesforce id", "account id", "external id", "sf id"],
}


class EntityImportService:

    @staticmethod
    def auto_map_columns(headers: list[str]) -> dict[str, str]:
        """Auto-map spreadsheet column headers to Airlock field names."""
        mapping = {}
        for header in headers:
            header_lower = header.lower().strip()
            best_field = None
            best_score = 0
            for field, aliases in COLUMN_ALIASES.items():
                for alias in aliases:
                    score = fuzz.ratio(header_lower, alias)
                    if score > best_score and score >= 75:
                        best_score = score
                        best_field = field
            if best_field:
                mapping[header] = best_field
        return mapping

    @staticmethod
    def map_rows(rows: list[dict], column_map: dict[str, str]) -> list[EntityImportRow]:
        """Map raw spreadsheet rows to EntityImportRow using column mapping."""
        result = []
        for row in rows:
            mapped = {}
            for src_col, dest_field in column_map.items():
                if src_col in row and row[src_col]:
                    mapped[dest_field] = str(row[src_col]).strip()
            if "canonical_name" in mapped:
                result.append(EntityImportRow(**mapped))
        return result

    @staticmethod
    def detect_duplicates(
        new_rows: list[EntityImportRow],
        existing: list[dict],
        threshold: float = 0.85,
    ) -> tuple[list[dict], list[EntityImportRow]]:
        """Split import rows into duplicates (match existing) and clean (new)."""
        duplicates = []
        clean = []
        for row in new_rows:
            is_dupe = False
            for entity in existing:
                ratio = fuzz.ratio(
                    row.canonical_name.lower(),
                    entity["canonical_name"].lower(),
                )
                if ratio / 100 >= threshold:
                    duplicates.append({
                        "source_name": row.canonical_name,
                        "target_name": entity["canonical_name"],
                        "target_id": entity["id"],
                        "similarity": round(ratio / 100, 2),
                    })
                    is_dupe = True
                    break
            if not is_dupe:
                clean.append(row)
        return duplicates, clean
```

**Step 4: Run test, verify pass**

**Step 5: Commit**

```bash
git add apps/api/src/services/entity_import.py apps/api/tests/services/test_entity_import.py
git commit -m "feat(api): add entity import service with auto column mapping and dedup"
```

---

## Task 5: Wire Resolver into Preflight Engine

**Files:**

- Modify: `apps/api/src/engines/preflight/readiness.py` (lines 157-300)
- Test: `apps/api/tests/engines/test_entity_resolution_integration.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/engines/test_entity_resolution_integration.py
import pytest
from src.engines.preflight.readiness import build_entity_resolution

def test_build_entity_resolution_returns_candidates():
    """Entity resolution returns candidates when known entities exist."""
    result = build_entity_resolution(
        full_text="This Distribution Agreement between Henderson Music Group and Summit Publishing LLC...",
        workspace_id="ws_test",
    )
    # Should have entity_resolution key with checks
    assert "checks" in result
    assert any(c["check_code"] == "ENT_LEGAL_ENTITY" for c in result["checks"])
    assert any(c["check_code"] == "ENT_COUNTERPARTY" for c in result["checks"])
```

**Step 2: Run test to verify it fails**

**Step 3: Implement — replace `_run_salesforce_match()` stub**

In `readiness.py`, replace the stubbed `_run_salesforce_match()` with a call to `EntityResolverService.match()` that loads entities from the DB. Update `build_entity_resolution()` to use the resolver results for confidence scoring.

Key changes:

- Load known_entities + aliases for workspace from DB (or pass as param for testability)
- Call `EntityResolverService.match()` for each extracted party
- Map resolver candidates to the existing ENT\_\* check format
- Set confidence from resolver instead of hardcoded 0.45-0.50

**Step 4: Run test, verify pass**

**Step 5: Commit**

```bash
git add apps/api/src/engines/preflight/readiness.py apps/api/tests/engines/test_entity_resolution_integration.py
git commit -m "feat(api): wire entity resolver into preflight engine, replace SF stub"
```

---

## Task 6: API Routes for Entity Management

**Files:**

- Create: `apps/api/src/routes/entities.py`
- Test: `apps/api/tests/routes/test_entities.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/routes/test_entities.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_list_entities(client: AsyncClient):
    resp = await client.get("/api/v1/entities/", params={"workspace_id": "ws_test"})
    assert resp.status_code == 200
    assert "entities" in resp.json()

@pytest.mark.asyncio
async def test_create_entity(client: AsyncClient):
    resp = await client.post("/api/v1/entities/", json={
        "workspace_id": "ws_test",
        "canonical_name": "Test Entity",
        "entity_type": "Label",
        "source": "manual",
    })
    assert resp.status_code == 201

@pytest.mark.asyncio
async def test_import_entities(client: AsyncClient):
    resp = await client.post("/api/v1/entities/import", json={
        "workspace_id": "ws_test",
        "rows": [
            {"canonical_name": "Entity A", "entity_type": "Label"},
            {"canonical_name": "Entity B", "entity_type": "Publisher"},
        ],
    })
    assert resp.status_code == 200
    assert resp.json()["imported"] >= 1

@pytest.mark.asyncio
async def test_resolve_entity(client: AsyncClient):
    resp = await client.post("/api/v1/entities/resolve", json={
        "workspace_id": "ws_test",
        "extracted_name": "Test Entity",
        "party_role": "legal_entity",
    })
    assert resp.status_code == 200
    assert "candidates" in resp.json()

@pytest.mark.asyncio
async def test_confirm_resolution(client: AsyncClient):
    resp = await client.post("/api/v1/entities/resolve/confirm", json={
        "workspace_id": "ws_test",
        "vault_id": "vault_test",
        "entity_id": "ent_1",
        "extracted_name": "Test Entity",
        "party_role": "legal_entity",
        "create_alias": True,
    })
    assert resp.status_code == 200
```

**Step 2: Run test to verify it fails**

**Step 3: Write route handlers**

```python
# apps/api/src/routes/entities.py
"""API routes for entity management and resolution."""
from fastapi import APIRouter, Depends, HTTPException
from src.schemas.entity import (
    KnownEntityCreate, KnownEntityResponse,
    EntityResolutionResult, EntityImportResponse,
)
from src.services.entity_resolver import EntityResolverService
from src.services.entity_import import EntityImportService

router = APIRouter(prefix="/api/v1/entities", tags=["entities"])

@router.get("/")
async def list_entities(workspace_id: str):
    """List all known entities for a workspace."""
    # Service layer handles DB query
    pass

@router.post("/", status_code=201)
async def create_entity(body: KnownEntityCreate):
    """Create a new known entity."""
    pass

@router.post("/import")
async def import_entities(body: dict):
    """Bulk import entities from spreadsheet data."""
    pass

@router.post("/resolve")
async def resolve_entity(body: dict):
    """Resolve an extracted name against known entities."""
    pass

@router.post("/resolve/confirm")
async def confirm_resolution(body: dict):
    """Confirm a resolution, optionally creating an alias."""
    pass

@router.post("/{entity_id}/aliases")
async def add_alias(entity_id: str, body: dict):
    """Add an alias to an existing entity."""
    pass

@router.post("/merge")
async def merge_entities(body: dict):
    """Merge two or more entities into one."""
    pass
```

**Step 4: Run tests, verify pass**

**Step 5: Register router in main app, commit**

```bash
git add apps/api/src/routes/entities.py apps/api/tests/routes/test_entities.py
git commit -m "feat(api): add entity management and resolution API routes"
```

---

## Task 7: Entity Resolution Card (Frontend — Signal Panel)

**Files:**

- Create: `apps/web/src/components/organisms/EntityResolutionCard.tsx`
- Create: `apps/web/src/stores/entity-resolution.store.ts`
- Modify: Signal panel to include the card

**Step 1: Create Zustand store**

```typescript
// apps/web/src/stores/entity-resolution.store.ts
import { create } from "zustand";

interface EntityCandidate {
  entity_id: string;
  canonical_name: string;
  confidence: number;
  evidence: Record<string, unknown>;
}

interface EntityCard {
  extracted_name: string;
  party_role: "legal_entity" | "counterparty";
  resolution_state:
    | "auto_resolved"
    | "high_confidence"
    | "ambiguous"
    | "no_match"
    | "new";
  top_confidence: number | null;
  candidates: EntityCandidate[];
  confirmed_entity_id: string | null;
}

interface EntityResolutionStore {
  cards: EntityCard[];
  setCards: (cards: EntityCard[]) => void;
  confirmResolution: (index: number, entity_id: string) => void;
  flagAsNew: (index: number) => void;
}

export const useEntityResolutionStore = create<EntityResolutionStore>(
  (set) => ({
    cards: [],
    setCards: (cards) => set({ cards }),
    confirmResolution: (index, entity_id) =>
      set((state) => {
        const updated = [...state.cards];
        updated[index] = {
          ...updated[index],
          resolution_state: "auto_resolved",
          confirmed_entity_id: entity_id,
        };
        return { cards: updated };
      }),
    flagAsNew: (index) =>
      set((state) => {
        const updated = [...state.cards];
        updated[index] = { ...updated[index], resolution_state: "new" };
        return { cards: updated };
      }),
  }),
);
```

**Step 2: Build the EntityResolutionCard component**

See design spec in `docs/plans/2026-03-07-entity-resolver-design.md` Screen 1 for the exact layout.

Key implementation details:

- Use `'use client'` directive (uses hooks/state)
- Left border color changes by state (success/warning/danger/primary tokens)
- Evidence chips as molecule components
- Candidate list with radio-style selection
- "Confirm" / "Flag as New" / "Search" actions dispatch to store + API
- 280px max width (Signal panel constraint)

**Step 3: Commit**

```bash
git add apps/web/src/components/organisms/EntityResolutionCard.tsx apps/web/src/stores/entity-resolution.store.ts
git commit -m "feat(web): add EntityResolutionCard organism and entity resolution store"
```

---

## Task 8: Accounts Import Modal (Frontend)

**Files:**

- Create: `apps/web/src/components/organisms/AccountsImportModal.tsx`
- Create: `apps/web/src/components/molecules/ColumnMapper.tsx`
- Create: `apps/web/src/components/molecules/ImportStepper.tsx`

See design spec Screen 2 for the 3-step wizard layout.

Key implementation details:

- `'use client'` — file input, state management
- 3-step stepper (Upload → Map → Results)
- File parsing via Papa Parse (CSV) or SheetJS (Excel)
- Column auto-mapping calls `POST /api/v1/entities/import/map-columns`
- Import calls `POST /api/v1/entities/import`
- Duplicate preview before final import
- Modal uses `--z-modal` (400), `--surface-overlay` background

**Commit:**

```bash
git add apps/web/src/components/organisms/AccountsImportModal.tsx apps/web/src/components/molecules/ColumnMapper.tsx apps/web/src/components/molecules/ImportStepper.tsx
git commit -m "feat(web): add AccountsImportModal with 3-step import wizard"
```

---

## Task 9: CRM Entity Management (react-admin)

**Files:**

- Create: `apps/web/src/features/crm/resources/accounts/AccountList.tsx`
- Create: `apps/web/src/features/crm/resources/accounts/AccountDetail.tsx`
- Modify: `apps/web/src/features/crm/CrmApp.tsx` — register Accounts resource

See design spec Screen 3 for list and detail layouts.

Key implementation details:

- react-admin `<Resource>` with custom `<List>` and `<Show>` components
- List: Datagrid with search, filter by type/source, bulk actions (merge, delete)
- Detail: Tabbed layout — Details, Aliases, Resolution History, Linked Vaults
- "Import" button in list toolbar opens AccountsImportModal
- All styled with Airlock tokens (dark theme)

**Commit:**

```bash
git add apps/web/src/features/crm/resources/accounts/
git commit -m "feat(web): add CRM Accounts resource with list and detail views"
```

---

## Task 10: Seed Data — Known Entities for Demo

**Files:**

- Modify: `scripts/seeds/definitions/happy-path.yaml` — add known_entities
- Modify: `scripts/seeds/seed.py` — generate entity seed data

Add 10 known entities with aliases matching the existing vault seed data:

```yaml
known_entities:
  - canonical_name: "Henderson Music Group"
    entity_type: "Label"
    legal_name: "Henderson Music Group LLC"
    billing_city: "Los Angeles"
    billing_state: "CA"
    source: "spreadsheet_import"
    aliases: ["henderson music", "HMG", "Henderson Music Grp"]
  - canonical_name: "Nova Entertainment"
    entity_type: "Agency"
    # ... etc for all entities in happy-path vaults
```

**Commit:**

```bash
git add scripts/seeds/
git commit -m "feat(seeds): add known_entities and aliases to happy-path scenario"
```

---

## Execution Order Summary

| Task | Component              | Dependencies         | Parallelizable               |
| ---- | ---------------------- | -------------------- | ---------------------------- |
| 1    | DB Models              | None                 | Yes                          |
| 2    | Pydantic Schemas       | None                 | Yes (parallel with 1)        |
| 3    | Resolver Service       | None (unit testable) | Yes (parallel with 1,2)      |
| 4    | Import Service         | Task 2 (schemas)     | After 2                      |
| 5    | Wire into Preflight    | Tasks 1, 3           | After 1, 3                   |
| 6    | API Routes             | Tasks 1, 2, 3, 4     | After 1-4                    |
| 7    | Entity Resolution Card | Task 6 (API)         | After 6                      |
| 8    | Import Modal           | Task 6 (API)         | After 6 (parallel with 7)    |
| 9    | CRM Entity Mgmt        | Task 6 (API)         | After 6 (parallel with 7, 8) |
| 10   | Seed Data              | Task 1 (models)      | After 1                      |

**Parallel waves:**

- Wave 1: Tasks 1, 2, 3 (all independent)
- Wave 2: Tasks 4, 5, 10 (depend on Wave 1)
- Wave 3: Task 6 (depends on Wave 2)
- Wave 4: Tasks 7, 8, 9 (all parallel, depend on Wave 3)
