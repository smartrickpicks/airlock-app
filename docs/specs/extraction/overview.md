# Extraction Pipeline

> **Status:** SPECCED — document ingestion through field-level verification.

> **Key Insight:** Extraction is not a button — it is the primary data entry mechanism for Airlock. Every field value the system knows about a contract enters through this pipeline. The UI must make the pipeline *visible* at every stage so users trust the data they're acting on.

---

## What This Spec Covers

The full lifecycle of a document from raw upload through structured, human-verified field data. This is the foundation of every downstream feature: patches, gate checks, contract generation, CRM enrichment, and Otto's context window.

---

## Pipeline Stages

```
UPLOAD → QUEUE → OCR → CHUNKING → FIELD EXTRACTION → CONFIDENCE SCORING → SIGNAL → HUMAN VERIFICATION → COMMITTED
```

### Stage 1 — Upload

**Trigger:** User drops a file onto a vault's Orchestrate panel, or clicks "Upload Document."

**Accepted formats:** PDF, DOCX, XLSX, PPTX, TXT, MD, RTF, EPUB (per multi-format spec).

**What happens immediately:**
1. File lands in object storage (S3-compatible).
2. A `document` record is created in the database: `status = queued`.
3. An `extraction_job` record is created: `status = queued`, linked to the `document` and `vault`.
4. A BullMQ job is enqueued to the `extraction` queue.
5. An event is written to the vault's audit trail: `type = document_uploaded`.
6. The frontend updates the Signal panel immediately: "Document uploaded — extraction queued."

**Frontend contract:** The Orchestrate panel shows the uploaded file with a `queued` spinner badge. The Signal panel shows the upload event.

---

### Stage 2 — OCR

**Worker:** `extraction_worker.py` picks up the BullMQ job.

**Process:**
1. Download document from object storage.
2. Run OCR if the document is image-based (scanned PDF, TIFF, PNG).
   - Tool: `pytesseract` with `pdf2image` for scanned PDFs.
   - Tool: Direct text extraction via `pdfplumber` for native PDFs.
   - Tool: `python-docx` for DOCX.
3. Normalize encoding (UTF-8), strip metadata artifacts.
4. Update `extraction_job.status = ocr_complete`, store normalized text.

**What the frontend sees:** `status = processing` on the document badge. Signal panel event: "OCR complete — 14 pages extracted."

---

### Stage 3 — Chunking (Human-Level)

**Process:** The normalized text is split into semantic chunks that preserve document hierarchy:

| Chunk Type | Description | Example |
|---|---|---|
| `heading` | Section title | "ARTICLE 4 — ROYALTIES" |
| `paragraph` | Body paragraph | "Licensor shall pay..." |
| `list_item` | Numbered or bulleted item | "4.1 Base royalty rate..." |
| `table_row` | Row from a detected table | `["Q1", "12%", "$240,000"]` |
| `footnote` | Footer-level text | "* Subject to audit rights" |
| `signature_block` | Execution block text | "IN WITNESS WHEREOF..." |

**Key design principle:** Chunks carry their position in the document tree. A `paragraph` chunk knows it belongs to `ARTICLE 4 > Section 4.2`. This is what enables "document hierarchy preservation" — our moat over flat-text RAG.

**Output:** A `chunks` JSONB array on the `extraction_job` record. Each chunk has `{id, type, text, position, parent_heading, page_number, confidence}`.

---

### Stage 4 — Field Extraction

**Process:** The extraction engine maps document chunks to schema fields defined in the vault's extraction config.

**How extraction configs work:**
- Each vault type (e.g., Distribution Agreement, Recording Agreement) has an extraction config.
- The config defines **anchors** (text patterns that signal a field is nearby) and **synonyms** (alternate ways a field might be labeled).
- The extractor uses the 7 engine types from OrcestrateOS:

| Engine | What it extracts | Example |
|---|---|---|
| `text_extractor` | Free-form text fields | Counterparty name, territory description |
| `date_extractor` | Date values | Effective date, expiration date |
| `boolean_extractor` | Yes/no fields | Exclusivity flag, auto-renewal |
| `picklist_extractor` | Enumerated values | Contract type, governing law state |
| `pattern_extractor` | Regex-matched values | Dollar amounts, percentages, account numbers |
| `split_extractor` | Multi-value lists | Rights granted (print, digital, sync) |
| `dispatcher` | Selects the correct extractor per field | Routing logic |

**Output:** A `fields` JSONB array on the `extraction_job`. Each field has `{field_key, value, raw_text, chunk_id, extractor_used, confidence, alternatives}`.

---

### Stage 5 — Confidence Scoring

**Each extracted field gets a confidence score (0.0 – 1.0):**

| Score Range | Label | Color | UI Behavior |
|---|---|---|---|
| 0.85 – 1.0 | High | Green | Auto-accepted, shown in Signal with check |
| 0.65 – 0.84 | Medium | Yellow | Flagged for human review in Signal |
| 0.40 – 0.64 | Low | Orange | Flagged with source text shown |
| 0.00 – 0.39 | Very Low | Red | Requires manual entry, field left empty |

**Confidence is computed from:**
- Anchor match strength (exact vs fuzzy)
- Number of synonyms matched
- Extractor certainty (e.g., regex match = 1.0, LLM extraction = 0.6–0.9)
- Position weight (fields found in expected document sections score higher)
- Cross-field consistency (e.g., effective_date < expiration_date)

---

### Stage 6 — Signal Delivery

**When extraction is complete:**
1. `extraction_job.status = complete`.
2. A structured event is written to the vault audit trail: `type = extraction_complete`.
3. A WebSocket message is pushed to all vault subscribers: `{topic: "vault:{id}", event: "extraction_complete", payload: {field_count, high_confidence_count, needs_review_count}}`.
4. The Signal panel updates with the extraction summary card.
5. The GateDot for the current chamber recalculates.

**Signal panel extraction event card:**

```
[Extraction Complete]  ────────────────────────────────
  14 pages processed · 23 fields extracted
  ● 18 high confidence   ● 4 need review   ● 1 missing
  [Review Fields →]
```

---

### Stage 7 — Human Verification

**The Orchestrate panel becomes the field verification workspace.**

**Layout:** Fields are grouped by section (matching the document's chunk hierarchy). Each field row shows:

```
  EFFECTIVE DATE                    [High ●]
  January 15, 2026                  "entered into as of January 15, 2026"
  ──────────────────────────────────────────────────────
  ROYALTY RATE                      [Review ●]
  12%                               "base royalty... twelve percent (12%)"
  [Accept]  [Edit]  [Flag]
  ──────────────────────────────────────────────────────
  TERRITORY                         [Missing ●]
  [Enter value manually]
```

**Verification actions per field:**
- **Accept** — sets `field.verification_status = accepted`. Requires no confidence threshold.
- **Edit** — opens inline editor, user corrects value, saves as `manually_corrected`.
- **Flag** — marks field as `disputed`, triggers a task assignment to the responsible verifier.
- **Accept All High** — bulk accepts all `confidence >= 0.85` fields in one click.

**When all mandatory fields are verified or entered:**
- Gate for the current chamber (Discover) unlocks.
- Signal event: "All required fields verified — gate unlocked."

---

### Stage 8 — Committed State

**Committed field data is the source of truth for:**
- Patch workflow (patches propose changes to committed values)
- Contract generation (templates are populated from committed fields)
- Otto context (agent's knowledge of the contract comes from committed fields)
- CRM enrichment (counterparty names, deal values flow up to CRM objects)
- Gate checks (preflight rules evaluate committed field values)

**A committed field cannot be overwritten directly — only via a patch.**

---

## Database Schema

### `documents` table

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (ULID) | Primary key |
| `workspace_id` | TEXT (ULID) | RLS key |
| `vault_id` | TEXT (ULID) | FK to vaults |
| `filename` | TEXT | Original filename |
| `storage_key` | TEXT | Object storage path |
| `file_type` | TEXT | pdf, docx, xlsx, etc. |
| `page_count` | INTEGER | Filled after OCR |
| `status` | TEXT | queued, processing, ocr_complete, complete, failed |
| `metadata` | JSONB | File size, MIME type, upload source |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |
| `deleted_at` | TIMESTAMPTZ | Soft delete |

### `extraction_jobs` table

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (ULID) | Primary key |
| `workspace_id` | TEXT (ULID) | RLS key |
| `vault_id` | TEXT (ULID) | FK to vaults |
| `document_id` | TEXT (ULID) | FK to documents |
| `status` | TEXT | queued, ocr_running, chunking, extracting, scoring, complete, failed |
| `chunks` | JSONB | Array of `Chunk` objects (set after chunking) |
| `fields` | JSONB | Array of `ExtractedField` objects (set after extraction) |
| `field_summary` | JSONB | `{total, high_confidence, needs_review, missing}` |
| `error` | TEXT | Error message if failed |
| `started_at` | TIMESTAMPTZ | When worker picked up the job |
| `completed_at` | TIMESTAMPTZ | When all stages finished |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |
| `workspace_id` | TEXT (ULID) | |

### `extracted_fields` table

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (ULID) | Primary key |
| `workspace_id` | TEXT (ULID) | RLS key |
| `vault_id` | TEXT (ULID) | FK to vaults |
| `extraction_job_id` | TEXT (ULID) | FK to extraction_jobs |
| `field_key` | TEXT | Canonical field name (e.g., `OPP_EFFECTIVE_DATE`) |
| `value` | TEXT | Extracted or manually entered value |
| `raw_text` | TEXT | Source text from the document |
| `chunk_id` | TEXT | Which chunk this field came from |
| `extractor_used` | TEXT | Which engine extracted this field |
| `confidence` | FLOAT | 0.0 – 1.0 |
| `alternatives` | JSONB | Other candidate values considered |
| `verification_status` | TEXT | unverified, accepted, manually_corrected, disputed |
| `verified_by` | TEXT (ULID) | FK to users (NULL if auto-accepted) |
| `verified_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/vaults/{id}/documents` | Upload document, creates document + enqueues extraction |
| `GET` | `/api/v1/vaults/{id}/documents` | List documents for a vault |
| `GET` | `/api/v1/vaults/{id}/extraction` | Get latest extraction job + fields for a vault |
| `GET` | `/api/v1/extraction-jobs/{id}` | Get specific extraction job status |
| `PATCH` | `/api/v1/extracted-fields/{id}` | Verify, correct, or flag a field |
| `POST` | `/api/v1/extracted-fields/bulk-accept` | Accept all high-confidence fields for a vault |

---

## Frontend — Extraction Store

The `extraction.store.ts` already exists with mock fallback. It needs the following real API calls wired:

```typescript
// Current mock — replace with real:
fetchExtractions(vaultId) → GET /api/v1/vaults/{id}/extraction
verifyField(fieldId, action, value?) → PATCH /api/v1/extracted-fields/{id}
bulkAcceptHigh(vaultId) → POST /api/v1/extracted-fields/bulk-accept
uploadDocument(vaultId, file) → POST /api/v1/vaults/{id}/documents
```

**New state needed in store:**
- `uploadProgress: number` — 0–100 for file upload
- `processingStatus: 'idle' | 'queued' | 'ocr' | 'chunking' | 'extracting' | 'scoring' | 'complete' | 'failed'`
- `processingMessage: string` — human-readable status ("Extracting 23 fields...")
- `realtimeConnected: boolean` — whether the WebSocket subscription is active

---

## Frontend — Component Enhancements Needed

### 1. Document Upload Drop Zone (new)
**Where:** Orchestrate panel, Discover chamber view
**What:** Drag-and-drop zone + file picker. Shows upload progress bar. On completion, transitions to processing state.
**States to show:** idle → uploading (%) → queued → ocr → chunking → extracting → scoring → complete

### 2. Extraction Status Card (new, in Signal panel)
**Where:** Signal panel, appears as an event card when extraction completes
**What:** Shows field summary: `18 high ● 4 review ● 1 missing`. Has a "Review Fields →" CTA that focuses the Orchestrate panel on the field verification view.

### 3. Field Verification List (enhance existing)
**Where:** Orchestrate panel
**What:** Currently renders static mock data. Needs to:
- Show real-time processing status header while job is running
- Render confidence badges with correct colors (green/yellow/orange/red)
- Wire Accept / Edit / Flag actions to the store
- Show "Accept All High" bulk action button
- Show source text inline for medium/low confidence fields

### 4. GateDot — Live Gate State (enhance existing)
**Where:** Shell sidebar, Triptych header
**What:** GateDot must reflect real gate state computed from field verification status. Gate is `locked` (red) until all mandatory fields are verified. Gate transitions to `passing` (yellow) at 50%+ verified, `passed` (green) when all verified.

---

## Engines to Wire (from apps/api/src/engines/)

The 7 extractor files already exist. They need:
1. An `extraction_service.py` that orchestrates the pipeline (OCR → chunk → extract → score)
2. An `extraction_worker.py` that reads from BullMQ `extraction` queue and calls the service
3. A `/api/v1/vaults/{id}/documents` POST route that enqueues the job
4. A `/api/v1/vaults/{id}/extraction` GET route that returns the latest job + fields

---

## Demo Sequence (Show Don't Tell)

1. Drop a PDF contract onto the vault's Orchestrate panel
2. Upload progress bar fills → "Queued" badge appears
3. Signal panel shows: "OCR complete — 8 pages extracted"
4. Signal panel shows: "Extracting fields..." with a spinner
5. Extraction complete card appears: "22 fields extracted · 18 high · 3 review · 1 missing"
6. Orchestrate panel populates with all fields and confidence colors
7. User clicks "Accept All High" → 18 fields accepted in one click
8. User manually reviews the 3 medium-confidence fields, accepts 2, edits 1
9. User enters the 1 missing field manually
10. Gate turns green: "Discover gate passed — all required fields verified"
