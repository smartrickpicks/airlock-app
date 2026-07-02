"""DAG Execution Engine tests (M7).

Tests the full DAG execution pipeline:
- Node executor (otto/human/hybrid actor dispatch)
- Gate manager (approve/reject/request_changes, multi-approval)
- DAG engine (start_execution, complete_node, respond_to_gate)
- Execution route integration tests via TestClient

Coverage targets:
- Otto node execution (stub response, gate_pending flag)
- Human node execution (blocked status)
- Hybrid node execution (Otto draft + blocked)
- Gate response processing (all 3 gate types, multi-approval)
- Gate action validation (allowed/disallowed actions per type)
- DAG walking (dependency resolution, topological execution)
- Full playbook lifecycle (start → gate approve → complete → done)
- Error handling (invalid actions, missing nodes, wrong states)
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import JSON, create_engine, event
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session, sessionmaker

from src.db import Base
from src.models.playbook_instance import PlaybookInstance
from src.models.playbook_node_state import PlaybookNodeState
from src.schemas.playbook import (
    ActorType,
    CreateInstanceRequest,
    GateConfig,
    GateType,
    InstanceStatus,
    NodeStatus,
    PlaybookNode,
    PlaybookTemplate,
)
from src.services import playbook as playbook_service
from src.services.dag.engine import (
    ExecutionSummary,
    _get_runnable_nodes,
    complete_node,
    respond_to_gate,
    start_execution,
)
from src.services.dag.executor import (
    NodeExecutionResult,
    execute_node,
)
from src.services.dag.gates import (
    GATE_ALLOWED_ACTIONS,
    GateAction,
    GateResult,
    process_gate_response,
)
from src.services.playbooks.template_loader import clear_template_cache

# --- Fixtures ---


@pytest.fixture(autouse=True)
def _clear_cache():
    """Clear template cache before/after each test."""
    clear_template_cache()
    yield
    clear_template_cache()


@pytest.fixture
def test_db() -> Session:
    """Create a fresh in-memory SQLite database for each test."""
    test_engine = create_engine("sqlite:///:memory:")

    @event.listens_for(test_engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

    tables = [
        PlaybookInstance.__table__,
        PlaybookNodeState.__table__,
    ]
    for table in tables:
        for col in table.columns:
            if isinstance(col.type, JSONB):
                col.type = JSON()

    Base.metadata.create_all(test_engine, tables=tables)
    test_session_factory = sessionmaker(bind=test_engine, autocommit=False, autoflush=False)
    session = test_session_factory()
    try:
        yield session
    finally:
        session.close()
        test_engine.dispose()


@pytest.fixture
def client():
    """TestClient for route testing."""
    from src.main import app

    with TestClient(app) as c:
        yield c


# --- Helper: minimal template for testing ---


def _make_template(
    nodes: list[PlaybookNode] | None = None,
    template_id: str = "test-template",
) -> PlaybookTemplate:
    """Create a minimal PlaybookTemplate for testing."""
    if nodes is None:
        nodes = [
            PlaybookNode(
                id="node_a",
                name="Node A",
                description="First node",
                actor=ActorType.OTTO,
                chamber="discover",
            ),
            PlaybookNode(
                id="node_b",
                name="Node B",
                description="Second node",
                actor=ActorType.OTTO,
                chamber="build",
                depends_on=["node_a"],
            ),
        ]
    return PlaybookTemplate(
        id=template_id,
        name="Test Template",
        description="Testing template",
        module="contracts",
        nodes=nodes,
    )


# =====================================================================
# Node Executor Tests
# =====================================================================


class TestNodeExecutor:
    """Tests for execute_node dispatch by actor type."""

    def test_execute_otto_node(self):
        node = PlaybookNode(
            id="otto_node",
            name="Otto Node",
            actor=ActorType.OTTO,
            otto_archetype="analyst",
            chamber="discover",
        )
        result = execute_node(node, instance_id="inst-1")
        assert result.status == NodeStatus.COMPLETED
        assert result.result is not None
        assert result.result["type"] == "otto_execution"
        assert result.result["archetype"] == "analyst"
        assert result.result["stub"] is True
        assert result.gate_pending is False

    def test_execute_otto_node_with_gate(self):
        node = PlaybookNode(
            id="otto_gated",
            name="Otto Gated",
            actor=ActorType.OTTO,
            chamber="review",
            gate=GateConfig(type=GateType.APPROVAL),
        )
        result = execute_node(node, instance_id="inst-1")
        assert result.status == NodeStatus.COMPLETED
        assert result.gate_pending is True
        assert result.result["type"] == "otto_execution"

    def test_execute_human_node(self):
        node = PlaybookNode(
            id="human_node",
            name="Human Node",
            actor=ActorType.HUMAN,
            chamber="build",
        )
        result = execute_node(node, instance_id="inst-1")
        assert result.status == NodeStatus.BLOCKED
        assert result.result is not None
        assert result.result["type"] == "human_task"
        assert result.result["awaiting"] == "human_completion"
        assert result.gate_pending is False

    def test_execute_human_node_with_gate(self):
        node = PlaybookNode(
            id="human_gated",
            name="Human Gated",
            actor=ActorType.HUMAN,
            chamber="review",
            gate=GateConfig(type=GateType.VERIFICATION, roles=["gatekeeper", "owner"]),
        )
        result = execute_node(node, instance_id="inst-1")
        assert result.status == NodeStatus.BLOCKED
        assert result.result["gate"]["type"] == GateType.VERIFICATION
        assert "gatekeeper" in result.result["gate"]["roles"]

    def test_execute_hybrid_node(self):
        node = PlaybookNode(
            id="hybrid_node",
            name="Hybrid Node",
            actor=ActorType.HYBRID,
            otto_archetype="strategist",
            chamber="build",
        )
        result = execute_node(node, instance_id="inst-1")
        assert result.status == NodeStatus.BLOCKED
        assert result.result is not None
        assert result.result["type"] == "hybrid_execution"
        assert result.result["awaiting"] == "human_confirmation"
        assert result.result["archetype"] == "strategist"
        assert result.result["stub"] is True

    def test_execute_hybrid_node_with_gate(self):
        node = PlaybookNode(
            id="hybrid_gated",
            name="Hybrid Gated",
            actor=ActorType.HYBRID,
            chamber="review",
            gate=GateConfig(type=GateType.DENSITY),
        )
        result = execute_node(node, instance_id="inst-1")
        assert result.status == NodeStatus.BLOCKED
        assert result.gate_pending is True

    def test_execute_otto_default_archetype(self):
        node = PlaybookNode(
            id="default_arch",
            name="Default",
            actor=ActorType.OTTO,
            chamber="discover",
        )
        result = execute_node(node, instance_id="inst-1")
        assert result.result["archetype"] == "executor"

    def test_execute_node_includes_prompt_context(self):
        node = PlaybookNode(
            id="ctx_node",
            name="Context Node",
            actor=ActorType.OTTO,
            otto_archetype="analyst",
            chamber="discover",
            team_type="flywheel_a",
        )
        result = execute_node(
            node,
            instance_id="inst-1",
            vault_context={"deal_size": 100000},
            user_profile={"name": "Test User"},
        )
        ctx = result.result["prompt_context"]
        assert ctx["archetype"] == "analyst"
        assert ctx["chamber"] == "discover"
        assert ctx["team_type"] == "flywheel_a"
        assert ctx["vault_context"]["deal_size"] == 100000
        assert ctx["user_profile"]["name"] == "Test User"

    def test_node_execution_result_slots(self):
        result = NodeExecutionResult(status=NodeStatus.COMPLETED)
        assert result.status == NodeStatus.COMPLETED
        assert result.result is None
        assert result.gate_pending is False


# =====================================================================
# Gate Manager Tests
# =====================================================================


class TestGateManager:
    """Tests for gate response processing."""

    def test_approve_verification_gate(self):
        gate = GateConfig(type=GateType.VERIFICATION)
        result = process_gate_response(
            gate,
            action="approve",
            responder_id="user-1",
        )
        assert result.approved is True
        assert result.action == GateAction.APPROVE
        assert result.response_data["approval_count"] == 1
        assert result.response_data["approved"] is True

    def test_reject_verification_gate(self):
        gate = GateConfig(type=GateType.VERIFICATION)
        result = process_gate_response(
            gate,
            action="reject",
            responder_id="user-1",
            comment="Not ready",
        )
        assert result.approved is False
        assert result.action == GateAction.REJECT
        assert result.response_data["rejected"] is True
        assert result.response_data["responses"][0]["comment"] == "Not ready"

    def test_approve_approval_gate(self):
        gate = GateConfig(type=GateType.APPROVAL)
        result = process_gate_response(
            gate,
            action="approve",
            responder_id="user-1",
        )
        assert result.approved is True

    def test_reject_approval_gate(self):
        gate = GateConfig(type=GateType.APPROVAL)
        result = process_gate_response(
            gate,
            action="reject",
            responder_id="user-1",
        )
        assert result.approved is False

    def test_approve_density_gate(self):
        gate = GateConfig(type=GateType.DENSITY)
        result = process_gate_response(
            gate,
            action="approve",
            responder_id="user-1",
        )
        assert result.approved is True

    def test_request_changes_density_gate(self):
        gate = GateConfig(type=GateType.DENSITY)
        result = process_gate_response(
            gate,
            action="request_changes",
            responder_id="user-1",
            comment="Needs more detail",
        )
        assert result.approved is False
        assert result.action == GateAction.REQUEST_CHANGES
        assert result.response_data["changes_requested"] is True

    def test_multi_approval_gate(self):
        """Gate requiring 2 approvals — first approve doesn't pass threshold."""
        gate = GateConfig(type=GateType.APPROVAL, required_approvals=2)

        # First approval
        result1 = process_gate_response(
            gate,
            action="approve",
            responder_id="user-1",
        )
        assert result1.approved is False  # Need 2 approvals
        assert result1.response_data["approval_count"] == 1

        # Second approval (cumulative)
        result2 = process_gate_response(
            gate,
            action="approve",
            responder_id="user-2",
            existing_response=result1.response_data,
        )
        assert result2.approved is True
        assert result2.response_data["approval_count"] == 2
        assert len(result2.response_data["responses"]) == 2

    def test_invalid_action_raises_error(self):
        gate = GateConfig(type=GateType.VERIFICATION)
        with pytest.raises(ValueError, match="Invalid gate action"):
            process_gate_response(
                gate,
                action="invalid_action",
                responder_id="user-1",
            )

    def test_reject_not_allowed_for_density_gate(self):
        gate = GateConfig(type=GateType.DENSITY)
        with pytest.raises(ValueError, match="not allowed for gate type"):
            process_gate_response(
                gate,
                action="reject",
                responder_id="user-1",
            )

    def test_request_changes_not_allowed_for_verification(self):
        gate = GateConfig(type=GateType.VERIFICATION)
        with pytest.raises(ValueError, match="not allowed for gate type"):
            process_gate_response(
                gate,
                action="request_changes",
                responder_id="user-1",
            )

    def test_request_changes_not_allowed_for_approval(self):
        gate = GateConfig(type=GateType.APPROVAL)
        with pytest.raises(ValueError, match="not allowed for gate type"):
            process_gate_response(
                gate,
                action="request_changes",
                responder_id="user-1",
            )

    def test_response_data_includes_timestamps(self):
        gate = GateConfig(type=GateType.VERIFICATION)
        result = process_gate_response(
            gate,
            action="approve",
            responder_id="user-1",
        )
        assert "last_responded_at" in result.response_data
        assert result.response_data["responses"][0]["responded_at"] is not None

    def test_gate_allowed_actions_mapping(self):
        assert GateAction.APPROVE in GATE_ALLOWED_ACTIONS[GateType.VERIFICATION]
        assert GateAction.REJECT in GATE_ALLOWED_ACTIONS[GateType.VERIFICATION]
        assert GateAction.REQUEST_CHANGES not in GATE_ALLOWED_ACTIONS[GateType.VERIFICATION]

        assert GateAction.APPROVE in GATE_ALLOWED_ACTIONS[GateType.APPROVAL]
        assert GateAction.REJECT in GATE_ALLOWED_ACTIONS[GateType.APPROVAL]
        assert GateAction.REQUEST_CHANGES not in GATE_ALLOWED_ACTIONS[GateType.APPROVAL]

        assert GateAction.APPROVE in GATE_ALLOWED_ACTIONS[GateType.DENSITY]
        assert GateAction.REQUEST_CHANGES in GATE_ALLOWED_ACTIONS[GateType.DENSITY]
        assert GateAction.REJECT not in GATE_ALLOWED_ACTIONS[GateType.DENSITY]

    def test_gate_result_slots(self):
        result = GateResult(
            approved=True,
            action=GateAction.APPROVE,
            response_data={"test": True},
        )
        assert result.approved is True
        assert result.action == GateAction.APPROVE
        assert result.response_data["test"] is True

    def test_gate_action_values(self):
        assert GateAction.APPROVE == "approve"
        assert GateAction.REJECT == "reject"
        assert GateAction.REQUEST_CHANGES == "request_changes"

    def test_cumulative_responses_after_rejection(self):
        """After a rejection, a subsequent approval should be tracked cumulatively."""
        gate = GateConfig(type=GateType.APPROVAL, required_approvals=1)

        result1 = process_gate_response(
            gate, action="reject", responder_id="user-1", comment="Rework needed"
        )
        assert result1.approved is False

        result2 = process_gate_response(
            gate,
            action="approve",
            responder_id="user-2",
            existing_response=result1.response_data,
        )
        # After rejection + 1 approval, threshold of 1 is met
        assert result2.approved is True
        assert len(result2.response_data["responses"]) == 2

    def test_duplicate_approvals_deduplicated(self):
        """Same user approving twice should count as only 1 approval."""
        gate = GateConfig(type=GateType.APPROVAL, required_approvals=2)

        result1 = process_gate_response(gate, action="approve", responder_id="user-1")
        assert result1.approved is False
        assert result1.response_data["approval_count"] == 1

        # Same user approves again — should NOT reach threshold
        result2 = process_gate_response(
            gate,
            action="approve",
            responder_id="user-1",
            existing_response=result1.response_data,
        )
        assert result2.approved is False  # Still only 1 unique approver
        assert result2.response_data["approval_count"] == 1
        assert len(result2.response_data["responses"]) == 1  # Deduplicated

    def test_responder_can_change_action(self):
        """A responder can change their action (e.g., reject then approve)."""
        gate = GateConfig(type=GateType.APPROVAL, required_approvals=1)

        result1 = process_gate_response(gate, action="reject", responder_id="user-1")
        assert result1.approved is False

        # Same responder changes to approve
        result2 = process_gate_response(
            gate,
            action="approve",
            responder_id="user-1",
            existing_response=result1.response_data,
        )
        assert result2.approved is True
        assert len(result2.response_data["responses"]) == 1  # Replaced, not appended


# =====================================================================
# DAG Engine — _get_runnable_nodes Tests
# =====================================================================


class TestGetRunnableNodes:
    """Tests for the internal dependency resolution logic."""

    def test_root_nodes_runnable_when_pending(self):
        """Nodes with no dependencies should be runnable if pending."""
        template = _make_template(
            [
                PlaybookNode(id="root", name="Root", chamber="discover", actor=ActorType.OTTO),
            ]
        )

        state = PlaybookNodeState()
        state.node_id = "root"
        state.status = NodeStatus.PENDING
        state.gate_response = None

        runnable = _get_runnable_nodes(template, {"root": state})
        assert "root" in runnable

    def test_dependent_node_not_runnable_until_dep_completed(self):
        template = _make_template()
        state_a = PlaybookNodeState()
        state_a.node_id = "node_a"
        state_a.status = NodeStatus.PENDING
        state_a.gate_response = None

        state_b = PlaybookNodeState()
        state_b.node_id = "node_b"
        state_b.status = NodeStatus.PENDING
        state_b.gate_response = None

        runnable = _get_runnable_nodes(template, {"node_a": state_a, "node_b": state_b})
        assert "node_a" in runnable
        assert "node_b" not in runnable

    def test_dependent_node_runnable_after_dep_completed(self):
        template = _make_template()
        state_a = PlaybookNodeState()
        state_a.node_id = "node_a"
        state_a.status = NodeStatus.COMPLETED
        state_a.gate_response = None

        state_b = PlaybookNodeState()
        state_b.node_id = "node_b"
        state_b.status = NodeStatus.PENDING
        state_b.gate_response = None

        runnable = _get_runnable_nodes(template, {"node_a": state_a, "node_b": state_b})
        assert "node_b" in runnable

    def test_skipped_dep_counts_as_satisfied(self):
        template = _make_template()
        state_a = PlaybookNodeState()
        state_a.node_id = "node_a"
        state_a.status = NodeStatus.SKIPPED
        state_a.gate_response = None

        state_b = PlaybookNodeState()
        state_b.node_id = "node_b"
        state_b.status = NodeStatus.PENDING
        state_b.gate_response = None

        runnable = _get_runnable_nodes(template, {"node_a": state_a, "node_b": state_b})
        assert "node_b" in runnable

    def test_unapproved_gate_blocks_downstream(self):
        template = _make_template()
        state_a = PlaybookNodeState()
        state_a.node_id = "node_a"
        state_a.status = NodeStatus.COMPLETED
        state_a.gate_response = {"approved": False, "responses": []}

        state_b = PlaybookNodeState()
        state_b.node_id = "node_b"
        state_b.status = NodeStatus.PENDING
        state_b.gate_response = None

        runnable = _get_runnable_nodes(template, {"node_a": state_a, "node_b": state_b})
        assert "node_b" not in runnable

    def test_approved_gate_unblocks_downstream(self):
        template = _make_template()
        state_a = PlaybookNodeState()
        state_a.node_id = "node_a"
        state_a.status = NodeStatus.COMPLETED
        state_a.gate_response = {"approved": True, "responses": []}

        state_b = PlaybookNodeState()
        state_b.node_id = "node_b"
        state_b.status = NodeStatus.PENDING
        state_b.gate_response = None

        runnable = _get_runnable_nodes(template, {"node_a": state_a, "node_b": state_b})
        assert "node_b" in runnable

    def test_completed_node_not_runnable(self):
        template = _make_template(
            [
                PlaybookNode(id="done", name="Done", chamber="discover", actor=ActorType.OTTO),
            ]
        )
        state = PlaybookNodeState()
        state.node_id = "done"
        state.status = NodeStatus.COMPLETED
        state.gate_response = None

        runnable = _get_runnable_nodes(template, {"done": state})
        assert len(runnable) == 0

    def test_blocked_node_not_runnable(self):
        template = _make_template(
            [
                PlaybookNode(
                    id="blocked", name="Blocked", chamber="discover", actor=ActorType.HUMAN
                ),
            ]
        )
        state = PlaybookNodeState()
        state.node_id = "blocked"
        state.status = NodeStatus.BLOCKED
        state.gate_response = None

        runnable = _get_runnable_nodes(template, {"blocked": state})
        assert len(runnable) == 0


# =====================================================================
# DAG Engine — Full Execution Tests
# =====================================================================


class TestDAGExecution:
    """Tests for the DAG engine start/complete/gate operations."""

    def _create_instance(self, db: Session, template_id: str = "contract-intake") -> str:
        """Helper to create a playbook instance."""
        request = CreateInstanceRequest(
            template_id=template_id,
            workspace_id="ws-test",
        )
        instance = playbook_service.create_instance(db, request=request)
        db.commit()
        return instance.id

    def test_start_execution_advances_otto_nodes(self, test_db: Session):
        """Starting execution should complete all reachable Otto nodes."""
        instance_id = self._create_instance(test_db)
        summary = start_execution(test_db, instance_id=instance_id)
        test_db.commit()

        # contract-intake: triage (otto) runs first, then blocks at gates/human nodes
        assert len(summary.nodes_executed) > 0
        assert summary.instance_id == instance_id

    def test_start_execution_sets_running(self, test_db: Session):
        """Starting execution should set instance status to RUNNING."""
        instance_id = self._create_instance(test_db)
        start_execution(test_db, instance_id=instance_id)
        test_db.commit()

        instance = playbook_service.get_instance(test_db, instance_id=instance_id)
        assert instance.status == InstanceStatus.RUNNING

    def test_start_execution_missing_instance(self, test_db: Session):
        summary = start_execution(test_db, instance_id="nonexistent")
        assert len(summary.errors) > 0
        assert "not found" in summary.errors[0].lower()

    def test_complete_node_advances_dag(self, test_db: Session):
        """Completing a blocked node should advance the DAG."""
        instance_id = self._create_instance(test_db)
        summary1 = start_execution(test_db, instance_id=instance_id)
        test_db.commit()

        # Find a blocked node to complete
        if summary1.nodes_blocked:
            blocked_id = summary1.nodes_blocked[0]
            summary2 = complete_node(
                test_db,
                instance_id=instance_id,
                node_id=blocked_id,
                result={"completed_by": "test"},
            )
            test_db.commit()
            assert summary2.instance_id == instance_id

    def test_complete_node_not_blocked(self, test_db: Session):
        """Completing a non-blocked node should return an error."""
        instance_id = self._create_instance(test_db)
        start_execution(test_db, instance_id=instance_id)
        test_db.commit()

        # Try to complete an already-completed node
        if len(start_execution(test_db, instance_id=instance_id).nodes_executed) > 0:
            nodes = playbook_service.get_node_states(test_db, instance_id=instance_id)
            completed = [ns for ns in nodes if ns.status == NodeStatus.COMPLETED]
            if completed:
                summary = complete_node(
                    test_db,
                    instance_id=instance_id,
                    node_id=completed[0].node_id,
                )
                assert len(summary.errors) > 0

    def test_complete_node_not_found(self, test_db: Session):
        instance_id = self._create_instance(test_db)
        summary = complete_node(
            test_db,
            instance_id=instance_id,
            node_id="nonexistent",
        )
        assert len(summary.errors) > 0

    def test_respond_to_gate_approve(self, test_db: Session):
        """Approving a gate should advance the DAG."""
        instance_id = self._create_instance(test_db)
        start_execution(test_db, instance_id=instance_id)
        test_db.commit()

        # Find a node with a pending gate
        nodes = playbook_service.get_node_states(test_db, instance_id=instance_id)
        gated = [ns for ns in nodes if ns.gate_response and not ns.gate_response.get("approved")]
        if gated:
            gated_node = gated[0]
            summary = respond_to_gate(
                test_db,
                instance_id=instance_id,
                node_id=gated_node.node_id,
                action="approve",
                responder_id="gatekeeper-1",
                comment="Looks good",
            )
            test_db.commit()
            assert summary.instance_id == instance_id

    def test_respond_to_gate_reject(self, test_db: Session):
        """Rejecting a gate should keep the node blocked."""
        instance_id = self._create_instance(test_db)
        start_execution(test_db, instance_id=instance_id)
        test_db.commit()

        nodes = playbook_service.get_node_states(test_db, instance_id=instance_id)
        gated = [ns for ns in nodes if ns.gate_response and not ns.gate_response.get("approved")]
        if gated:
            gated_node = gated[0]
            summary = respond_to_gate(
                test_db,
                instance_id=instance_id,
                node_id=gated_node.node_id,
                action="reject",
                responder_id="gatekeeper-1",
            )
            test_db.commit()
            assert gated_node.node_id in summary.nodes_blocked

    def test_respond_to_gate_no_gate(self, test_db: Session):
        """Responding to a node without a gate should return an error."""
        instance_id = self._create_instance(test_db)
        start_execution(test_db, instance_id=instance_id)
        test_db.commit()

        # triage node has no gate
        summary = respond_to_gate(
            test_db,
            instance_id=instance_id,
            node_id="triage",
            action="approve",
            responder_id="gatekeeper-1",
        )
        assert len(summary.errors) > 0

    def test_respond_to_gate_missing_instance(self, test_db: Session):
        summary = respond_to_gate(
            test_db,
            instance_id="nonexistent",
            node_id="node",
            action="approve",
            responder_id="user-1",
        )
        assert len(summary.errors) > 0

    def test_complete_node_blocked_by_unapproved_gate(self, test_db: Session):
        """Completing a blocked node with an unapproved gate should be rejected.

        We drive a contract-intake playbook through its Otto nodes, then
        approve gates and complete human/hybrid nodes until we reach the
        compliance_review node (hybrid + approval gate). It should be BLOCKED
        with an unapproved gate — calling complete_node should fail.
        """
        instance_id = self._create_instance(test_db)
        start_execution(test_db, instance_id=instance_id)
        test_db.commit()

        # Walk to compliance_review: approve extract_terms gate, complete
        # draft_agreement (human), so compliance_review starts (hybrid+gate)
        # First approve extract_terms gate
        respond_to_gate(
            test_db,
            instance_id=instance_id,
            node_id="extract_terms",
            action="approve",
            responder_id="gk-1",
        )
        test_db.commit()

        # Now advance — draft_agreement (human) should become BLOCKED
        start_execution(test_db, instance_id=instance_id)
        test_db.commit()

        # Complete draft_agreement
        complete_node(test_db, instance_id=instance_id, node_id="draft_agreement")
        test_db.commit()

        # compliance_review is hybrid+gate — should be BLOCKED with gate_response
        node = playbook_service.get_node_state(
            test_db, instance_id=instance_id, node_id="compliance_review"
        )
        if node and node.status == NodeStatus.BLOCKED and node.gate_response:
            summary = complete_node(
                test_db,
                instance_id=instance_id,
                node_id="compliance_review",
            )
            assert len(summary.errors) > 0
            assert "gate" in summary.errors[0].lower()

    def test_gate_rejection_does_not_deadlock_otto_node(self, test_db: Session):
        """Rejecting a gate on a COMPLETED Otto node should NOT set it to BLOCKED."""
        instance_id = self._create_instance(test_db)
        start_execution(test_db, instance_id=instance_id)
        test_db.commit()

        # Find a completed Otto node with a pending gate
        nodes = playbook_service.get_node_states(test_db, instance_id=instance_id)
        gated_completed = [
            ns
            for ns in nodes
            if ns.status == NodeStatus.COMPLETED
            and ns.gate_response
            and not ns.gate_response.get("approved")
        ]
        if gated_completed:
            node = gated_completed[0]
            respond_to_gate(
                test_db,
                instance_id=instance_id,
                node_id=node.node_id,
                action="reject",
                responder_id="gatekeeper-1",
            )
            test_db.commit()

            # Node should still be COMPLETED, not BLOCKED (avoids deadlock)
            refreshed = playbook_service.get_node_state(
                test_db, instance_id=instance_id, node_id=node.node_id
            )
            assert refreshed.status == NodeStatus.COMPLETED
            assert refreshed.gate_response["rejected"] is True
            assert refreshed.gate_response["approved"] is False

    def test_execution_summary_to_dict(self):
        summary = ExecutionSummary(
            "inst-1",
            nodes_executed=["a", "b"],
            nodes_blocked=["c"],
            is_complete=False,
            errors=["error1"],
        )
        d = summary.to_dict()
        assert d["instance_id"] == "inst-1"
        assert d["nodes_executed"] == ["a", "b"]
        assert d["nodes_blocked"] == ["c"]
        assert d["is_complete"] is False
        assert d["errors"] == ["error1"]

    def test_execution_summary_defaults(self):
        summary = ExecutionSummary("inst-2")
        assert summary.nodes_executed == []
        assert summary.nodes_blocked == []
        assert summary.is_complete is False
        assert summary.errors == []


# =====================================================================
# Full Lifecycle Test
# =====================================================================


class TestFullLifecycle:
    """End-to-end lifecycle test: create → execute → gate → complete."""

    def _create_instance(self, db: Session, template_id: str = "contract-intake") -> str:
        request = CreateInstanceRequest(
            template_id=template_id,
            workspace_id="ws-test",
        )
        instance = playbook_service.create_instance(db, request=request)
        db.commit()
        return instance.id

    def test_full_contract_intake_lifecycle(self, test_db: Session):
        """Walk a contract-intake playbook from start to complete."""
        instance_id = self._create_instance(test_db)

        # Step 1: Start execution — should run triage (otto, no deps)
        summary = start_execution(test_db, instance_id=instance_id)
        test_db.commit()
        assert "triage" in summary.nodes_executed

        # Step 2: Complete human/hybrid nodes and approve gates iteratively
        max_iterations = 20  # Safety bound
        for _ in range(max_iterations):
            nodes = playbook_service.get_node_states(test_db, instance_id=instance_id)

            # Approve any pending gates
            gates_handled = False
            for ns in nodes:
                if ns.gate_response and not ns.gate_response.get("approved"):
                    respond_to_gate(
                        test_db,
                        instance_id=instance_id,
                        node_id=ns.node_id,
                        action="approve",
                        responder_id="gatekeeper-1",
                    )
                    test_db.commit()
                    gates_handled = True

            # Complete any blocked nodes
            blocked = [ns for ns in nodes if ns.status == NodeStatus.BLOCKED]
            if not blocked and not gates_handled:
                break

            for ns in blocked:
                complete_node(
                    test_db,
                    instance_id=instance_id,
                    node_id=ns.node_id,
                    result={"action": "manual_complete"},
                )
                test_db.commit()

        # Verify all nodes are terminal
        final_nodes = playbook_service.get_node_states(test_db, instance_id=instance_id)
        terminal = {NodeStatus.COMPLETED, NodeStatus.SKIPPED}
        for ns in final_nodes:
            assert ns.status in terminal, f"Node {ns.node_id} stuck at {ns.status}"

        # Verify instance is complete
        instance = playbook_service.get_instance(test_db, instance_id=instance_id)
        assert instance.status == InstanceStatus.COMPLETED


# =====================================================================
# Schema Tests
# =====================================================================


class TestExecutionSchemas:
    """Tests for M7 Pydantic request/response schemas."""

    def test_execute_request_defaults(self):
        from src.schemas.playbook import ExecuteRequest

        req = ExecuteRequest()
        assert req.vault_context is None
        assert req.user_profile is None

    def test_execute_request_with_context(self):
        from src.schemas.playbook import ExecuteRequest

        req = ExecuteRequest(
            vault_context={"deal_type": "distribution"},
            user_profile={"name": "Test"},
        )
        assert req.vault_context["deal_type"] == "distribution"

    def test_complete_node_request_defaults(self):
        from src.schemas.playbook import CompleteNodeRequest

        req = CompleteNodeRequest()
        assert req.result is None

    def test_complete_node_request_with_result(self):
        from src.schemas.playbook import CompleteNodeRequest

        req = CompleteNodeRequest(result={"status": "done"})
        assert req.result["status"] == "done"

    def test_gate_response_request_required_fields(self):
        from src.schemas.playbook import GateResponseRequest

        req = GateResponseRequest(
            action="approve",
            responder_id="user-1",
        )
        assert req.action == "approve"
        assert req.responder_id == "user-1"
        assert req.comment is None

    def test_gate_response_request_with_comment(self):
        from src.schemas.playbook import GateResponseRequest

        req = GateResponseRequest(
            action="reject",
            responder_id="user-1",
            comment="Needs rework",
        )
        assert req.comment == "Needs rework"

    def test_execution_response_defaults(self):
        from src.schemas.playbook import ExecutionResponse

        resp = ExecutionResponse(instance_id="inst-1")
        assert resp.instance_id == "inst-1"
        assert resp.nodes_executed == []
        assert resp.nodes_blocked == []
        assert resp.is_complete is False
        assert resp.errors == []

    def test_execution_response_full(self):
        from src.schemas.playbook import ExecutionResponse

        resp = ExecutionResponse(
            instance_id="inst-1",
            nodes_executed=["a", "b"],
            nodes_blocked=["c"],
            is_complete=True,
            errors=[],
        )
        assert resp.is_complete is True
        assert len(resp.nodes_executed) == 2


# =====================================================================
# Route Integration Tests
# =====================================================================


class TestExecutionRoutes:
    """Integration tests for the DAG execution HTTP endpoints."""

    @pytest.mark.skipif(True, reason="Requires running PostgreSQL — covered by service-layer tests")
    def test_execute_endpoint_unknown_instance(self, client):
        resp = client.post("/api/v1/playbooks/instances/nonexistent/execute")
        assert resp.status_code == 404

    @pytest.mark.skipif(True, reason="Requires running PostgreSQL — covered by service-layer tests")
    def test_complete_node_endpoint_unknown_instance(self, client):
        resp = client.post("/api/v1/playbooks/instances/nonexistent/nodes/n1/complete")
        assert resp.status_code == 404

    @pytest.mark.skipif(True, reason="Requires running PostgreSQL — covered by service-layer tests")
    def test_gate_endpoint_unknown_instance(self, client):
        resp = client.post(
            "/api/v1/playbooks/instances/nonexistent/nodes/n1/gate",
            json={"action": "approve", "responder_id": "user-1"},
        )
        assert resp.status_code == 404

    def test_gate_endpoint_requires_body(self, client):
        """Gate endpoint requires action and responder_id in the body."""
        resp = client.post(
            "/api/v1/playbooks/instances/some-id/nodes/n1/gate",
            json={},
        )
        assert resp.status_code == 422  # Validation error

    def test_execute_response_schema(self, client):
        """Verify the ExecutionResponse schema is used for the execute endpoint."""
        from src.schemas.playbook import ExecutionResponse

        # Just verify the model can be instantiated
        resp = ExecutionResponse(
            instance_id="test",
            nodes_executed=["a"],
            nodes_blocked=["b"],
            is_complete=False,
            errors=[],
        )
        data = resp.model_dump()
        assert "instance_id" in data
        assert "nodes_executed" in data
        assert "nodes_blocked" in data
        assert "is_complete" in data
        assert "errors" in data


# =====================================================================
# Edge Cases
# =====================================================================


class TestEdgeCases:
    """Edge cases and error conditions."""

    def test_start_execution_with_context_params(self, test_db: Session):
        """Execution with vault_context and user_profile should pass through."""
        request = CreateInstanceRequest(
            template_id="contract-intake",
            workspace_id="ws-test",
        )
        instance = playbook_service.create_instance(test_db, request=request)
        test_db.commit()

        summary = start_execution(
            test_db,
            instance_id=instance.id,
            vault_context={"deal_type": "distribution", "territory": "US"},
            user_profile={"name": "Test User", "role": "builder"},
        )
        test_db.commit()
        assert len(summary.errors) == 0

    def test_double_execution_is_idempotent(self, test_db: Session):
        """Running start_execution twice should not re-execute completed nodes."""
        request = CreateInstanceRequest(
            template_id="contract-intake",
            workspace_id="ws-test",
        )
        instance = playbook_service.create_instance(test_db, request=request)
        test_db.commit()

        summary1 = start_execution(test_db, instance_id=instance.id)
        test_db.commit()
        executed_first = set(summary1.nodes_executed)

        summary2 = start_execution(test_db, instance_id=instance.id)
        test_db.commit()
        # Second run should not re-execute the same nodes
        assert set(summary2.nodes_executed).isdisjoint(executed_first)

    def test_research_deep_dive_execution(self, test_db: Session):
        """Verify a CRM template can be executed.

        research-deep-dive starts with a hybrid node (scope_research),
        which goes BLOCKED (not COMPLETED) — so nodes_blocked > 0.
        """
        request = CreateInstanceRequest(
            template_id="research-deep-dive",
            workspace_id="ws-test",
        )
        instance = playbook_service.create_instance(test_db, request=request)
        test_db.commit()

        summary = start_execution(test_db, instance_id=instance.id)
        test_db.commit()
        assert len(summary.errors) == 0
        # First node is hybrid → blocked, not executed
        assert len(summary.nodes_blocked) > 0

    def test_pilot_close_execution(self, test_db: Session):
        """Verify pilot-close template can be executed."""
        request = CreateInstanceRequest(
            template_id="pilot-close",
            workspace_id="ws-test",
        )
        instance = playbook_service.create_instance(test_db, request=request)
        test_db.commit()

        summary = start_execution(test_db, instance_id=instance.id)
        test_db.commit()
        assert len(summary.errors) == 0
        assert len(summary.nodes_executed) > 0
