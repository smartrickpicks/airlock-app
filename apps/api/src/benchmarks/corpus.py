# apps/api/src/benchmarks/corpus.py
"""ConstellationBench query corpus — 30 benchmark queries across 4 council types."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class BenchmarkQuery:
    """A single benchmark query with evaluation metadata."""

    id: str
    command: str  # discover, build, ship, audit
    query: str  # The actual question
    briefing: str  # Context provided to the council
    expected_themes: list[str]  # Key themes a good response should touch
    difficulty: str  # "easy", "medium", "hard"


# ── Query Corpus ────────────────────────────────────────────────
# 30 queries: 8 discover, 8 build, 7 ship, 7 audit
CORPUS: list[BenchmarkQuery] = [
    # ── DISCOVER (Scholar leads) ────────────────────────────────
    BenchmarkQuery(
        id="disc-01",
        command="discover",
        query="What authentication patterns should we evaluate for multi-tenant SaaS with BYOK (bring your own key) support?",
        briefing="Enterprise data ops platform with JWT + Google OAuth. Three role layers: Org, Module, Agentic. PostgreSQL with RLS via workspace_id. Currently single-tenant dev mode.",
        expected_themes=["RBAC", "tenant isolation", "key management", "OAuth scopes", "RLS"],
        difficulty="medium",
    ),
    BenchmarkQuery(
        id="disc-02",
        command="discover",
        query="How should we design a real-time collaboration layer for contract document editing with conflict resolution?",
        briefing="Contract lifecycle platform with vault-based hierarchy. Documents flow through 4 chambers: Discover > Build > Review > Ship. Multiple roles can edit simultaneously.",
        expected_themes=["CRDT", "OT", "WebSocket", "conflict resolution", "version control"],
        difficulty="hard",
    ),
    BenchmarkQuery(
        id="disc-03",
        command="discover",
        query="What are the tradeoffs between embedding-based and keyword-based search for contract clause retrieval?",
        briefing="172 clause templates in a clause library. Users search by intent ('indemnification for IP infringement') not exact keywords. MeiliSearch currently configured.",
        expected_themes=["semantic search", "BM25", "hybrid", "latency", "relevance"],
        difficulty="easy",
    ),
    BenchmarkQuery(
        id="disc-04",
        command="discover",
        query="What pricing models work for AI-augmented enterprise platforms with variable LLM costs?",
        briefing="Platform uses LiteLLM with OpenRouter. Model tiers: Opus ($15/1k in), Sonnet ($3/1k in), Haiku ($0.80/1k in). Users trigger LLM calls via Otto agent chat and playbook DAG execution.",
        expected_themes=["usage-based", "credits", "seat-based", "cost passthrough", "margin"],
        difficulty="medium",
    ),
    BenchmarkQuery(
        id="disc-05",
        command="discover",
        query="What are the most effective approaches to entity resolution in CRM data where the same company appears under multiple names?",
        briefing="CRM module uses vault hierarchy as its data model. Companies entered by multiple users with variations: 'Sony Music', 'Sony Music Entertainment', 'SME'. No separate CRM tables.",
        expected_themes=[
            "fuzzy matching",
            "Levenshtein",
            "ML dedup",
            "canonical names",
            "merge workflows",
        ],
        difficulty="medium",
    ),
    BenchmarkQuery(
        id="disc-06",
        command="discover",
        query="How do modern contract lifecycle management platforms handle obligation tracking and compliance monitoring?",
        briefing="Contracts have extracted fields with confidence scores, gate checkpoints, and SLA timers. Events are append-only. Vaults track lifecycle state.",
        expected_themes=[
            "obligation extraction",
            "deadline tracking",
            "compliance alerts",
            "audit trail",
            "risk scoring",
        ],
        difficulty="easy",
    ),
    BenchmarkQuery(
        id="disc-07",
        command="discover",
        query="What patterns exist for AI agent tool authorization in multi-agent systems where different agents have different permission levels?",
        briefing="Otto agent has 4 agent types (vault, recipe, conductor, general) with a tool auth matrix. Some tools require 'builder' role, others 'conductor'. Tools are gated per agent type AND user role.",
        expected_themes=[
            "capability-based security",
            "tool auth matrix",
            "least privilege",
            "role mapping",
            "audit logging",
        ],
        difficulty="hard",
    ),
    BenchmarkQuery(
        id="disc-08",
        command="discover",
        query="What are the state of the art approaches for evaluating persona consistency in LLM-based agent systems?",
        briefing="PI behavioral framework with 17 personas defined by DECF drives (Dominance, Extraversion, Conscientiousness/Patience, Formality). Each persona has quantified drive scores 0-10. Council system dispatches 4-5 personas per query.",
        expected_themes=[
            "persona evaluation",
            "behavioral consistency",
            "psychometric benchmarks",
            "adversarial probing",
            "drift measurement",
        ],
        difficulty="hard",
    ),
    # ── BUILD (Maverick leads) ──────────────────────────────────
    BenchmarkQuery(
        id="build-01",
        command="build",
        query="Design a notification system that aggregates events from 5 modules into a unified feed with per-user preferences.",
        briefing="5 modules: Contracts, CRM, Triage, Calendar, Documents. Events are append-only with event_type field. Users have org-level and module-level roles. Need toast, badge, and notification center.",
        expected_themes=[
            "event aggregation",
            "user preferences",
            "delivery channels",
            "batching",
            "priority levels",
        ],
        difficulty="medium",
    ),
    BenchmarkQuery(
        id="build-02",
        command="build",
        query="How should we implement a command palette (Cmd+K) that searches across all 5 modules, recent vaults, and available actions?",
        briefing="Next.js 14 App Router. Zustand stores per module. Mock data in src/lib/mock-*.ts. 5 modules with different entity types. Actions include navigation, vault creation, and Otto commands.",
        expected_themes=[
            "fuzzy search",
            "action registry",
            "keyboard navigation",
            "recent items",
            "scoped results",
        ],
        difficulty="easy",
    ),
    BenchmarkQuery(
        id="build-03",
        command="build",
        query="Design the playbook DAG execution engine that orchestrates multi-step contract workflows with human-in-the-loop approval gates.",
        briefing="DAG nodes have actor types: otto (AI), human, hybrid. Nodes have dependencies. Gates are checkpoints requiring human approval before proceeding. Chambers define lifecycle stage.",
        expected_themes=[
            "DAG topology",
            "dependency resolution",
            "gate approval",
            "rollback",
            "parallel execution",
        ],
        difficulty="hard",
    ),
    BenchmarkQuery(
        id="build-04",
        command="build",
        query="Design a meeting intelligence pipeline that captures, transcribes, and extracts action items from video calls.",
        briefing="Jitsi Docker sidecar for video. Post-call pipeline needs: transcription, speaker diarization, action item extraction, vault linkage. Results feed into Triage module as tasks.",
        expected_themes=[
            "transcription pipeline",
            "speaker ID",
            "NER",
            "action extraction",
            "async processing",
        ],
        difficulty="hard",
    ),
    BenchmarkQuery(
        id="build-05",
        command="build",
        query="How should we implement a messenger/chat system with vault-scoped threads, DMs, and team channels?",
        briefing="Discord-like interface. Dock tool (340px drawer). Messages need: threading, reactions, file attachments, @mentions, vault context linking. WebSocket for real-time.",
        expected_themes=[
            "message schema",
            "threading model",
            "presence",
            "WebSocket",
            "file handling",
        ],
        difficulty="medium",
    ),
    BenchmarkQuery(
        id="build-06",
        command="build",
        query="Design a workflow builder UI using React Flow that lets users visually compose playbook DAGs.",
        briefing="Playbook DAGs define multi-step contract workflows. Nodes are tasks with actor types. Edges represent dependencies. Users should drag-and-drop nodes, connect edges, and set gate conditions.",
        expected_themes=[
            "React Flow",
            "node types",
            "edge validation",
            "serialization",
            "undo/redo",
        ],
        difficulty="medium",
    ),
    BenchmarkQuery(
        id="build-07",
        command="build",
        query="Design a generative UI system where the AI agent can emit interactive UI components inline with chat messages.",
        briefing="Otto agent chat interface in Control panel. Agent should emit rich components: gate status cards, vault context panels, approval buttons, data tables. Not just text.",
        expected_themes=[
            "component registry",
            "serialization",
            "security sandbox",
            "state management",
            "streaming",
        ],
        difficulty="hard",
    ),
    BenchmarkQuery(
        id="build-08",
        command="build",
        query="How should we implement progressive onboarding that adapts based on user role and workspace maturity?",
        briefing="3 roles: Builder, Gatekeeper, Owner. Workspace can be empty (cold start) or populated. Onboarding should guide users through their first vault, first extraction, first approval.",
        expected_themes=[
            "role-based flows",
            "progressive disclosure",
            "state machine",
            "completion tracking",
            "skip logic",
        ],
        difficulty="easy",
    ),
    # ── SHIP (Guardian leads) ───────────────────────────────────
    BenchmarkQuery(
        id="ship-01",
        command="ship",
        query="Is the authentication system ready for multi-tenant production with real user data?",
        briefing="JWT + Google OAuth. RLS via workspace_id. Soft deletes. Dev login bypass exists. No rate limiting yet. CORS configured for localhost + brainbrigade.xyz.",
        expected_themes=[
            "rate limiting",
            "token rotation",
            "RLS audit",
            "dev bypass removal",
            "CORS hardening",
        ],
        difficulty="medium",
    ),
    BenchmarkQuery(
        id="ship-02",
        command="ship",
        query="Are the database migrations reversible and safe for a zero-downtime deployment?",
        briefing="Alembic migrations. PostgreSQL 16. ULID primary keys. JSONB metadata. Soft deletes. No production database yet — all dev.",
        expected_themes=[
            "rollback safety",
            "data migration",
            "schema compatibility",
            "blue-green",
            "migration testing",
        ],
        difficulty="easy",
    ),
    BenchmarkQuery(
        id="ship-03",
        command="ship",
        query="Is the LLM integration cost-controlled enough for production with unpredictable usage patterns?",
        briefing="LiteLLM gateway. OpenRouter fallback. 3 model tiers (Opus/Sonnet/Haiku). No per-user spend caps. No circuit breaker on LLM costs. Feature flag for billing exists but is false.",
        expected_themes=[
            "spend caps",
            "circuit breaker",
            "usage tracking",
            "rate limiting",
            "cost alerts",
        ],
        difficulty="medium",
    ),
    BenchmarkQuery(
        id="ship-04",
        command="ship",
        query="Does the event storage system handle the append-only guarantee and can it scale to millions of events?",
        briefing="Events table is append-only (no UPDATE/DELETE). JSONB payload. workspace_id for RLS. No partitioning yet. No archival strategy.",
        expected_themes=[
            "table partitioning",
            "archival",
            "index strategy",
            "query performance",
            "immutability enforcement",
        ],
        difficulty="medium",
    ),
    BenchmarkQuery(
        id="ship-05",
        command="ship",
        query="Is the file upload system secure against malicious file uploads and does it handle large contracts?",
        briefing="uploads_dir configured in settings. No file type validation visible. No virus scanning. No size limits in config. PDF contracts can be 100+ pages.",
        expected_themes=[
            "file validation",
            "virus scanning",
            "size limits",
            "storage backend",
            "content-type verification",
        ],
        difficulty="easy",
    ),
    BenchmarkQuery(
        id="ship-06",
        command="ship",
        query="Are the API routes properly secured with authentication, authorization, and input validation?",
        briefing="FastAPI with Pydantic validation. JWT middleware. Role-based access (org, module, agentic). Some routes may lack auth decorators. CORS configured.",
        expected_themes=[
            "auth coverage",
            "input validation",
            "IDOR prevention",
            "rate limiting",
            "error handling",
        ],
        difficulty="medium",
    ),
    BenchmarkQuery(
        id="ship-07",
        command="ship",
        query="Is the WebSocket implementation resilient to connection drops, reconnection storms, and unauthorized access?",
        briefing="WebSocket for real-time updates. Redis Pub/Sub backend planned. No implementation yet — evaluating readiness of the design.",
        expected_themes=[
            "reconnection backoff",
            "auth on connect",
            "heartbeat",
            "topic authorization",
            "connection limits",
        ],
        difficulty="hard",
    ),
    # ── AUDIT (Guardian leads) ──────────────────────────────────
    BenchmarkQuery(
        id="audit-01",
        command="audit",
        query="Audit the consistency of vocabulary usage across all repos — are we using Vault/Chamber/Gate/View consistently or leaking old terminology?",
        briefing="Canonical terms: Vault (not channel), Chamber (not phase/stage), Gate (not checkpoint), View (not screen), Triptych (not three-panel). 8 repos in the constellation.",
        expected_themes=[
            "terminology audit",
            "grep patterns",
            "documentation consistency",
            "code comments",
            "UI copy",
        ],
        difficulty="easy",
    ),
    BenchmarkQuery(
        id="audit-02",
        command="audit",
        query="Audit the persona profiles for internal consistency — do the DECF drive scores align with the described strengths, cautions, and anti-patterns?",
        briefing="17 PI profiles with D/E/C/F scores (0-10). Each has strengths, cautions, core_needs, weak_points, anti_patterns. Drives should predict behavior described in text.",
        expected_themes=[
            "drive-behavior alignment",
            "contradictions",
            "score calibration",
            "profile completeness",
            "cross-profile overlap",
        ],
        difficulty="hard",
    ),
    BenchmarkQuery(
        id="audit-03",
        command="audit",
        query="Audit the MCP server constellation for security — are read/write permissions correctly enforced across all 7 servers?",
        briefing="7 MCP servers: docs (read), config (read), skills (read), playbooks (read), persona (read+write), coordination (read+write), gen-ui (read+write). airlock-app is consumer only.",
        expected_themes=[
            "permission enforcement",
            "write protection",
            "access audit",
            "credential isolation",
            "attack surface",
        ],
        difficulty="medium",
    ),
    BenchmarkQuery(
        id="audit-04",
        command="audit",
        query="Audit the mock data for completeness — does it cover all 4 chambers, all 3 roles, all 5 modules, and edge cases?",
        briefing="20 mock data files in apps/web/src/lib/mock-*.ts. Should cover: Discover/Build/Review/Ship chambers, Builder/Gatekeeper/Owner roles, Contracts/CRM/Triage/Calendar/Documents modules.",
        expected_themes=[
            "coverage gaps",
            "role representation",
            "chamber coverage",
            "edge cases",
            "data realism",
        ],
        difficulty="easy",
    ),
    BenchmarkQuery(
        id="audit-05",
        command="audit",
        query="Audit the State Service API for consistency — are all endpoints using the same patterns for error handling, validation, and response formats?",
        briefing="FastAPI State Service on port 8100. ~20 endpoints across persona, coordination, and constellation domains. Pydantic request models. JSON responses.",
        expected_themes=[
            "error format consistency",
            "validation patterns",
            "response envelope",
            "HTTP status codes",
            "endpoint naming",
        ],
        difficulty="medium",
    ),
    BenchmarkQuery(
        id="audit-06",
        command="audit",
        query="Audit the git hygiene across all repos — are there leaked secrets, PII, large binaries, or inconsistent .gitignore patterns?",
        briefing="8 repos. Prior PII remediation commits visible in history. .gitignore patterns vary per repo. Some repos have uploads/ or internal/ directories.",
        expected_themes=[
            "secret scanning",
            "PII detection",
            "binary files",
            "gitignore gaps",
            "history cleanup",
        ],
        difficulty="medium",
    ),
    BenchmarkQuery(
        id="audit-07",
        command="audit",
        query="Audit the component registry for accuracy — does components.json reflect all components that actually exist in the codebase?",
        briefing="Registry at airlock-docs/registry/components.json with 110+ entries. Components in apps/web/src/components/ across atoms/molecules/organisms/templates/views levels.",
        expected_themes=[
            "registry accuracy",
            "orphaned entries",
            "missing components",
            "level classification",
            "naming consistency",
        ],
        difficulty="easy",
    ),
]


def get_queries_by_command(command: str) -> list[BenchmarkQuery]:
    """Filter corpus to a specific command type."""
    return [q for q in CORPUS if q.command == command]


def get_queries_by_difficulty(difficulty: str) -> list[BenchmarkQuery]:
    """Filter corpus by difficulty level."""
    return [q for q in CORPUS if q.difficulty == difficulty]
