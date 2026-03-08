# Otto Agent Graph — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Otto's flat single-agent architecture with a PydanticAI Graph-based agent graph featuring deterministic routing, four specialized sub-agents, a three-tier execution model (deterministic → local LLM → cloud LLM), and two frontend surfaces (Task Runner + Messenger).

**Architecture:** PydanticAI Graph typed state machine. A shared `OttoState` dataclass flows through an `ExecutionRouter` (pre-LLM, cost optimization) → `OttoRouter` node (deterministic dispatch) → specialized sub-agent nodes (`RecipeAgent`, `VaultAgent`, `GeneralAgent`, `ConductorAgent`). Each tier and sub-agent is feature-flagged at the workspace level.

**Tech Stack:** PydanticAI Graph API, FastAPI (async), PostgreSQL 16, Redis 7 (session cache), SSE streaming (Vercel AI SDK wire format), Zustand (frontend state), Ollama (optional local LLM tier)

---

## Vocabulary

| Term             | Meaning                                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Triage**       | Project management module (replaces "Tasks")                                                                                |
| **Dispatch**     | Homepage — Signal-dominant work surface                                                                                     |
| **Signal panel** | Left panel of Triptych; aggregates Module Signals on Dispatch, transforms to Task Runner + collapsed signals on vault entry |
| **Task Runner**  | Otto surface at top of Signal panel (Context Bar + Gate Action Area) when a vault + recipe is active                        |
| **Messenger**    | Facebook desktop-style bottom bar, shell-level, persistent across navigation                                                |
| **Recipe**       | Ordered node sequence per Role × Chamber × Vault Type                                                                       |
| **Archetype**    | Cognitive work style (Analyst, Strategist, Executor, Connector, Guardian, Architect) — assigned by Conductor/Architect      |

---

## Existing Infrastructure (do not rebuild)

These files exist and work. The plan extends them, not replaces:

| File                                   | What it does                                                                                        | What changes                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `apps/api/src/otto/agent.py`           | System prompts, `build_system_prompt()`, `build_agent_context_prompt()`, `generate_stub_response()` | Add graph node system prompts, keep existing as fallback                     |
| `apps/api/src/otto/deps.py`            | `VaultContext`, `UserAgentContext`, `PermittedTool` dataclasses                                     | Extend `UserAgentContext` with archetype, recipe fields                      |
| `apps/api/src/otto/enrichment.py`      | 9 enrichment sources, `build_vault_context()`, `build_user_agent_context()`                         | Add recipe enrichment, archetype resolution                                  |
| `apps/api/src/otto/routes.py`          | `POST /vaults/{vault_id}/otto/chat` (vault-scoped), `POST /otto/chat` (general)                     | Add `surface` field to `ChatRequest`, route through ExecutionRouter          |
| `apps/api/src/otto/sse.py`             | Vercel AI SDK wire format helpers                                                                   | Add `otto:node_advance`, `otto:signal_push`, `otto:tool_start/result` events |
| `apps/api/src/otto/session_service.py` | Session CRUD (vault-scoped only)                                                                    | Add messenger sessions (scope="messenger"), shared context                   |
| `apps/api/src/otto/models.py`          | `OttoSession`, `OttoMessage` ORM models                                                             | Add `surface`, `tier_used`, `scope` columns                                  |
| `apps/api/src/otto/feature_gate.py`    | Circuit breaker, feature flags, calibration                                                         | Add execution tier feature flags                                             |
| `apps/web/src/stores/otto.store.ts`    | Zustand store with SSE streaming + mock fallback                                                    | Split into task runner vs messenger state                                    |
| `apps/web/src/hooks/useOttoChat.ts`    | SSE hook (vault-scoped only)                                                                        | Add surface param, new event types                                           |

---

## Phase 1: OttoState + Execution Tiers

**Goal:** Create the shared typed state, execution router with feature-flagged tiers, and the deterministic resolution layer. No LLM changes yet — this phase makes the routing infrastructure work.

### Task 1.1: Extend OttoState dataclass

**Files:**

- Modify: `apps/api/src/otto/deps.py:96-125`
- Test: `apps/api/tests/otto/test_deps.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/otto/test_deps.py
from src.otto.deps import OttoState


def test_otto_state_defaults():
    state = OttoState(
        user_id="usr_01",
        workspace_id="ws_01",
        org_role="member",
        module_roles={},
        surface="messenger",
        session_id="ots_01",
        messages=[],
    )
    assert state.archetype is None
    assert state.module is None
    assert state.vault_id is None
    assert state.active_recipe_id is None
    assert state.current_node_index is None
    assert state.vault_context is None
    assert state.can_execute_actions is False  # messenger default


def test_otto_state_task_runner():
    state = OttoState(
        user_id="usr_01",
        workspace_id="ws_01",
        org_role="builder",
        module_roles={"contracts": "builder"},
        surface="task_runner",
        session_id="ots_02",
        messages=[],
        archetype="analyst",
        module="contracts",
        chamber="review",
        vault_id="vlt_01",
        active_recipe_id="rcp_01",
        current_node_index=2,
        current_node={"type": "review", "config": {}, "gate_conditions": []},
    )
    assert state.can_execute_actions is True  # task_runner default
    assert state.archetype == "analyst"
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && source .venv/bin/activate && python -m pytest tests/otto/test_deps.py::test_otto_state_defaults -v`
Expected: FAIL — `OttoState` does not exist yet

**Step 3: Write OttoState in deps.py**

Add after `UserAgentContext` in `apps/api/src/otto/deps.py`:

```python
from typing import Literal


@dataclass
class RecipeNode:
    """A single node in a recipe sequence."""
    type: str  # extraction | review | fill | tag | approve | notify | gate
    config: dict
    gate_conditions: list[dict]
    description: str = ""


@dataclass
class OttoState:
    """Shared typed state for the Otto agent graph.

    Every node reads and writes to this. Passed through PydanticAI Graph's
    GraphRunContext[OttoState].
    """

    # --- Identity ---
    user_id: str
    workspace_id: str
    org_role: str  # owner | conductor | member
    module_roles: dict[str, str]  # {"contracts": "gatekeeper", ...}
    archetype: str | None = None  # analyst | strategist | executor | connector | guardian | architect

    # --- Location ---
    surface: Literal["task_runner", "messenger", "context_menu"] = "messenger"
    module: str | None = None  # contracts | crm | triage | calendar | documents
    chamber: str | None = None  # discover | build | review | ship
    vault_id: str | None = None

    # --- Recipe ---
    active_recipe_id: str | None = None
    current_node_index: int | None = None
    current_node: dict | None = None  # {type, config, gate_conditions}
    total_recipe_nodes: int | None = None

    # --- Conversation ---
    messages: list[dict] = None  # type: ignore[assignment]
    session_id: str = ""

    # --- Surface behavior ---
    can_execute_actions: bool = None  # type: ignore[assignment]

    # --- Enrichment (lazy-loaded) ---
    vault_context: dict | None = None
    recipe_context: dict | None = None
    enrichment_cache: dict[str, tuple[dict, float]] | None = None

    def __post_init__(self) -> None:
        if self.messages is None:
            self.messages = []
        if self.can_execute_actions is None:
            self.can_execute_actions = self.surface == "task_runner"
        if self.enrichment_cache is None:
            self.enrichment_cache = {}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/otto/test_deps.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/otto/deps.py apps/api/tests/otto/test_deps.py
git commit -m "feat(api): add OttoState dataclass for agent graph"
```

---

### Task 1.2: Execution tier config and feature flags

**Files:**

- Modify: `apps/api/src/otto/feature_gate.py`
- Test: `apps/api/tests/otto/test_feature_gate.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/otto/test_feature_gate.py
from src.otto.feature_gate import (
    ExecutionTierConfig,
    validate_tier_config,
    default_tier_config,
)


def test_default_config_has_deterministic_and_cloud():
    config = default_tier_config()
    assert config.tiers["deterministic"].enabled is True
    assert config.tiers["local_llm"].enabled is False
    assert config.tiers["cloud_llm"].enabled is True
    assert config.fallback_order == ["deterministic", "local_llm", "cloud_llm"]


def test_validate_all_disabled_fails():
    config = default_tier_config()
    config.tiers["deterministic"].enabled = False
    config.tiers["cloud_llm"].enabled = False
    errors = validate_tier_config(config)
    assert any("at least one" in e.lower() for e in errors)


def test_validate_local_llm_without_url_fails():
    config = default_tier_config()
    config.tiers["local_llm"].enabled = True
    config.tiers["local_llm"].base_url = ""
    errors = validate_tier_config(config)
    assert any("base_url" in e for e in errors)


def test_validate_deterministic_only_warns():
    config = default_tier_config()
    config.tiers["cloud_llm"].enabled = False
    errors = validate_tier_config(config)
    assert any("WARN" in e for e in errors)
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/otto/test_feature_gate.py -v`
Expected: FAIL — imports don't exist

**Step 3: Add tier config to feature_gate.py**

Add to `apps/api/src/otto/feature_gate.py` (after existing code):

```python
from dataclasses import dataclass, field


@dataclass
class TierSettings:
    """Settings for a single execution tier."""
    enabled: bool = False
    provider: str = ""
    model: str = ""
    base_url: str = ""
    max_tokens: int = 512
    confidence_threshold: float = 0.85


@dataclass
class ExecutionTierConfig:
    """Feature-flagged execution tiers per workspace."""
    tiers: dict[str, TierSettings] = field(default_factory=dict)
    fallback_order: list[str] = field(default_factory=list)


def default_tier_config() -> ExecutionTierConfig:
    """Default config: deterministic + cloud, no local."""
    return ExecutionTierConfig(
        tiers={
            "deterministic": TierSettings(
                enabled=True,
                confidence_threshold=0.85,
            ),
            "local_llm": TierSettings(
                enabled=False,
                provider="ollama",
                model="mistral:7b-instruct",
                base_url="http://localhost:11434",
                max_tokens=512,
            ),
            "cloud_llm": TierSettings(
                enabled=True,
                provider="anthropic",
                model="claude-sonnet-4-6",
                max_tokens=2048,
            ),
        },
        fallback_order=["deterministic", "local_llm", "cloud_llm"],
    )


def validate_tier_config(config: ExecutionTierConfig) -> list[str]:
    """Validate tier config. Returns list of errors/warnings."""
    errors: list[str] = []
    enabled = [t for t in config.fallback_order if config.tiers[t].enabled]

    if not enabled:
        errors.append("At least one execution tier must be enabled")

    if config.tiers["local_llm"].enabled and not config.tiers["local_llm"].base_url:
        errors.append("Local LLM enabled but no base_url configured")

    if enabled == ["deterministic"]:
        errors.append(
            "WARN: Only deterministic tier enabled — "
            "Otto will not respond to freeform questions"
        )

    return errors
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/otto/test_feature_gate.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/otto/feature_gate.py apps/api/tests/otto/test_feature_gate.py
git commit -m "feat(api): add execution tier config with feature flags"
```

---

### Task 1.3: Deterministic intent resolver

**Files:**

- Create: `apps/api/src/otto/deterministic.py`
- Test: `apps/api/tests/otto/test_deterministic.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/otto/test_deterministic.py
from src.otto.deterministic import fuzzy_match_intent, DeterministicResult


def test_gate_status_match():
    match, confidence = fuzzy_match_intent("what's the gate status?")
    assert match is not None
    assert match == "gate_status"
    assert confidence >= 0.85


def test_recipe_progress_match():
    match, confidence = fuzzy_match_intent("where am I in the recipe?")
    assert match is not None
    assert match == "recipe_progress"


def test_node_advance_match():
    match, confidence = fuzzy_match_intent("I'm done, next step")
    assert match is not None
    assert match == "node_advance"


def test_ambiguous_no_match():
    match, confidence = fuzzy_match_intent("why is the health score dropping?")
    assert match is None or confidence < 0.85


def test_field_progress_match():
    match, confidence = fuzzy_match_intent("how many fields are complete?")
    assert match is not None
    assert match == "field_progress"
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/otto/test_deterministic.py -v`
Expected: FAIL — module doesn't exist

**Step 3: Write deterministic.py**

```python
# apps/api/src/otto/deterministic.py
"""Deterministic intent resolver — Tier 0 execution with zero LLM cost."""

from dataclasses import dataclass
from difflib import SequenceMatcher


@dataclass
class DeterministicResult:
    """Result from deterministic resolution."""
    intent: str
    text: str
    metadata: dict | None = None
    advanced: bool = False


# Intent patterns: intent_name → list of trigger phrases
INTENT_PATTERNS: dict[str, list[str]] = {
    "gate_status": [
        "gate status", "gate color", "what gate", "health score",
        "what's the gate", "show gate", "gate check",
    ],
    "field_progress": [
        "how many fields", "field count", "fields complete",
        "fields done", "field progress", "field summary",
        "pass fail", "how many pass", "how many fail",
    ],
    "recipe_progress": [
        "where am i", "recipe progress", "how far",
        "what step", "current step", "remaining steps",
        "recipe status",
    ],
    "node_advance": [
        "done", "next step", "advance", "move on",
        "i'm done", "next node", "mark complete",
        "move to next",
    ],
}


def fuzzy_match_intent(
    message: str,
    patterns: dict[str, list[str]] | None = None,
) -> tuple[str | None, float]:
    """Match a user message to a deterministic intent using fuzzy matching.

    Returns (intent_name, confidence) or (None, 0.0) if no match.
    """
    if patterns is None:
        patterns = INTENT_PATTERNS

    lower = message.lower().strip()
    best_intent: str | None = None
    best_score: float = 0.0

    for intent, phrases in patterns.items():
        for phrase in phrases:
            # Check substring containment first (high confidence)
            if phrase in lower:
                score = 0.95
            else:
                # Fuzzy match
                score = SequenceMatcher(None, lower, phrase).ratio()

            if score > best_score:
                best_score = score
                best_intent = intent

    if best_score < 0.5:
        return None, 0.0

    return best_intent, best_score
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/otto/test_deterministic.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/otto/deterministic.py apps/api/tests/otto/test_deterministic.py
git commit -m "feat(api): add deterministic intent resolver for Tier 0"
```

---

### Task 1.4: Execution router

**Files:**

- Create: `apps/api/src/otto/execution_router.py`
- Test: `apps/api/tests/otto/test_execution_router.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/otto/test_execution_router.py
import pytest
from src.otto.execution_router import ExecutionRouter, RouteResult
from src.otto.feature_gate import default_tier_config
from src.otto.deps import OttoState


def _make_state(**overrides) -> OttoState:
    defaults = dict(
        user_id="usr_01",
        workspace_id="ws_01",
        org_role="member",
        module_roles={},
        surface="task_runner",
        session_id="ots_01",
        messages=[],
    )
    defaults.update(overrides)
    return OttoState(**defaults)


def test_deterministic_gate_status():
    router = ExecutionRouter(default_tier_config())
    state = _make_state(vault_id="vlt_01")
    result = router.route("what's the gate status?", state)
    assert result.tier == "deterministic"
    assert result.intent == "gate_status"


def test_cloud_for_complex_query():
    router = ExecutionRouter(default_tier_config())
    state = _make_state(vault_id="vlt_01")
    result = router.route("why is the health score dropping and what should I do?", state)
    assert result.tier == "cloud_llm"


def test_messenger_skips_deterministic_writes():
    router = ExecutionRouter(default_tier_config())
    state = _make_state(surface="messenger")
    result = router.route("I'm done, next step", state)
    # "node_advance" is a write action — messenger can't execute writes
    assert result.tier != "deterministic" or result.intent != "node_advance"


def test_disabled_tier_skipped():
    config = default_tier_config()
    config.tiers["deterministic"].enabled = False
    router = ExecutionRouter(config)
    state = _make_state(vault_id="vlt_01")
    result = router.route("what's the gate status?", state)
    assert result.tier == "cloud_llm"


def test_all_disabled_returns_error():
    config = default_tier_config()
    config.tiers["deterministic"].enabled = False
    config.tiers["cloud_llm"].enabled = False
    router = ExecutionRouter(config)
    state = _make_state()
    result = router.route("hello", state)
    assert result.tier == "error"
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/otto/test_execution_router.py -v`
Expected: FAIL — module doesn't exist

**Step 3: Write execution_router.py**

```python
# apps/api/src/otto/execution_router.py
"""Execution router — routes messages through feature-flagged tiers."""

import logging
from dataclasses import dataclass

from src.otto.deps import OttoState
from src.otto.deterministic import fuzzy_match_intent
from src.otto.feature_gate import ExecutionTierConfig

logger = logging.getLogger(__name__)

# Deterministic intents that perform write operations
WRITE_INTENTS = {"node_advance"}


@dataclass
class RouteResult:
    """Result of execution routing."""
    tier: str  # "deterministic" | "local_llm" | "cloud_llm" | "error"
    intent: str | None = None
    message: str = ""
    error: str | None = None


class ExecutionRouter:
    """Routes messages through the cheapest capable tier."""

    def __init__(self, config: ExecutionTierConfig) -> None:
        self.config = config

    def route(self, message: str, state: OttoState) -> RouteResult:
        """Route a message through the fallback chain."""
        for tier_name in self.config.fallback_order:
            tier = self.config.tiers.get(tier_name)
            if not tier or not tier.enabled:
                continue

            if tier_name == "deterministic":
                result = self._try_deterministic(message, state, tier.confidence_threshold)
                if result:
                    return result

            elif tier_name == "local_llm":
                # Local LLM handles simple queries that aren't deterministic
                if self._is_simple_query(message, state):
                    return RouteResult(tier="local_llm", message=message)
                # Complex query → fall through

            elif tier_name == "cloud_llm":
                return RouteResult(tier="cloud_llm", message=message)

        return RouteResult(
            tier="error",
            error="No execution tier available. Check Otto configuration.",
        )

    def _try_deterministic(
        self, message: str, state: OttoState, threshold: float
    ) -> RouteResult | None:
        """Try to resolve via deterministic intent matching."""
        intent, confidence = fuzzy_match_intent(message)

        if intent and confidence >= threshold:
            # Messenger can't execute write actions
            if state.surface == "messenger" and intent in WRITE_INTENTS:
                return None  # Fall through to LLM tier
            return RouteResult(tier="deterministic", intent=intent, message=message)

        return None

    def _is_simple_query(self, message: str, state: OttoState) -> bool:
        """Heuristic: is this query simple enough for local LLM?"""
        # Short messages without complex reasoning keywords
        words = message.split()
        if len(words) > 30:
            return False
        complex_keywords = {"why", "compare", "analyze", "suggest", "recommend", "because"}
        if complex_keywords & {w.lower().rstrip("?.,!") for w in words}:
            return False
        return True
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/otto/test_execution_router.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/otto/execution_router.py apps/api/tests/otto/test_execution_router.py
git commit -m "feat(api): add ExecutionRouter with three-tier fallback chain"
```

---

## Phase 2: Agent Graph Nodes

**Goal:** Build the PydanticAI Graph with OttoRouter + four sub-agent nodes. Each node has a focused system prompt and scoped tool set.

### Task 2.1: OttoRouter (deterministic dispatch node)

**Files:**

- Create: `apps/api/src/otto/graph/__init__.py`
- Create: `apps/api/src/otto/graph/router.py`
- Test: `apps/api/tests/otto/test_graph_router.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/otto/test_graph_router.py
from src.otto.graph.router import resolve_agent_type
from src.otto.deps import OttoState


def _make_state(**overrides) -> OttoState:
    defaults = dict(
        user_id="usr_01", workspace_id="ws_01", org_role="member",
        module_roles={}, surface="messenger", session_id="ots_01", messages=[],
    )
    defaults.update(overrides)
    return OttoState(**defaults)


def test_conductor_on_admin_routes_to_conductor():
    state = _make_state(org_role="conductor", surface="task_runner", module="admin")
    assert resolve_agent_type(state) == "conductor"


def test_owner_on_admin_routes_to_conductor():
    state = _make_state(org_role="owner", surface="task_runner", module="admin")
    assert resolve_agent_type(state) == "conductor"


def test_task_runner_with_recipe_routes_to_recipe():
    state = _make_state(
        surface="task_runner", active_recipe_id="rcp_01",
        current_node={"type": "review", "config": {}, "gate_conditions": []},
    )
    assert resolve_agent_type(state) == "recipe"


def test_vault_without_recipe_routes_to_vault():
    state = _make_state(vault_id="vlt_01")
    assert resolve_agent_type(state) == "vault"


def test_messenger_no_vault_routes_to_general():
    state = _make_state(surface="messenger")
    assert resolve_agent_type(state) == "general"


def test_member_on_admin_routes_to_general_not_conductor():
    state = _make_state(org_role="member", surface="task_runner", module="admin")
    assert resolve_agent_type(state) == "general"
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/otto/test_graph_router.py -v`
Expected: FAIL — module doesn't exist

**Step 3: Write the router**

```python
# apps/api/src/otto/graph/__init__.py
"""Otto agent graph — PydanticAI Graph-based routing."""

# apps/api/src/otto/graph/router.py
"""OttoRouter — deterministic dispatch to sub-agent nodes."""

from src.otto.deps import OttoState


def resolve_agent_type(state: OttoState) -> str:
    """Determine which sub-agent should handle this message.

    Pure function — no LLM call, no I/O. Just pattern matching on state.
    Returns: "conductor" | "recipe" | "vault" | "general"
    """
    # Conductor/Owner on admin surface → ConductorAgent
    if (
        state.org_role in ("owner", "conductor")
        and state.surface == "task_runner"
        and state.module == "admin"
    ):
        return "conductor"

    # Task Runner with active recipe → RecipeAgent
    if (
        state.surface == "task_runner"
        and state.active_recipe_id
        and state.current_node
    ):
        return "recipe"

    # Any surface with vault context → VaultAgent
    if state.vault_id:
        return "vault"

    # Messenger or no vault → GeneralAgent
    return "general"
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/otto/test_graph_router.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/otto/graph/ apps/api/tests/otto/test_graph_router.py
git commit -m "feat(api): add OttoRouter deterministic dispatch"
```

---

### Task 2.2: Sub-agent system prompts

**Files:**

- Create: `apps/api/src/otto/graph/prompts.py`
- Test: `apps/api/tests/otto/test_graph_prompts.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/otto/test_graph_prompts.py
from src.otto.graph.prompts import build_recipe_prompt, build_vault_prompt, build_general_prompt, build_conductor_prompt
from src.otto.deps import OttoState


def _make_state(**overrides) -> OttoState:
    defaults = dict(
        user_id="usr_01", workspace_id="ws_01", org_role="member",
        module_roles={}, surface="task_runner", session_id="ots_01", messages=[],
    )
    defaults.update(overrides)
    return OttoState(**defaults)


def test_recipe_prompt_includes_node_info():
    state = _make_state(
        archetype="analyst",
        active_recipe_id="rcp_01",
        current_node_index=2,
        total_recipe_nodes=8,
        current_node={"type": "review", "config": {"description": "Review health score"}, "gate_conditions": []},
    )
    prompt = build_recipe_prompt(state)
    assert "step 3" in prompt.lower() or "3/8" in prompt or "3 of 8" in prompt
    assert "review" in prompt.lower()
    assert "analyst" in prompt.lower()


def test_vault_prompt_includes_vault_and_role():
    state = _make_state(vault_id="vlt_01", chamber="review", module="contracts", archetype="guardian")
    prompt = build_vault_prompt(state)
    assert "vlt_01" in prompt
    assert "review" in prompt.lower()
    assert "guardian" in prompt.lower()


def test_general_prompt_is_conversational():
    state = _make_state(surface="messenger")
    prompt = build_general_prompt(state)
    assert "messenger" in prompt.lower() or "general" in prompt.lower()


def test_conductor_prompt_mentions_recipes():
    state = _make_state(org_role="conductor", module="admin")
    prompt = build_conductor_prompt(state)
    assert "recipe" in prompt.lower()
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/otto/test_graph_prompts.py -v`
Expected: FAIL

**Step 3: Write prompts.py**

```python
# apps/api/src/otto/graph/prompts.py
"""System prompts for each sub-agent node."""

from src.otto.deps import OttoState


def build_recipe_prompt(state: OttoState) -> str:
    """RecipeAgent — narrates current recipe step, checks gates."""
    node = state.current_node or {}
    node_config = node.get("config", {})
    node_type = node.get("type", "unknown")
    description = node_config.get("description", node_type)
    gate_conditions = node.get("gate_conditions", [])
    index = (state.current_node_index or 0) + 1
    total = state.total_recipe_nodes or "?"
    archetype = state.archetype or "member"

    return f"""You are Otto, guiding the user ({state.org_role}, archetype: {archetype}) \
through step {index} of {total} in their active recipe.

Current node: {node_type} — {description}
Gate conditions: {gate_conditions}

Your job:
- Explain what this step requires
- Answer questions about it
- Confirm when gate conditions are met so the user can advance
- Cite enrichment sources when referencing data

Behavioral rules:
- Propose patches as drafts (never auto-apply)
- Self-approval is blocked
- Keep responses focused and actionable
"""


def build_vault_prompt(state: OttoState) -> str:
    """VaultAgent — vault-specific analysis, field questions, risk scoring."""
    archetype = state.archetype or "member"

    return f"""You are Otto, helping the user ({state.org_role}, archetype: {archetype}) \
analyze vault {state.vault_id} in the {state.chamber or 'unknown'} chamber of {state.module or 'unknown'}.

Tailor depth to archetype:
- Analyst: data quality, extraction confidence, field-level detail
- Executor: action items, what to do next, time-sensitive flags
- Guardian: risk flags, compliance checks, gate readiness
- Strategist: patterns across vaults, portfolio-level insights
- Connector: stakeholder context, communication drafts
- Architect: system configuration, recipe design implications

Behavioral rules:
- Propose patches as drafts (never auto-apply)
- Self-approval is blocked
- Always cite enrichment sources
- Keep responses focused and actionable
"""


def build_general_prompt(state: OttoState) -> str:
    """GeneralAgent — freeform questions, cross-vault search, platform help."""
    return f"""You are Otto in messenger mode. Help the user ({state.org_role}) with \
general questions, cross-vault searches, and platform navigation.

No vault is selected. Use search tools to find relevant data.
If the user asks about specific contract data, suggest they open a vault.

Keep responses conversational and helpful.
"""


def build_conductor_prompt(state: OttoState) -> str:
    """ConductorAgent — recipe editing, skill assignment, team analytics."""
    return f"""You are Otto in conductor mode. Help the user ({state.org_role}) manage \
recipes, assign archetypes, and review team performance.

You can:
- List and browse workspace recipes
- Show recipe node sequences and gate conditions
- Summarize team composition by role and archetype
- Recommend archetype assignments based on task requirements

Phase 1 is read-only. Recipe editing tools come in Phase 2.
"""
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/otto/test_graph_prompts.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/otto/graph/prompts.py apps/api/tests/otto/test_graph_prompts.py
git commit -m "feat(api): add sub-agent system prompts per archetype"
```

---

### Task 2.3: Tool authorization matrix

**Files:**

- Create: `apps/api/src/otto/graph/tools.py`
- Test: `apps/api/tests/otto/test_graph_tools.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/otto/test_graph_tools.py
from src.otto.graph.tools import get_tools_for_agent, TOOL_AUTH


def test_recipe_agent_tools():
    tools = get_tools_for_agent("recipe", org_role="member")
    names = {t["name"] for t in tools}
    assert "get_gate_status" in names
    assert "advance_node" in names
    assert "get_recipe_progress" in names
    # Conductor-only tools should NOT be present
    assert "list_recipes" not in names


def test_vault_agent_tools():
    tools = get_tools_for_agent("vault", org_role="member")
    names = {t["name"] for t in tools}
    assert "get_gate_status" in names
    assert "suggest_patch" in names
    assert "run_preflight" in names
    assert "advance_node" not in names


def test_general_agent_tools():
    tools = get_tools_for_agent("general", org_role="member")
    names = {t["name"] for t in tools}
    assert "search_vaults" in names
    assert "advance_node" not in names
    assert "suggest_patch" not in names


def test_conductor_agent_tools():
    tools = get_tools_for_agent("conductor", org_role="conductor")
    names = {t["name"] for t in tools}
    assert "list_recipes" in names
    assert "get_recipe_detail" in names


def test_conductor_tools_denied_for_member():
    tools = get_tools_for_agent("conductor", org_role="member")
    names = {t["name"] for t in tools}
    assert "list_recipes" not in names
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/otto/test_graph_tools.py -v`
Expected: FAIL

**Step 3: Write tools.py**

```python
# apps/api/src/otto/graph/tools.py
"""Tool authorization matrix — which tools each sub-agent can access."""

# Role hierarchy for min_role checks
ROLE_HIERARCHY = {
    "member": 0,
    "builder": 1,
    "gatekeeper": 2,
    "conductor": 3,
    "owner": 4,
}

# Tool definitions with authorization rules
TOOL_AUTH: dict[str, dict] = {
    # Existing read tools — available to all
    "get_gate_status":      {"min_role": "member", "agents": ["recipe", "vault"]},
    "get_field_summary":    {"min_role": "member", "agents": ["recipe", "vault"]},
    "get_contract_health":  {"min_role": "member", "agents": ["vault", "general"]},
    "get_deal_fields":      {"min_role": "member", "agents": ["vault", "general"]},
    "get_extraction_meta":  {"min_role": "member", "agents": ["recipe", "vault"]},
    "get_corpus_context":   {"min_role": "member", "agents": ["vault"]},
    "get_open_patches":     {"min_role": "member", "agents": ["vault"]},
    "get_preflight_status": {"min_role": "member", "agents": ["vault"]},
    "get_timeline":         {"min_role": "member", "agents": ["vault"]},
    "search_vaults":        {"min_role": "member", "agents": ["general", "conductor"]},

    # Write-adjacent
    "suggest_patch":        {"min_role": "builder", "agents": ["recipe", "vault"]},
    "run_preflight":        {"min_role": "builder", "agents": ["vault"]},

    # Recipe tools (new)
    "get_recipe_progress":  {"min_role": "member", "agents": ["recipe"]},
    "advance_node":         {"min_role": "member", "agents": ["recipe"]},

    # Conductor tools (new)
    "list_recipes":         {"min_role": "conductor", "agents": ["conductor"]},
    "get_recipe_detail":    {"min_role": "conductor", "agents": ["conductor"]},
    "get_team_summary":     {"min_role": "conductor", "agents": ["conductor"]},

    # Phase 2
    "edit_recipe_node":     {"min_role": "conductor", "agents": ["conductor"]},
}


def get_tools_for_agent(agent_type: str, org_role: str = "member") -> list[dict]:
    """Return authorized tools for a given agent type and user role."""
    user_level = ROLE_HIERARCHY.get(org_role, 0)
    tools = []

    for tool_name, auth in TOOL_AUTH.items():
        if agent_type not in auth["agents"]:
            continue
        min_level = ROLE_HIERARCHY.get(auth["min_role"], 0)
        if user_level < min_level:
            continue
        tools.append({"name": tool_name, "auth": auth})

    return tools
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/otto/test_graph_tools.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/otto/graph/tools.py apps/api/tests/otto/test_graph_tools.py
git commit -m "feat(api): add tool authorization matrix for agent graph"
```

---

### Task 2.4: Deterministic handlers for gate checks and recipe advancement

**Files:**

- Create: `apps/api/src/otto/graph/handlers.py`
- Test: `apps/api/tests/otto/test_graph_handlers.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/otto/test_graph_handlers.py
from src.otto.graph.handlers import (
    handle_gate_status,
    handle_field_summary,
    handle_recipe_progress,
    handle_node_advance,
)
from src.otto.deps import OttoState
from src.otto.deterministic import DeterministicResult


def _make_state(**overrides) -> OttoState:
    defaults = dict(
        user_id="usr_01", workspace_id="ws_01", org_role="member",
        module_roles={}, surface="task_runner", session_id="ots_01", messages=[],
    )
    defaults.update(overrides)
    return OttoState(**defaults)


def test_handle_gate_status_returns_text():
    state = _make_state(
        vault_id="vlt_01",
        vault_context={"gate_color": "yellow", "health_score": 0.72},
    )
    result = handle_gate_status(state)
    assert isinstance(result, DeterministicResult)
    assert "yellow" in result.text.lower() or "72" in result.text


def test_handle_field_summary_returns_counts():
    state = _make_state(
        vault_id="vlt_01",
        vault_context={"pass_count": 37, "fail_count": 5, "review_count": 12},
    )
    result = handle_field_summary(state)
    assert "37" in result.text
    assert "5" in result.text


def test_handle_recipe_progress():
    state = _make_state(
        active_recipe_id="rcp_01",
        current_node_index=2,
        total_recipe_nodes=8,
        current_node={"type": "review", "config": {"description": "Review health"}, "gate_conditions": []},
    )
    result = handle_recipe_progress(state)
    assert "3" in result.text  # node_index + 1
    assert "8" in result.text


def test_handle_node_advance_all_pass():
    state = _make_state(
        active_recipe_id="rcp_01",
        current_node_index=2,
        total_recipe_nodes=8,
        current_node={"type": "review", "config": {}, "gate_conditions": []},
    )
    # No gate conditions → auto-pass
    result = handle_node_advance(state)
    assert result.advanced is True
    assert state.current_node_index == 3


def test_handle_node_advance_blocked():
    state = _make_state(
        active_recipe_id="rcp_01",
        current_node_index=2,
        total_recipe_nodes=8,
        current_node={
            "type": "review",
            "config": {},
            "gate_conditions": [{"type": "field_value", "field": "territory", "expected": "Worldwide", "actual": None}],
        },
    )
    result = handle_node_advance(state)
    assert result.advanced is False
    assert state.current_node_index == 2  # Not changed
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/otto/test_graph_handlers.py -v`
Expected: FAIL

**Step 3: Write handlers.py**

```python
# apps/api/src/otto/graph/handlers.py
"""Deterministic handlers — zero-LLM-cost responses for known intents."""

from src.otto.deps import OttoState
from src.otto.deterministic import DeterministicResult


def handle_gate_status(state: OttoState) -> DeterministicResult:
    """Format gate status from vault context. No LLM needed."""
    ctx = state.vault_context or {}
    gate_color = ctx.get("gate_color", "unknown")
    health = ctx.get("health_score", 0)
    health_pct = f"{health:.0%}" if isinstance(health, float) else str(health)

    text = f"**Gate Status:** {gate_color.upper()} — Health: {health_pct}"
    return DeterministicResult(intent="gate_status", text=text, metadata=ctx)


def handle_field_summary(state: OttoState) -> DeterministicResult:
    """Format field pass/fail/review counts. No LLM needed."""
    ctx = state.vault_context or {}
    p = ctx.get("pass_count", 0)
    f = ctx.get("fail_count", 0)
    r = ctx.get("review_count", 0)
    total = p + f + r

    text = f"**Fields:** {p}/{total} passing, {f} failures, {r} need review"
    return DeterministicResult(intent="field_progress", text=text, metadata=ctx)


def handle_recipe_progress(state: OttoState) -> DeterministicResult:
    """Format recipe progress. No LLM needed."""
    index = (state.current_node_index or 0) + 1
    total = state.total_recipe_nodes or "?"
    node = state.current_node or {}
    node_type = node.get("type", "unknown")
    desc = node.get("config", {}).get("description", node_type)

    pct = f"{index / total * 100:.0f}%" if isinstance(total, int) and total > 0 else "—"
    text = (
        f"**Recipe Progress:** Step {index} of {total} ({pct})\n"
        f"**Current:** {node_type} — {desc}"
    )
    return DeterministicResult(intent="recipe_progress", text=text)


def handle_node_advance(state: OttoState) -> DeterministicResult:
    """Check gate conditions and advance recipe node. Pure logic, no LLM."""
    node = state.current_node or {}
    conditions = node.get("gate_conditions", [])

    results = []
    all_passed = True

    for condition in conditions:
        ctype = condition.get("type", "")
        passed = False

        if ctype == "field_value":
            actual = condition.get("actual")
            expected = condition.get("expected")
            passed = actual is not None and actual == expected
        elif ctype == "step_completion":
            passed = condition.get("completed", False)
        elif ctype == "signal_count":
            count = condition.get("count", 0)
            threshold = condition.get("threshold", 1)
            passed = count >= threshold
        else:
            # Unknown condition type — pass by default (lenient)
            passed = True

        results.append({"condition": condition, "passed": passed})
        if not passed:
            all_passed = False

    if all_passed:
        state.current_node_index = (state.current_node_index or 0) + 1
        text = f"Step complete! Moving to step {state.current_node_index + 1}."
        return DeterministicResult(intent="node_advance", text=text, advanced=True, metadata={"results": results})
    else:
        failing = [r for r in results if not r["passed"]]
        descriptions = [str(r["condition"]) for r in failing]
        text = f"**Not ready yet.** Remaining conditions:\n" + "\n".join(f"- {d}" for d in descriptions)
        return DeterministicResult(intent="node_advance", text=text, advanced=False, metadata={"results": results})
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/otto/test_graph_handlers.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/otto/graph/handlers.py apps/api/tests/otto/test_graph_handlers.py
git commit -m "feat(api): add deterministic handlers for gate checks and recipe advance"
```

---

## Phase 3: Route Integration

**Goal:** Wire the ExecutionRouter and OttoRouter into the existing FastAPI routes. Update `ChatRequest` with `surface` field. Deterministic results return JSON, LLM results stream SSE.

### Task 3.1: Update ChatRequest and route handler

**Files:**

- Modify: `apps/api/src/otto/routes.py:52-58` (ChatRequest)
- Modify: `apps/api/src/otto/routes.py:121-256` (otto_chat handler)
- Test: `apps/api/tests/otto/test_routes_integration.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/otto/test_routes_integration.py
from src.otto.routes import ChatRequest


def test_chat_request_has_surface():
    req = ChatRequest(message="hello", surface="messenger")
    assert req.surface == "messenger"


def test_chat_request_defaults_to_task_runner():
    req = ChatRequest(message="hello")
    assert req.surface == "task_runner"


def test_chat_request_accepts_recipe_fields():
    req = ChatRequest(
        message="next",
        surface="task_runner",
        recipe_id="rcp_01",
        node_index=2,
    )
    assert req.recipe_id == "rcp_01"
    assert req.node_index == 2
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/otto/test_routes_integration.py -v`
Expected: FAIL — `surface` field doesn't exist on ChatRequest

**Step 3: Update ChatRequest in routes.py**

In `apps/api/src/otto/routes.py`, replace the `ChatRequest` class:

```python
class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    provider_config: ProviderConfig | None = None
    module: str | None = None
    chamber: str | None = None
    # Agent graph fields
    surface: str = "task_runner"  # task_runner | messenger | context_menu
    recipe_id: str | None = None
    node_index: int | None = None
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/otto/test_routes_integration.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/otto/routes.py apps/api/tests/otto/test_routes_integration.py
git commit -m "feat(api): add surface and recipe fields to ChatRequest"
```

---

### Task 3.2: Add new SSE event types

**Files:**

- Modify: `apps/api/src/otto/sse.py`
- Test: `apps/api/tests/otto/test_sse.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/otto/test_sse.py
import json
from src.otto.sse import (
    format_sse_text, format_sse_done,
    format_sse_node_advance, format_sse_signal_push,
    format_sse_tool_start, format_sse_tier_info,
)


def test_existing_text_format():
    result = format_sse_text("hello")
    assert result == '0:"hello"\n'


def test_node_advance_format():
    result = format_sse_node_advance(from_index=2, to_index=3, node={"type": "review"})
    assert result.startswith("9:")
    data = json.loads(result[2:].strip())
    assert data["from"] == 2
    assert data["to"] == 3


def test_signal_push_format():
    result = format_sse_signal_push(module="contracts", signal={"type": "health_drop"})
    assert result.startswith("a:")
    data = json.loads(result[2:].strip())
    assert data["module"] == "contracts"


def test_tool_start_format():
    result = format_sse_tool_start("get_field_summary")
    assert result.startswith("b:")


def test_tier_info_format():
    result = format_sse_tier_info("deterministic", "gate_status")
    assert result.startswith("c:")
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/otto/test_sse.py -v`
Expected: FAIL — new functions don't exist

**Step 3: Add new SSE helpers**

Append to `apps/api/src/otto/sse.py`:

```python
def format_sse_node_advance(from_index: int, to_index: int, node: dict) -> str:
    """Node advance: 9:{from, to, node}"""
    payload = {"from": from_index, "to": to_index, "node": node}
    return f"9:{json.dumps(payload)}\n"


def format_sse_signal_push(module: str, signal: dict) -> str:
    """Signal push (Otto-detected → module): a:{module, signal}"""
    payload = {"module": module, "signal": signal}
    return f"a:{json.dumps(payload)}\n"


def format_sse_tool_start(tool_name: str) -> str:
    """Tool execution started: b:{tool}"""
    return f"b:{json.dumps({'tool': tool_name})}\n"


def format_sse_tier_info(tier: str, intent: str | None = None) -> str:
    """Tier info (which execution tier handled this): c:{tier, intent}"""
    payload = {"tier": tier, "intent": intent}
    return f"c:{json.dumps(payload)}\n"
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/otto/test_sse.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/otto/sse.py apps/api/tests/otto/test_sse.py
git commit -m "feat(api): add SSE events for node advance, signal push, tool start"
```

---

### Task 3.3: Update session service for messenger scope

**Files:**

- Modify: `apps/api/src/otto/session_service.py`
- Modify: `apps/api/src/otto/models.py`
- Test: `apps/api/tests/otto/test_session_service.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/otto/test_session_service.py
"""Test session service changes — messenger scope + surface tracking."""
from src.otto.models import OttoSession


def test_otto_session_has_scope_field():
    """OttoSession model should have scope and surface columns."""
    assert hasattr(OttoSession, "scope")
    assert hasattr(OttoSession, "surface")
    assert hasattr(OttoSession, "tier_used")
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/otto/test_session_service.py -v`
Expected: FAIL — columns don't exist

**Step 3: Add columns to OttoSession model**

In `apps/api/src/otto/models.py`, add after `last_message_at`:

```python
    scope: Mapped[str] = mapped_column(
        Text, nullable=False, server_default="vault", index=True
    )  # "vault" | "messenger"
    surface: Mapped[str | None] = mapped_column(Text, nullable=True)  # task_runner | messenger
    tier_used: Mapped[str | None] = mapped_column(Text, nullable=True)  # deterministic | local_llm | cloud_llm
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/otto/test_session_service.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/otto/models.py apps/api/tests/otto/test_session_service.py
git commit -m "feat(api): add scope, surface, tier_used to OttoSession model"
```

---

## Phase 4: Frontend — Messenger Surface

**Goal:** Add the Messenger bottom bar component (shell-level) with persistent conversation state. Task Runner frontend changes are Phase 5.

### Task 4.1: Extend otto.store.ts with messenger state

**Files:**

- Modify: `apps/web/src/stores/otto.store.ts`
- No test file (Zustand store — tested via component integration)

**Step 1: Read current store (already done above)**

**Step 2: Add messenger state to otto.store.ts**

Replace the full store with dual-surface support. Key changes:

- Add `messengerMessages`, `messengerSessionId`, `isMessengerOpen`, `unreadCount`
- Add `surface` param to `sendMessage`
- Keep existing vault-scoped behavior as `taskRunnerMessages`
- Shared `sendToOtto(message, surface)` internal function

```typescript
// Full replacement — see existing file at apps/web/src/stores/otto.store.ts
// Key additions to the interface:

interface OttoState {
  // --- Task Runner (vault-scoped) ---
  messages: OttoMessage[]; // renamed conceptually but kept as `messages` for compat
  isStreaming: boolean;
  isDrawerOpen: boolean;
  vaultId: string | null;

  // --- Messenger (shell-level, persistent) ---
  messengerMessages: OttoMessage[];
  messengerSessionId: string | null;
  isMessengerOpen: boolean;
  unreadCount: number;

  // --- Actions ---
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  sendMessage: (content: string, surface?: "task_runner" | "messenger") => void;
  clearHistory: () => void;
  setVaultId: (id: string) => void;
  stop: () => void;
  toggleMessenger: () => void;
  sendMessengerMessage: (content: string) => void;
  clearMessengerHistory: () => void;
}
```

**Step 3: Commit**

```bash
git add apps/web/src/stores/otto.store.ts
git commit -m "feat(web): add messenger state to otto store"
```

---

### Task 4.2: MessengerBar component

**Files:**

- Create: `apps/web/src/components/organisms/MessengerBar.tsx`
- Create: `apps/web/src/components/molecules/MessengerToggle.tsx`
- Create: `apps/web/src/components/organisms/MessengerWindow.tsx`

**Step 1: Create MessengerToggle (atom-level button)**

```typescript
// apps/web/src/components/molecules/MessengerToggle.tsx
"use client";

import { Bot } from "lucide-react";
import { useOttoStore } from "@/stores/otto.store";

export default function MessengerToggle() {
  const { isMessengerOpen, toggleMessenger, unreadCount } = useOttoStore();

  return (
    <button
      onClick={toggleMessenger}
      className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
        isMessengerOpen
          ? "bg-accent-primary text-white"
          : "bg-surface-raised text-text-secondary hover:bg-surface-hover"
      }`}
      aria-label="Toggle Otto messenger"
    >
      <Bot size={18} />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-error text-[9px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
```

**Step 2: Create MessengerWindow (expandable chat)**

```typescript
// apps/web/src/components/organisms/MessengerWindow.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send } from "lucide-react";
import { useOttoStore } from "@/stores/otto.store";

export default function MessengerWindow() {
  const {
    messengerMessages,
    isMessengerOpen,
    isStreaming,
    toggleMessenger,
    sendMessengerMessage,
  } = useOttoStore();

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messengerMessages]);

  if (!isMessengerOpen) return null;

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessengerMessage(input.trim());
    setInput("");
  };

  return (
    <div className="fixed bottom-12 right-4 z-50 flex w-80 flex-col rounded-t-lg border border-surface-border bg-surface-base shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-border px-3 py-2">
        <span className="text-sm font-semibold text-text-primary">Otto</span>
        <button onClick={toggleMessenger} className="text-text-muted hover:text-text-primary">
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3" style={{ maxHeight: 320 }}>
        {messengerMessages.map((msg) => (
          <div
            key={msg.id}
            className={`text-xs leading-relaxed ${
              msg.role === "user" ? "text-right text-text-primary" : "text-text-secondary"
            }`}
          >
            <div
              className={`inline-block max-w-[90%] rounded-lg px-3 py-1.5 ${
                msg.role === "user"
                  ? "bg-accent-primary/15 text-text-primary"
                  : "bg-surface-raised text-text-secondary"
              }`}
            >
              {msg.content || (isStreaming ? "..." : "")}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-surface-border p-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Message Otto..."
            className="flex-1 rounded bg-surface-raised px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="text-accent-primary disabled:opacity-30"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Create MessengerBar (shell-level bottom bar)**

```typescript
// apps/web/src/components/organisms/MessengerBar.tsx
"use client";

import MessengerToggle from "@/components/molecules/MessengerToggle";
import MessengerWindow from "@/components/organisms/MessengerWindow";

export default function MessengerBar() {
  return (
    <>
      <MessengerWindow />
      <div className="fixed bottom-0 right-0 z-40 flex items-center gap-2 border-t border-surface-border bg-surface-base/80 px-4 py-1.5 backdrop-blur-sm">
        <MessengerToggle />
      </div>
    </>
  );
}
```

**Step 4: Commit**

```bash
git add apps/web/src/components/organisms/MessengerBar.tsx apps/web/src/components/molecules/MessengerToggle.tsx apps/web/src/components/organisms/MessengerWindow.tsx
git commit -m "feat(web): add Messenger bottom bar components"
```

---

### Task 4.3: Mount MessengerBar in shell layout

**Files:**

- Modify: Shell layout file (find the root `(shell)/layout.tsx`)

**Step 1: Find and read the shell layout**

Look for: `apps/web/src/app/(shell)/layout.tsx`

**Step 2: Import and render MessengerBar**

Add `<MessengerBar />` as a sibling to the main content, before the closing `</body>` or layout wrapper. It's shell-level — always visible.

```tsx
import MessengerBar from "@/components/organisms/MessengerBar";

// In the return JSX, add at the bottom of the layout:
<MessengerBar />;
```

**Step 3: Commit**

```bash
git add apps/web/src/app/\(shell\)/layout.tsx
git commit -m "feat(web): mount MessengerBar in shell layout"
```

---

## Phase 5: Frontend — Task Runner Updates

**Goal:** Update the SSE hook to handle new event types, add surface param, update the Signal panel for Task Runner positioning.

### Task 5.1: Update useOttoChat hook with surface and new events

**Files:**

- Modify: `apps/web/src/hooks/useOttoChat.ts`

**Step 1: Update the hook**

Key changes:

- Add `surface` param to options
- Send `surface` in request body
- Parse new SSE event types: `9:` (node_advance), `a:` (signal_push), `b:` (tool_start), `c:` (tier_info)
- Export event callbacks for components to hook into

```typescript
interface UseOttoChatOptions {
  vaultId?: string;
  surface?: "task_runner" | "messenger";
  onNodeAdvance?: (
    from: number,
    to: number,
    node: Record<string, unknown>,
  ) => void;
  onSignalPush?: (module: string, signal: Record<string, unknown>) => void;
  onToolStart?: (toolName: string) => void;
}
```

In the SSE parsing loop, add:

```typescript
if (line.startsWith("9:")) {
  const data = JSON.parse(line.slice(2));
  onNodeAdvance?.(data.from, data.to, data.node);
}
if (line.startsWith("a:")) {
  const data = JSON.parse(line.slice(2));
  onSignalPush?.(data.module, data.signal);
}
if (line.startsWith("b:")) {
  const data = JSON.parse(line.slice(2));
  onToolStart?.(data.tool);
}
```

In the request body, add:

```typescript
body.surface = surface ?? "task_runner";
```

**Step 2: Commit**

```bash
git add apps/web/src/hooks/useOttoChat.ts
git commit -m "feat(web): add surface param and new SSE event handlers to useOttoChat"
```

---

### Task 5.2: RecipeProgressBar component

**Files:**

- Create: `apps/web/src/components/organisms/RecipeProgressBar.tsx`

**Step 1: Create the component**

```typescript
// apps/web/src/components/organisms/RecipeProgressBar.tsx
"use client";

interface RecipeNode {
  type: string;
  description: string;
}

interface RecipeProgressBarProps {
  nodes: RecipeNode[];
  currentIndex: number;
}

export default function RecipeProgressBar({ nodes, currentIndex }: RecipeProgressBarProps) {
  return (
    <div className="space-y-1 rounded-lg border border-surface-border bg-surface-raised p-3">
      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-text-muted">
        Recipe Progress
      </h3>
      {nodes.map((node, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isPending = i > currentIndex;

        return (
          <div key={i} className="flex items-center gap-2">
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                isComplete
                  ? "bg-accent-success text-white"
                  : isCurrent
                    ? "border-2 border-accent-primary bg-accent-primary/15 text-accent-primary"
                    : "border border-surface-border text-text-muted"
              }`}
            >
              {isComplete ? "✓" : isPending ? "" : "●"}
            </span>
            <span
              className={`text-xs ${
                isCurrent ? "font-medium text-text-primary" : "text-text-muted"
              }`}
            >
              {node.description || node.type}
              {isCurrent && (
                <span className="ml-1 text-[10px] text-accent-primary">← you</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/organisms/RecipeProgressBar.tsx
git commit -m "feat(web): add RecipeProgressBar component for Signal panel"
```

---

## Phase 6: Database Migration

**Goal:** Create Alembic migration for new columns and tables.

### Task 6.1: Migration for OttoSession new columns + recipes table

**Files:**

- Create: `apps/api/src/migrations/versions/010_otto_agent_graph.py`

**Step 1: Write the migration**

```python
# apps/api/src/migrations/versions/010_otto_agent_graph.py
"""Add agent graph columns to otto_sessions + recipes tables.

Revision ID: 010
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add columns to otto_sessions
    op.add_column("otto_sessions", sa.Column("scope", sa.Text(), server_default="vault", nullable=False))
    op.add_column("otto_sessions", sa.Column("surface", sa.Text(), nullable=True))
    op.add_column("otto_sessions", sa.Column("tier_used", sa.Text(), nullable=True))
    op.create_index("ix_otto_sessions_scope", "otto_sessions", ["scope"])

    # Recipes table (immutable defaults + workspace copies)
    op.create_table(
        "recipes",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("vault_type", sa.Text(), nullable=True),
        sa.Column("role", sa.Text(), nullable=True),
        sa.Column("chamber", sa.Text(), nullable=True),
        sa.Column("is_default", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("source_recipe_id", sa.Text(), nullable=True),  # copy-on-write parent
        sa.Column("nodes", JSONB(), server_default="[]", nullable=False),
        sa.Column("metadata", JSONB(), server_default="{}", nullable=False),
        sa.Column("created_by", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_recipes_workspace_id", "recipes", ["workspace_id"])

    # Recipe assignments (which user has which recipe active on which vault)
    op.create_table(
        "recipe_assignments",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("recipe_id", sa.Text(), sa.ForeignKey("recipes.id"), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("vault_id", sa.Text(), nullable=False),
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("current_node_index", sa.Integer(), server_default="0", nullable=False),
        sa.Column("status", sa.Text(), server_default="active", nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_recipe_assignments_user_vault", "recipe_assignments", ["user_id", "vault_id"])


def downgrade() -> None:
    op.drop_table("recipe_assignments")
    op.drop_table("recipes")
    op.drop_index("ix_otto_sessions_scope", table_name="otto_sessions")
    op.drop_column("otto_sessions", "tier_used")
    op.drop_column("otto_sessions", "surface")
    op.drop_column("otto_sessions", "scope")
```

**Step 2: Commit**

```bash
git add apps/api/src/migrations/versions/010_otto_agent_graph.py
git commit -m "feat(api): add migration for agent graph columns and recipes tables"
```

---

## Phase 7: Verification

**Goal:** Run type-check and lint across both apps to confirm nothing is broken.

### Task 7.1: Verify backend

**Step 1: Run pytest**

```bash
cd apps/api && source .venv/bin/activate && python -m pytest tests/otto/ -v
```

Expected: All tests pass

**Step 2: Run ruff**

```bash
cd apps/api && ruff check src/otto/ --fix
```

Expected: Clean or only pre-existing warnings

### Task 7.2: Verify frontend

**Step 1: Run type-check**

```bash
source ~/.nvm/nvm.sh && nvm use 20 && cd /Users/zacharyholwerda/Desktop/airlock-app && pnpm type-check
```

Expected: Pass (or only pre-existing errors)

**Step 2: Run lint**

```bash
pnpm lint
```

Expected: Pass

---

## File Summary

| Phase | New Files                                                                                                                                                                                    | Modified Files                                    |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1     | `otto/deterministic.py`, `otto/execution_router.py`, `tests/otto/test_deps.py`, `tests/otto/test_feature_gate.py`, `tests/otto/test_deterministic.py`, `tests/otto/test_execution_router.py` | `otto/deps.py`, `otto/feature_gate.py`            |
| 2     | `otto/graph/__init__.py`, `otto/graph/router.py`, `otto/graph/prompts.py`, `otto/graph/tools.py`, `otto/graph/handlers.py`, `tests/otto/test_graph_*.py` (4 files)                           | —                                                 |
| 3     | `tests/otto/test_routes_integration.py`, `tests/otto/test_sse.py`, `tests/otto/test_session_service.py`                                                                                      | `otto/routes.py`, `otto/sse.py`, `otto/models.py` |
| 4     | `components/organisms/MessengerBar.tsx`, `components/molecules/MessengerToggle.tsx`, `components/organisms/MessengerWindow.tsx`                                                              | `stores/otto.store.ts`, shell layout              |
| 5     | `components/organisms/RecipeProgressBar.tsx`                                                                                                                                                 | `hooks/useOttoChat.ts`                            |
| 6     | `migrations/versions/010_otto_agent_graph.py`                                                                                                                                                | —                                                 |

**Total:** ~20 new files, ~8 modified files, ~15 commits

---

## Design Decisions Reference

| Decision                 | Answer                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Otto's primary job       | Phase 1: narrate (text), Phase 2: render specs                                                                          |
| Archetype assignment     | Conductor/Architect assigns, NOT self-selected                                                                          |
| Role model               | Discord-style additive permissions                                                                                      |
| Otto surfaces (0-to-1)   | Task Runner (top of Signal) + Messenger (bottom bar)                                                                    |
| Architecture             | PydanticAI Agent Graph (typed state machine)                                                                            |
| Execution tiers          | Deterministic → Local LLM (Ollama) → Cloud LLM, feature-flagged per workspace                                           |
| Context loading          | Lazy — Tier 1 injected (cheap), Tier 2 via tool calls (on demand)                                                       |
| Signal panel behavior    | Transforms on vault entry: Dispatch signals → Task Runner + collapsed Triage strip                                      |
| Otto-detected signals    | Route through source module (Gate Signals, Triage Signals), NOT an "Otto Signals" bucket                                |
| Task Runner positioning  | IS the top of Signal (Context Bar + Gate Action Area), not a slot in the aggregator                                     |
| Config separation        | Signal routing (Conductor) vs Otto capability (capability tree node) — two separate surfaces                            |
| Messenger vs Task Runner | Same Otto, shared context. Signal = proactive/procedural. Messenger = reactive/ambient. Actions execute in Signal only. |
| Vocabulary               | Tasks → Triage, Homepage → Dispatch                                                                                     |
