# M7: DAG Execution Engine — Implementation Plan

**Date:** 2026-03-09
**Milestone:** M7 (MAGS Phase 1)
**Depends on:** M5 (Otto Agent Prompting), M6 (Playbook Templates + Storage)

---

## Deliverables

1. **DAG Walker** — `dag/engine.py` — Core execution orchestrator
2. **Gate Manager** — `dag/gates.py` — Gate state transitions and enforcement
3. **Node Executor** — `dag/executor.py` — Routes to actor-specific execution
4. **Routes** — `routes/playbooks.py` extensions for execution endpoints
5. **Tests** — Full coverage of DAG walking, gate logic, node execution

---

## Architecture

```
POST /execute
    └── DAGEngine.start(instance_id)
            ├── get_runnable_nodes()     ← all deps met + no pending gate
            ├── NodeExecutor.execute()   ← per actor type
            │     ├── otto:   compose_prompt → stub response (real Claude in M25)
            │     ├── human:  mark blocked, await external completion
            │     └── hybrid: otto drafts → mark gate-waiting
            ├── persist node state
            └── check_unblocked() → recurse

POST /gates/{node_id}/respond
    └── GateManager.respond()
            ├── validate approver role
            ├── update gate_response
            ├── mark node completed (if approved)
            └── DAGEngine.advance() → run next unblocked nodes
```

---

## Files to Create

### DAG Engine

- `src/services/dag/__init__.py` — Package init
- `src/services/dag/engine.py` — DAG Walker (runnable detection, advance loop)
- `src/services/dag/executor.py` — Node execution by actor type
- `src/services/dag/gates.py` — Gate response handling

### Tests

- `tests/test_dag_engine.py` — Comprehensive tests

### Files to Modify

- `src/routes/playbooks.py` — Add execute/advance/gate endpoints
- `src/schemas/playbook.py` — Add execution request/response schemas

---

## Key Design Decisions

1. **Stub responses for Otto nodes** — Per mock-data-first strategy, Otto nodes
   produce a structured stub response rather than calling Claude API. Real LLM
   integration comes in M25. The executor is structured so swapping in the real
   Claude call is a single function change.

2. **Synchronous DAG walking** — The engine runs in a single request cycle:
   start → execute all runnable nodes → stop at gates/human nodes. No background
   workers needed for dogfood.

3. **Gate as node state** — Gate data lives in `node_state.gate_response` JSONB.
   No separate gate table. Gate resolution updates node status from `blocked` to
   `completed`.

4. **No parallel async execution** — Nodes with the same upstream dependencies
   are conceptually parallel but executed sequentially in the same request.
   True async parallelism deferred to post-dogfood.

---

## API Endpoints (additions to existing playbook routes)

```
POST   /api/v1/playbooks/instances/{instance_id}/execute        — Start/advance execution
POST   /api/v1/playbooks/instances/{instance_id}/nodes/{node_id}/complete — External completion
POST   /api/v1/playbooks/instances/{instance_id}/gates/{node_id}/respond  — Gate response
```

---

## Test Coverage

- DAG runnable detection (topological sort, dependency satisfaction)
- Node execution by actor type (otto, human, hybrid)
- Gate approval flow (approve → unblock downstream)
- Gate rejection flow (reject → keep blocked)
- Full playbook walkthrough (all nodes, all gates)
- Edge cases (already completed, no runnable nodes, unknown instance)
- Parallel dependency paths (research-deep-dive gather_public + gather_internal)
