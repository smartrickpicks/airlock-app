# Demo Readiness — Phased Build Plan (v2)

> **Purpose**: Copy-paste-ready build plan. Two tracks: **Track A** (broad seeded demo) and **Track B** (single-contract intake lab). Track B is the authoritative proof path. Build in order.
>
> **Current state**: Frontend has 87 components, 23 Zustand stores, 20 mock data files. Backend has 4 route groups (auth, vaults, events, engines), 3 services, 3 engines (extraction, preflight, generation), 3 DB migrations. `python-multipart` is installed. No PDF parsing library yet. No document/upload routes. No file storage layer.
>
> **Key shift from v1**: The first authoritative flow is **upload PDF → create vault → run engines**, not "generate contract → use metadata.generated_text." The generator is a secondary branch, not the starting proof path.

---

## Track A — Broad Seeded Demo (Background)

These tasks create the baseline environment. They can run in parallel with Track B.

### A1. Database + Seed Data

**Goal**: `docker compose up` gives a working database with realistic data.

**Files to create/modify**:
- `scripts/seeds/definitions/happy-path.yaml` — 7+ vaults across all 4 chambers, 3 users (builder/gatekeeper/owner), 1 workspace
- `scripts/seeds/generator.py` — Read YAML, output SQL using `Faker.seed(42)`
- `scripts/seeds/seed.sql` — Generated output (committed)
- `docker-compose.yml` — `volumes:` mount to auto-run seed.sql on first start

**Seed data must include**:
```
1 workspace: "Acme Records" (ws_acme)
3 users: Jane Builder (builder), Tom Gatekeeper (gatekeeper), Sarah Owner (owner)
7 vaults (matching existing mock-vaults.ts):
  - vault_001: Henderson MSA (discover/gate_triage)
  - vault_002: Warner Distribution Q2 (discover/gate_ingest)
  - vault_003: Summit Publishing License (discover/gate_triage)
  - vault_004: Sony-BigBooty Dist Agreement (build/gate_extract)
  - vault_005: Atlantic Sync License (build/gate_preflight)
  - vault_006: Universal Amendment #3 (review/gate_gatekeeper)
  - vault_007: BMG Catalog Transfer (ship/gate_export)
3+ documents: attach 1 PDF document record per vault in build+ chambers
Events: 3+ per vault (vault_created, document_uploaded, chamber_advanced)
VaultMembers: all 3 users on all 7 vaults with varying roles
```

**Validation**: `docker compose up -d postgres && psql -c "SELECT count(*) FROM vaults"` returns 7.

### A2. Dev Auth Shortcut

**Goal**: Click "Dev Login" → get JWT → land in app. No Google OAuth needed.

**What exists**: `POST /api/v1/auth/dev/login` in `apps/api/src/routes/auth.py`. Login page at `apps/web/src/app/login/page.tsx`.

**Files to modify**:
- `apps/web/src/app/login/page.tsx` — Add "Dev Login" button → calls dev/login → stores JWT in localStorage (`airlock_access_token`) → redirects to `/contracts`
- `apps/web/src/stores/auth.store.ts` — Ensure `hydrateFromToken()` reads JWT, populates user state

**Validation**: Click Dev Login → contracts triage page → `auth.store` has user info.

### A3. Wire Triage Board + Vault Detail to API

**Goal**: Triage board loads from API; vault detail opens in Triptych.

**What exists**:
- Triage view, vault store with API-first + mock fallback, vault list API
- Vault detail page + TriptychLayout + RecordInspector already implemented
- `apps/web/src/app/(shell)/(modules)/contracts/[vaultId]/layout.tsx` wraps in TriptychLayout

**Files to verify/fix**:
- `apps/web/src/app/(shell)/(modules)/contracts/triage/page.tsx` — Ensure `fetchVaults({ module_type: "contracts", vault_level: 4 })` on mount
- Vault detail layout should already wrap in TriptychLayout; verify

**Validation**: With API + seeded DB, triage shows 7 vaults in correct chamber columns. Click vault → Triptych loads.

### A4. Wire Activity Feed to Events API

**Goal**: Signal panel shows real events.

**Files to modify**:
- `apps/web/src/stores/event.store.ts` — Wire `fetchVaultEvents(vaultId)` → `GET /api/v1/events/vault/{vaultId}`, `fetchRecentEvents()` → `GET /api/v1/events/recent`
- `apps/web/src/components/organisms/SignalPanel.tsx` — Call `fetchVaultEvents(vaultId)` when vault selected

**Validation**: Open vault → Signal panel shows real events with timestamps.

---

## Track B — Intake Lab (Primary Proof Path)

This is the authoritative flow. Build in strict order.

### B1. Document Model + Storage Layer

**Goal**: Backend can receive, store, and retrieve uploaded files.

**Dependencies to add**:
- `apps/api/pyproject.toml` — Add `pypdf>=4.0` (PDF text extraction)
- Local file storage initially (configurable to S3 later)

**Files to create**:
- `apps/api/src/models/document.py` — SQLAlchemy model:
  ```
  id (TEXT ULID PK)
  vault_id (TEXT FK nullable, indexed) — links to vault once associated
  workspace_id (TEXT FK, indexed) — for RLS
  filename (STRING 500) — original filename
  file_format (STRING 20) — pdf, docx, txt, etc.
  file_size_bytes (INTEGER)
  storage_path (TEXT) — relative path to stored file
  document_type (STRING 50 nullable) — contract, amendment, nda, etc. (set later)
  status (STRING 20 default "uploaded") — uploaded, parsing, parsed, failed
  full_text (TEXT nullable) — extracted text content
  page_count (INTEGER nullable)
  metadata (JSONB default {})
  uploaded_by (TEXT nullable FK to users)
  created_at, updated_at, deleted_at (TIMESTAMPTZ)
  ```
- `apps/api/src/schemas/document.py` — Pydantic schemas:
  - `DocumentResponse` — all fields
  - `DocumentListResponse` — `{ documents[], total }`
  - `DocumentUploadResponse` — `{ document: DocumentResponse, parsed: bool }`
- `apps/api/src/migrations/versions/004_add_documents.py` — Alembic migration
- `apps/api/uploads/` — Directory for local file storage (gitignored)

**Validation**: Migration runs clean. Model imports without error.

### B2. Document Upload + Parse Route

**Goal**: `POST /api/v1/documents/upload` accepts a PDF, stores it, extracts text via pypdf, returns the document record.

**Files to create**:
- `apps/api/src/services/document.py` — Business logic:
  ```python
  async def upload_document(
      db: Session,
      file: UploadFile,
      workspace_id: str,
      vault_id: str | None = None,
      uploaded_by: str | None = None,
  ) -> Document:
      # 1. Generate ULID for document
      # 2. Save file to uploads/{workspace_id}/{document_id}/{filename}
      # 3. Create Document record with status="uploaded"
      # 4. Extract text via pypdf (sync — acceptable for single-file demo)
      # 5. Update Document: full_text, page_count, status="parsed"
      # 6. Create event: document_uploaded
      # 7. Return Document

  def get_document(db, document_id, workspace_id) -> Document | None
  def list_documents_for_vault(db, vault_id, workspace_id) -> list[Document]
  def get_document_text(db, document_id, workspace_id) -> str | None
  ```
- `apps/api/src/routes/documents.py` — Endpoints:
  ```
  POST /api/v1/documents/upload
    - Form data: file (UploadFile), vault_id (optional), document_type (optional)
    - Auth required
    - Returns: DocumentUploadResponse

  GET /api/v1/documents/{document_id}
    - Returns: DocumentResponse

  GET /api/v1/documents?vault_id={vault_id}
    - Returns: DocumentListResponse

  GET /api/v1/documents/{document_id}/text
    - Returns: { full_text: str, page_count: int }
  ```
- Register router in `apps/api/src/main.py` as `/api/v1/documents`

**Text extraction logic** (in service, not route):
```python
from pypdf import PdfReader
import io

def extract_text_from_pdf(file_bytes: bytes) -> tuple[str, int]:
    reader = PdfReader(io.BytesIO(file_bytes))
    pages = []
    for page in reader.pages:
        text = page.extract_text() or ""
        pages.append(text)
    full_text = "\n\n".join(pages)
    return full_text, len(reader.pages)
```

**Validation**: `curl -F "file=@contract.pdf" localhost:8000/api/v1/documents/upload` → returns document with `full_text` populated and `status: "parsed"`.

### B3. Intake Lab — Upload UI Component

**Goal**: Frontend has a drag-and-drop PDF upload zone that creates a document via the API.

**Files to create**:
- `apps/web/src/components/molecules/FileDropZone.tsx` — Drag-and-drop + click-to-browse component:
  - Accepts PDF files only (for now)
  - Shows upload progress
  - On success, returns the `DocumentResponse`
  - Styled with Tailwind tokens (dashed border, hover state)
  - `'use client'` directive

**Files to create/modify**:
- `apps/web/src/stores/intake.store.ts` — New Zustand store for intake flow:
  ```typescript
  interface IntakeState {
    document: Document | null;
    vault: Vault | null;
    preflightResult: PreflightResponse | null;
    extractionResult: Record<string, ExtractionField> | null;
    intakeStep: "upload" | "parsing" | "preflight" | "extraction" | "triage" | "done";
    isProcessing: boolean;
    error: string | null;

    uploadDocument: (file: File) => Promise<void>;
    runPreflight: () => Promise<void>;
    runExtraction: () => Promise<void>;
    createVaultFromDocument: (name: string) => Promise<void>;
    reset: () => void;
  }
  ```
- `apps/web/src/app/(shell)/(modules)/contracts/intake/page.tsx` — New page: the intake lab view
  - Step 1: FileDropZone → upload PDF
  - Step 2: Show parsing status → display extracted page count + doc_mode
  - Step 3: Run preflight → show gate color (RED/YELLOW/GREEN) + readiness scores
  - Step 4: Run extraction → show extracted fields in a summary table
  - Step 5: Name the vault + confirm → creates vault + links document
  - Step 6: Redirect to `/contracts/[vaultId]` (vault detail with Triptych)

**Validation**: Drag PDF onto drop zone → file uploads → text extracted → preflight runs → gate color shown → extraction runs → fields shown → create vault → redirected to vault detail.

### B4. Intake Pipeline — Vault + Document Linking

**Goal**: Creating a vault from an uploaded document links them and sets proper chamber/gate state.

**Backend changes**:
- `apps/api/src/services/vault.py` — Add `create_vault_from_document()`:
  ```python
  def create_vault_from_document(
      db: Session,
      workspace_id: str,
      document_id: str,
      name: str,
      creator_id: str | None = None,
      metadata: dict | None = None,
  ) -> Vault:
      # 1. Create level-4 vault (chamber=discover, gate=gate_ingest)
      # 2. Link document: UPDATE document SET vault_id = vault.id
      # 3. Create event: vault_created with payload { source: "document_upload", document_id }
      # 4. Return vault
  ```
- `apps/api/src/routes/vaults.py` — Add endpoint:
  ```
  POST /api/v1/vaults/from-document
    Body: { document_id, name, metadata? }
    Auth required
    Returns: VaultResponse
  ```

**Validation**: Upload doc → create vault from doc → `GET /api/v1/vaults/{id}` shows vault → `GET /api/v1/documents?vault_id={id}` shows linked document.

### B5. Chamber Rules Engine (Replace Generic Advance)

**Goal**: Replace the linear `advance_chamber()` with rule-based transitions that respect intake state.

**Context**: The current `advance_chamber()` in `apps/api/src/services/vault.py:166-186` is just index-based stepping. The specs define specific rules:

**Chamber transition rules**:

| Transition | Condition | Trigger |
|---|---|---|
| discover → build | Document uploaded AND parsed (status=parsed) | Hybrid: auto if preflight GREEN, manual button if YELLOW |
| build → review | Preflight complete AND extraction complete AND all entity resolutions confirmed | Explicit human submit (Builder clicks "Submit for Review") |
| review → ship | Gatekeeper approves (gate_gatekeeper pass) AND Owner approves (gate_owner pass) | Review/signature decision |

**Files to create/modify**:
- `apps/api/src/services/chamber_rules.py` — New service:
  ```python
  from enum import Enum

  class TransitionResult(Enum):
      ALLOWED = "allowed"
      BLOCKED = "blocked"
      AUTO = "auto"

  def check_discover_to_build(db, vault, workspace_id) -> tuple[TransitionResult, list[str]]:
      """Check if vault can move from discover to build.
      Returns (result, blocking_reasons).
      - ALLOWED: manual advance permitted
      - AUTO: should auto-advance (preflight GREEN, all conditions met)
      - BLOCKED: cannot advance yet (returns list of reasons)
      """
      reasons = []
      documents = list_documents_for_vault(db, vault.id, workspace_id)
      if not documents:
          reasons.append("No document uploaded")
      elif not any(d.status == "parsed" for d in documents):
          reasons.append("Document not yet parsed")

      if reasons:
          return TransitionResult.BLOCKED, reasons

      # Check if preflight was run and result stored
      preflight_result = vault.metadata.get("preflight_result")
      if not preflight_result:
          reasons.append("Preflight not yet run")
          return TransitionResult.BLOCKED, reasons

      gate_color = preflight_result.get("gate_color")
      if gate_color == "RED":
          reasons.append(f"Preflight gate is RED: {preflight_result.get('gate_reasons', [])}")
          return TransitionResult.BLOCKED, reasons
      elif gate_color == "GREEN":
          return TransitionResult.AUTO, []
      else:  # YELLOW
          return TransitionResult.ALLOWED, []

  def check_build_to_review(db, vault, workspace_id) -> tuple[TransitionResult, list[str]]:
      """Build → Review requires preflight + extraction + entity resolution."""
      reasons = []
      preflight = vault.metadata.get("preflight_result")
      extraction = vault.metadata.get("extraction_result")

      if not preflight:
          reasons.append("Preflight not complete")
      if not extraction:
          reasons.append("Extraction not complete")

      # Check entity resolution status
      entity_resolution = (preflight or {}).get("entity_resolution", {})
      unresolved = entity_resolution.get("unresolved_count", 0)
      if unresolved > 0:
          reasons.append(f"{unresolved} unresolved entities")

      if reasons:
          return TransitionResult.BLOCKED, reasons
      return TransitionResult.ALLOWED, []

  def check_review_to_ship(db, vault, workspace_id) -> tuple[TransitionResult, list[str]]:
      """Review → Ship requires gatekeeper + owner approval."""
      reasons = []
      approvals = vault.metadata.get("approvals", {})
      if not approvals.get("gatekeeper_approved"):
          reasons.append("Gatekeeper approval required")
      if not approvals.get("owner_approved"):
          reasons.append("Owner approval required")
      if reasons:
          return TransitionResult.BLOCKED, reasons
      return TransitionResult.ALLOWED, []
  ```

- `apps/api/src/services/vault.py` — Replace `advance_chamber()`:
  ```python
  def advance_chamber(db, vault, workspace_id) -> Vault:
      """Rule-based chamber advancement."""
      if vault.vault_level != 4:
          raise ValueError("Only item vaults (level 4) have chambers")

      checker = {
          "discover": check_discover_to_build,
          "build": check_build_to_review,
          "review": check_review_to_ship,
      }.get(vault.chamber)

      if checker is None:
          raise ValueError("Vault is already in the final chamber (ship)")

      result, reasons = checker(db, vault, workspace_id)
      if result == TransitionResult.BLOCKED:
          raise ValueError(f"Cannot advance: {'; '.join(reasons)}")

      # Advance
      current_idx = CHAMBER_ORDER[vault.chamber]
      next_chamber = VALID_CHAMBERS[current_idx + 1]
      vault.chamber = next_chamber
      vault.gate = GATES_BY_CHAMBER[next_chamber][0]
      db.commit()
      db.refresh(vault)
      return vault
  ```

- `apps/api/src/routes/vaults.py` — Add transition-check endpoint:
  ```
  GET /api/v1/vaults/{vault_id}/transition-check
    Returns: { can_advance: bool, result: "allowed"|"blocked"|"auto", reasons: str[] }
  ```
  The frontend calls this to show/hide the advance button and display blocking reasons.

**Frontend changes**:
- `apps/web/src/app/(shell)/(modules)/contracts/[vaultId]/page.tsx` — Replace simple "Advance Chamber" button with rule-aware UI:
  - Call `GET /api/v1/vaults/{vaultId}/transition-check` on mount
  - If `blocked`: show grayed button with tooltip listing reasons
  - If `allowed`: show active "Submit for Review" / "Advance" button (label varies by chamber)
  - If `auto`: show badge "Auto-advancing..." and poll for completion

**Validation**: Upload PDF → vault in discover → transition-check returns "blocked" (no preflight yet) → run preflight → transition-check returns "auto" or "allowed" → advance works.

### B6. Intake-to-Engine Pipeline

**Goal**: After uploading a document, run preflight and extraction against the real parsed text and store results on the vault.

**Backend changes**:
- `apps/api/src/routes/vaults.py` — Add two convenience endpoints:
  ```
  POST /api/v1/vaults/{vault_id}/run-preflight
    - Reads document.full_text for the vault's linked document
    - Splits into pages (~3000 chars each)
    - Calls run_preflight(pages_data)
    - Stores result in vault.metadata["preflight_result"]
    - Updates vault.health_score from result
    - Creates event: preflight_complete
    - Returns: PreflightResponse

  POST /api/v1/vaults/{vault_id}/run-extraction
    - Reads document.full_text for the vault's linked document
    - Calls run_extraction(full_text)
    - Stores result in vault.metadata["extraction_result"]
    - Creates event: extraction_complete
    - Returns: ExtractionResponse
  ```

**Frontend changes**:
- `apps/web/src/stores/intake.store.ts` — Wire `runPreflight()` and `runExtraction()` to the new vault endpoints
- `apps/web/src/stores/extraction.store.ts` — Update `fetchExtraction(vaultId)`:
  1. Try `GET /api/v1/vaults/{vaultId}` and check `metadata.extraction_result`
  2. If present, use it directly
  3. If not, fall back to mock data
- `apps/web/src/components/organisms/RecordInspector.tsx` — Ensure it renders the API extraction format (dict keyed by check_code → `{ field_key, value, confidence, status, reason }`)

**Validation**: Upload PDF → create vault → run-preflight → health score updates → run-extraction → Record Inspector shows real extracted fields.

### B7. Intake Lab Polish — Triage + Documents Update

**Goal**: After intake, the vault appears correctly on the triage board, and the document shows in the Documents module.

**Frontend changes**:
- `apps/web/src/stores/documents.store.ts` — Wire `fetchDocuments()` to `GET /api/v1/documents?vault_id=...` (per-vault) or workspace-level
- `apps/web/src/components/organisms/DocumentsTable.tsx` — Ensure it renders API response shape
- `apps/web/src/components/molecules/VaultItem.tsx` — Show health_score with color coding + gate badge (RED/YELLOW/GREEN)
- Triage board should show the new vault in the correct chamber with the health score badge

**Events that fire during intake (for audit trail)**:
1. `document_uploaded` — when file is stored
2. `vault_created` — when vault is created from document
3. `preflight_complete` — when preflight finishes
4. `extraction_complete` — when extraction finishes
5. `chamber_advanced` — if auto-advance triggers (GREEN gate)

**Validation**: Complete intake → triage board shows vault with health score → click vault → Signal panel shows all 5 events → Documents table shows linked PDF.

---

## Track C — Secondary Flows (After Track B)

### C1. Contract Generator (Wiring)

**Goal**: Generator creates contracts via API. Secondary to intake.

**What exists**: Generator page, store, `POST /api/v1/engines/generation/run` with 12 contract types.

**Files to modify**:
- `apps/web/src/stores/generator.store.ts` — Wire `generate()` to `POST /api/v1/engines/generation/run`
- Generator page — Add "Create Vault" button that creates vault with generated text stored as a document (not metadata)

**Key difference from v1**: Instead of `vault.metadata.generated_text`, create a real document record with `file_format: "txt"`, `full_text: generated_text`, `status: "parsed"`. This makes generated contracts go through the same pipeline as uploaded PDFs.

**Validation**: Generate contract → create vault → vault appears in triage → same engine pipeline works.

### C2. Review Queue (Full Shape)

**Goal**: Review queue shows the entity-card / handoff / feed shape that `review-queue.store.ts` expects.

**Problem**: The store expects `{ parentVaults: ParentVaultCard[], signals: HandoffSignal[], feedItems: FeedItem[] }` from `GET /api/v1/contracts/review-queue`. A raw vault list won't satisfy this.

**Backend — new aggregation endpoint**:
- `apps/api/src/routes/review_queue.py` — New router:
  ```
  GET /api/v1/contracts/review-queue
    - Fetches all vaults in review chamber
    - Groups by parent_vault_id (level 1-3 ancestors)
    - Computes per-parent stats: vault count, health scores, builder assignments
    - Collects handoff signals from events (patches, RFIs, corrections, anomalies)
    - Collects recent feed items from events table
    - Returns: { parentVaults: [], signals: [], feedItems: [] }
  ```
- `apps/api/src/services/review_queue.py` — Business logic for aggregation

**Frontend**: `review-queue.store.ts` already calls the right endpoint. Just needs the backend to return the right shape.

**Validation**: Advance vaults to review → review queue shows entity cards with children, handoff signals, activity feed.

### C3. Patch Workflow (Basic)

**Goal**: Create/submit/approve patches on vaults in review.

**Backend files to create**:
- `apps/api/src/models/patch.py` — Patch model:
  ```
  id, vault_id, workspace_id, field_key, old_value, new_value,
  status (draft|submitted|verifier_approved|admin_approved|applied|rejected|needs_clarification),
  submitted_by, reviewed_by, version (int, optimistic lock),
  evidence (JSONB: { when, then, because }),
  history (JSONB[]: append-only state transition log),
  created_at, updated_at, deleted_at, metadata
  ```
- `apps/api/src/schemas/patch.py` — Pydantic schemas
- `apps/api/src/services/patch.py` — Business logic:
  - `create_patch()`, `submit_patch()`, `approve_patch()`, `reject_patch()`
  - Self-approval check: `if actor_id == patch.submitted_by: raise ValueError`
  - Optimistic lock: `if patch.version != expected_version: raise ValueError`
- `apps/api/src/routes/patches.py` — REST endpoints
- `apps/api/src/migrations/versions/005_add_patches.py` — Migration
- Register in `main.py`

**Frontend wiring**:
- `apps/web/src/stores/patch.store.ts` — Wire to API
- Patch editor loads extraction results, allows field edits, submits as patch

**Validation**: Open vault in review → edit field → submit patch → approve (different user) → field updates.

---

## What NOT to Build

1. **S3/cloud storage** — Local file storage is fine for demo
2. **WebSocket real-time** — Polling/manual refresh is fine
3. **Batch processing** — Single vault operations only
4. **CRM, Tasks, Calendar modules** — Mock data is fine
5. **Google OAuth** — Dev login is sufficient
6. **OpenAPI codegen** — Manual types in stores are fine
7. **Workflow engine / automation** — Manual operations only
8. **Search / Cmd+K** — Not needed
9. **Notifications** — Not needed
10. **DOCX/XLSX/other formats** — PDF only for initial intake lab
11. **TipTap editor integration** — Not needed for intake proof
12. **PDF.js viewer with annotations** — Not needed for intake proof (show extracted text instead)

---

## Demo Script (After All Tracks)

### Primary flow (Track B — the thing you're proving):

1. **Login**: Dev Login → land on contracts triage
2. **Upload**: Navigate to `/contracts/intake` → drag PDF onto drop zone
3. **Parse**: Watch status change: uploading → parsing → parsed (page count shown)
4. **Preflight**: Click "Run Preflight" → gate color appears (GREEN/YELLOW/RED) + readiness scores
5. **Extraction**: Click "Run Extraction" → fields appear with confidence badges
6. **Create Vault**: Name it → vault created in discover chamber
7. **Auto-advance** (if GREEN): Vault moves to build automatically
8. **Manual advance** (if YELLOW): Click "Advance" → vault moves to build
9. **Submit for Review**: In build chamber, click "Submit for Review" → vault moves to review
10. **Review**: Switch to Gatekeeper account → open review queue → see vault → approve
11. **Activity trail**: Signal panel shows full audit: upload → parse → preflight → extraction → chamber advances

### Secondary flow (Track A — the broad demo):

12. **Triage overview**: Show seeded vaults across all chambers
13. **Vault detail**: Click any vault → Triptych with Record Inspector
14. **Generator**: `/contracts/generator` → generate Distribution contract → create vault
15. **Documents**: Documents module shows all uploaded files

---

## File Count Summary

| Track | New Files | Modified Files | Backend | Frontend |
|-------|-----------|----------------|---------|----------|
| A (seed + auth + wire) | 4 | 5 | 0 new | 5 mod |
| B1-B2 (doc model + upload) | 5 | 2 | 5 new | 0 |
| B3-B4 (upload UI + linking) | 3 | 1 | 1 new | 3 new |
| B5 (chamber rules) | 1 | 2 | 1 new, 2 mod | 1 mod |
| B6-B7 (engine pipeline + polish) | 0 | 5 | 2 mod | 3 mod |
| C1 (generator) | 0 | 2 | 0 | 2 mod |
| C2 (review queue) | 2 | 0 | 2 new | 0 |
| C3 (patches) | 5 | 2 | 5 new | 2 mod |

**Total**: ~20 new files, ~19 modifications. Track B is the critical path.

---

## Conventions Reminder

- **Terms**: Vault, Module, Chamber, Gate, View, Triptych, Signal/Orchestrate/Control. NEVER say "channel", "workstream", "phase", or "stage".
- **App Router only**: No `getServerSideProps`, no Pages Router patterns.
- **Business logic in services**: Routes are thin HTTP wrappers. `apps/api/src/services/` has all logic.
- **Tailwind tokens only**: No raw color values. Use classes from `src/styles/tokens.css`.
- **Commit format**: `feat(api): add document upload route` — conventional commits with scope.
- **Scopes**: web, api, shared-types, docs, contracts, crm, tasks, calendar, documents, admin, ci, docker, deps.
- **Soft deletes**: Use `deleted_at` timestamp, never hard delete.
- **ULIDs**: All primary keys are TEXT type, generated in application.
- **JSONB metadata**: Use for flexible schema on vaults, documents.
- **Events are append-only**: Never UPDATE or DELETE events.
