"""Playbook Templates + Storage tests (M6).

Tests the full playbook pipeline:
- Template YAML loading and validation (all 3 templates)
- Template schema validation (required fields, valid enums)
- DAG validation (no cycles, valid depends_on references)
- Pydantic schema validation (request/response models)
- Model smoke tests (table names, imports)
- Service layer CRUD (with in-memory SQLite)
- Instance creation from template with node initialization
- Node state updates and status transitions
- Route integration tests via TestClient

Coverage targets:
- Template loading: list, get, cache clear
- DAG validation: cycles, unknown deps, valid graphs
- Instance create / get / list / update
- Node state get / update
- Error handling (unknown template, not found, invalid status)
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
    PlaybookTemplateSummary,
    TemplateListResponse,
    UpdateInstanceRequest,
    UpdateNodeStateRequest,
)
from src.services import playbook as playbook_service
from src.services.playbooks.template_loader import (
    clear_template_cache,
    get_all_templates,
    get_template,
    list_templates,
)

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

    # Only create playbook tables
    tables = [
        PlaybookInstance.__table__,
        PlaybookNodeState.__table__,
    ]
    # Replace JSONB with JSON for SQLite compatibility
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


# =====================================================================
# Template Loading Tests
# =====================================================================


class TestTemplateLoading:
    """Tests for loading YAML templates from disk."""

    def test_list_templates_returns_three(self):
        templates = list_templates()
        assert len(templates) == 3

    def test_list_templates_returns_summaries(self):
        templates = list_templates()
        for t in templates:
            assert isinstance(t, PlaybookTemplateSummary)
            assert t.id
            assert t.name
            assert t.node_count > 0

    def test_get_template_contract_intake(self):
        template = get_template("contract-intake")
        assert template is not None
        assert template.id == "contract-intake"
        assert template.name == "Contract Intake"
        assert template.module == "contracts"
        assert len(template.nodes) == 7
        assert template.gate_count() == 2

    def test_get_template_pilot_close(self):
        template = get_template("pilot-close")
        assert template is not None
        assert template.id == "pilot-close"
        assert template.name == "Pilot Close"
        assert template.module == "contracts"
        assert len(template.nodes) == 6
        assert template.gate_count() == 2

    def test_get_template_research_deep_dive(self):
        template = get_template("research-deep-dive")
        assert template is not None
        assert template.id == "research-deep-dive"
        assert template.name == "Research Deep Dive"
        assert template.module == "crm"
        assert len(template.nodes) == 8
        assert template.gate_count() == 3

    def test_get_template_unknown_returns_none(self):
        result = get_template("nonexistent-template")
        assert result is None

    def test_get_all_templates(self):
        templates = get_all_templates()
        assert len(templates) == 3
        assert all(isinstance(t, PlaybookTemplate) for t in templates)

    def test_template_cache_clear(self):
        """Cache clear should allow re-loading templates."""
        templates_1 = list_templates()
        clear_template_cache()
        templates_2 = list_templates()
        assert len(templates_1) == len(templates_2)


# =====================================================================
# Template Node & DAG Validation Tests
# =====================================================================


class TestTemplateValidation:
    """Tests for playbook template validation."""

    def test_all_templates_have_valid_dags(self):
        """All loaded templates should pass DAG validation."""
        templates = get_all_templates()
        for t in templates:
            errors = t.validate_dag()
            assert errors == [], f"Template '{t.id}' has DAG errors: {errors}"

    def test_all_nodes_have_valid_chambers(self):
        """All nodes should have a chamber field."""
        templates = get_all_templates()
        for t in templates:
            for node in t.nodes:
                assert node.chamber in {"discover", "build", "review", "ship"}

    def test_all_nodes_have_valid_actor_types(self):
        """All nodes should have valid actor types."""
        templates = get_all_templates()
        for t in templates:
            for node in t.nodes:
                assert node.actor in {ActorType.OTTO, ActorType.HUMAN, ActorType.HYBRID}

    def test_contract_intake_dag_structure(self):
        """Verify the contract-intake DAG dependencies."""
        template = get_template("contract-intake")
        assert template is not None
        node_map = {n.id: n for n in template.nodes}

        # First node has no dependencies
        assert node_map["triage"].depends_on == []
        # Research depends on triage
        assert "triage" in node_map["research"].depends_on
        # Last node depends on stakeholder_alignment
        assert "stakeholder_alignment" in node_map["publish_distribute"].depends_on

    def test_research_deep_dive_has_parallel_nodes(self):
        """Research deep dive should have parallel gather nodes."""
        template = get_template("research-deep-dive")
        assert template is not None
        node_map = {n.id: n for n in template.nodes}

        # Both gather nodes depend on scope_research
        assert node_map["gather_public"].depends_on == ["scope_research"]
        assert node_map["gather_internal"].depends_on == ["scope_research"]

        # Analyze depends on both gather nodes
        assert "gather_public" in node_map["analyze_findings"].depends_on
        assert "gather_internal" in node_map["analyze_findings"].depends_on

    def test_dag_detects_unknown_dependency(self):
        """DAG validation should catch unknown dependencies."""
        template = PlaybookTemplate(
            id="test-bad-dep",
            name="Test Bad Dep",
            module="contracts",
            nodes=[
                PlaybookNode(
                    id="node1",
                    name="Node 1",
                    chamber="discover",
                    depends_on=["nonexistent"],
                ),
            ],
        )
        errors = template.validate_dag()
        assert len(errors) == 1
        assert "nonexistent" in errors[0]

    def test_dag_detects_cycle(self):
        """DAG validation should detect cycles."""
        template = PlaybookTemplate(
            id="test-cycle",
            name="Test Cycle",
            module="contracts",
            nodes=[
                PlaybookNode(
                    id="a",
                    name="A",
                    chamber="discover",
                    depends_on=["b"],
                ),
                PlaybookNode(
                    id="b",
                    name="B",
                    chamber="build",
                    depends_on=["a"],
                ),
            ],
        )
        errors = template.validate_dag()
        assert any("cycle" in e.lower() for e in errors)

    def test_valid_dag_returns_no_errors(self):
        """Valid DAG should have no errors."""
        template = PlaybookTemplate(
            id="test-valid",
            name="Test Valid",
            module="contracts",
            nodes=[
                PlaybookNode(id="a", name="A", chamber="discover", depends_on=[]),
                PlaybookNode(id="b", name="B", chamber="build", depends_on=["a"]),
                PlaybookNode(id="c", name="C", chamber="review", depends_on=["a", "b"]),
            ],
        )
        errors = template.validate_dag()
        assert errors == []

    def test_template_node_ids(self):
        """node_ids() should return all node IDs."""
        template = get_template("contract-intake")
        assert template is not None
        ids = template.node_ids()
        assert "triage" in ids
        assert "publish_distribute" in ids
        assert len(ids) == 7


# =====================================================================
# Gate Configuration Tests
# =====================================================================


class TestGateConfig:
    """Tests for gate configurations in templates."""

    def test_contract_intake_gates(self):
        """Contract intake should have 2 gates."""
        template = get_template("contract-intake")
        assert template is not None
        gated_nodes = [n for n in template.nodes if n.gate is not None]
        assert len(gated_nodes) == 2

        gate_types = {n.id: n.gate.type for n in gated_nodes}
        assert gate_types["extract_terms"] == GateType.VERIFICATION
        assert gate_types["compliance_review"] == GateType.APPROVAL

    def test_pilot_close_gates(self):
        """Pilot close should have 2 gates."""
        template = get_template("pilot-close")
        assert template is not None
        gated_nodes = [n for n in template.nodes if n.gate is not None]
        assert len(gated_nodes) == 2

    def test_research_deep_dive_gates(self):
        """Research deep dive should have 3 gates."""
        template = get_template("research-deep-dive")
        assert template is not None
        gated_nodes = [n for n in template.nodes if n.gate is not None]
        assert len(gated_nodes) == 3

    def test_gate_required_approvals(self):
        """All gates should have at least 1 required approval."""
        templates = get_all_templates()
        for t in templates:
            for node in t.nodes:
                if node.gate:
                    assert node.gate.required_approvals >= 1

    def test_gate_roles_non_empty(self):
        """All gates should have at least one role."""
        templates = get_all_templates()
        for t in templates:
            for node in t.nodes:
                if node.gate:
                    assert len(node.gate.roles) > 0

    def test_gate_config_schema(self):
        """GateConfig should validate correctly."""
        gate = GateConfig(
            type=GateType.VERIFICATION,
            required_approvals=2,
            roles=["gatekeeper", "owner"],
            description="Test gate",
        )
        assert gate.type == GateType.VERIFICATION
        assert gate.required_approvals == 2
        assert len(gate.roles) == 2


# =====================================================================
# Schema Validation Tests
# =====================================================================


class TestPlaybookSchemas:
    """Tests for Pydantic request/response schemas."""

    def test_create_instance_request_valid(self):
        req = CreateInstanceRequest(
            template_id="contract-intake",
            workspace_id="ws-123",
            vault_id="vault-456",
        )
        assert req.template_id == "contract-intake"
        assert req.workspace_id == "ws-123"

    def test_create_instance_request_no_vault(self):
        req = CreateInstanceRequest(
            template_id="pilot-close",
            workspace_id="ws-123",
        )
        assert req.vault_id is None

    def test_update_instance_request_status(self):
        req = UpdateInstanceRequest(status=InstanceStatus.RUNNING)
        assert req.status == InstanceStatus.RUNNING

    def test_update_node_state_request(self):
        req = UpdateNodeStateRequest(
            status=NodeStatus.COMPLETED,
            result={"summary": "Analysis complete"},
            gate_response={"approved": True},
        )
        assert req.status == NodeStatus.COMPLETED
        assert req.result["summary"] == "Analysis complete"

    def test_instance_status_enum_values(self):
        assert InstanceStatus.DRAFT == "draft"
        assert InstanceStatus.RUNNING == "running"
        assert InstanceStatus.PAUSED == "paused"
        assert InstanceStatus.COMPLETED == "completed"
        assert InstanceStatus.CANCELLED == "cancelled"

    def test_node_status_enum_values(self):
        assert NodeStatus.PENDING == "pending"
        assert NodeStatus.IN_PROGRESS == "in_progress"
        assert NodeStatus.COMPLETED == "completed"
        assert NodeStatus.SKIPPED == "skipped"
        assert NodeStatus.BLOCKED == "blocked"

    def test_actor_type_enum_values(self):
        assert ActorType.OTTO == "otto"
        assert ActorType.HUMAN == "human"
        assert ActorType.HYBRID == "hybrid"

    def test_gate_type_enum_values(self):
        assert GateType.VERIFICATION == "verification"
        assert GateType.APPROVAL == "approval"
        assert GateType.DENSITY == "density"

    def test_template_summary_from_template(self):
        """Template summary should be creatable from template data."""
        summary = PlaybookTemplateSummary(
            id="test",
            name="Test Template",
            description="A test",
            module="contracts",
            version="1.0",
            node_count=5,
            gate_count=2,
        )
        assert summary.node_count == 5

    def test_template_list_response(self):
        templates = list_templates()
        response = TemplateListResponse(templates=templates, total=len(templates))
        assert response.total == 3


# =====================================================================
# Model Smoke Tests
# =====================================================================


class TestPlaybookModels:
    """Verify ORM models are importable and have correct table names."""

    def test_playbook_instance_tablename(self):
        assert PlaybookInstance.__tablename__ == "playbook_instances"

    def test_playbook_node_state_tablename(self):
        assert PlaybookNodeState.__tablename__ == "playbook_node_states"

    def test_models_importable_from_init(self):
        """Both playbook models should be in src.models.__init__."""
        from src.models import PlaybookInstance, PlaybookNodeState

        assert PlaybookInstance is not None
        assert PlaybookNodeState is not None


# =====================================================================
# Service Layer Tests (in-memory SQLite)
# =====================================================================


class TestPlaybookService:
    """Tests for the playbook service layer."""

    def test_create_instance_from_template(self, test_db):
        """Creating an instance should initialize all node states."""
        req = CreateInstanceRequest(
            template_id="contract-intake",
            workspace_id="ws-test",
            vault_id="vault-test",
        )
        instance = playbook_service.create_instance(test_db, request=req)
        test_db.commit()

        assert instance.id is not None
        assert instance.workspace_id == "ws-test"
        assert instance.template_id == "contract-intake"
        assert instance.vault_id == "vault-test"
        assert instance.status == InstanceStatus.DRAFT

    def test_create_instance_initializes_nodes(self, test_db):
        """Node states should match template nodes."""
        req = CreateInstanceRequest(
            template_id="contract-intake",
            workspace_id="ws-test",
        )
        instance = playbook_service.create_instance(test_db, request=req)
        test_db.commit()

        node_states = playbook_service.get_node_states(test_db, instance_id=instance.id)
        assert len(node_states) == 7  # contract-intake has 7 nodes

        # All should start as pending
        for ns in node_states:
            assert ns.status == NodeStatus.PENDING
            assert ns.instance_id == instance.id
            assert ns.workspace_id == "ws-test"

    def test_create_instance_unknown_template(self, test_db):
        """Should raise ValueError for unknown template."""
        req = CreateInstanceRequest(
            template_id="nonexistent",
            workspace_id="ws-test",
        )
        with pytest.raises(ValueError, match="Unknown template"):
            playbook_service.create_instance(test_db, request=req)

    def test_get_instance(self, test_db):
        """Should retrieve instance by ID."""
        req = CreateInstanceRequest(
            template_id="pilot-close",
            workspace_id="ws-test",
        )
        instance = playbook_service.create_instance(test_db, request=req)
        test_db.commit()

        fetched = playbook_service.get_instance(test_db, instance_id=instance.id)
        assert fetched is not None
        assert fetched.id == instance.id
        assert fetched.template_id == "pilot-close"

    def test_get_instance_not_found(self, test_db):
        """Should return None for unknown instance."""
        result = playbook_service.get_instance(test_db, instance_id="nonexistent")
        assert result is None

    def test_list_instances_by_workspace(self, test_db):
        """Should list instances filtered by workspace."""
        # Create instances in two workspaces
        for template in ["contract-intake", "pilot-close"]:
            playbook_service.create_instance(
                test_db,
                request=CreateInstanceRequest(
                    template_id=template,
                    workspace_id="ws-1",
                ),
            )
        playbook_service.create_instance(
            test_db,
            request=CreateInstanceRequest(
                template_id="research-deep-dive",
                workspace_id="ws-2",
            ),
        )
        test_db.commit()

        instances_1, total_1 = playbook_service.list_instances(test_db, workspace_id="ws-1")
        assert total_1 == 2
        assert len(instances_1) == 2

        instances_2, total_2 = playbook_service.list_instances(test_db, workspace_id="ws-2")
        assert total_2 == 1
        assert len(instances_2) == 1

    def test_list_instances_by_vault(self, test_db):
        """Should filter instances by vault_id."""
        playbook_service.create_instance(
            test_db,
            request=CreateInstanceRequest(
                template_id="contract-intake",
                workspace_id="ws-1",
                vault_id="vault-a",
            ),
        )
        playbook_service.create_instance(
            test_db,
            request=CreateInstanceRequest(
                template_id="pilot-close",
                workspace_id="ws-1",
                vault_id="vault-b",
            ),
        )
        test_db.commit()

        instances, total = playbook_service.list_instances(
            test_db, workspace_id="ws-1", vault_id="vault-a"
        )
        assert total == 1
        assert instances[0].vault_id == "vault-a"

    def test_update_instance_to_running(self, test_db):
        """Updating to RUNNING should set started_at."""
        req = CreateInstanceRequest(
            template_id="contract-intake",
            workspace_id="ws-test",
        )
        instance = playbook_service.create_instance(test_db, request=req)
        test_db.commit()

        assert instance.started_at is None

        updated = playbook_service.update_instance(
            test_db,
            instance_id=instance.id,
            request=UpdateInstanceRequest(status=InstanceStatus.RUNNING),
        )
        test_db.commit()

        assert updated.status == InstanceStatus.RUNNING
        assert updated.started_at is not None

    def test_update_instance_to_completed(self, test_db):
        """Updating to COMPLETED should set completed_at."""
        req = CreateInstanceRequest(
            template_id="contract-intake",
            workspace_id="ws-test",
        )
        instance = playbook_service.create_instance(test_db, request=req)
        test_db.commit()

        # First set to running
        playbook_service.update_instance(
            test_db,
            instance_id=instance.id,
            request=UpdateInstanceRequest(status=InstanceStatus.RUNNING),
        )
        # Then complete
        updated = playbook_service.update_instance(
            test_db,
            instance_id=instance.id,
            request=UpdateInstanceRequest(status=InstanceStatus.COMPLETED),
        )
        test_db.commit()

        assert updated.status == InstanceStatus.COMPLETED
        assert updated.completed_at is not None

    def test_update_instance_not_found(self, test_db):
        """Should raise ValueError for unknown instance."""
        with pytest.raises(ValueError, match="Instance not found"):
            playbook_service.update_instance(
                test_db,
                instance_id="nonexistent",
                request=UpdateInstanceRequest(status=InstanceStatus.RUNNING),
            )

    def test_node_states_have_correct_actors(self, test_db):
        """Node states should carry actor and archetype from template."""
        req = CreateInstanceRequest(
            template_id="contract-intake",
            workspace_id="ws-test",
        )
        instance = playbook_service.create_instance(test_db, request=req)
        test_db.commit()

        node_states = playbook_service.get_node_states(test_db, instance_id=instance.id)
        node_map = {ns.node_id: ns for ns in node_states}

        # triage is otto/analyst
        assert node_map["triage"].actor == "otto"
        assert node_map["triage"].archetype == "analyst"

        # stakeholder_alignment is human/connector
        assert node_map["stakeholder_alignment"].actor == "human"
        assert node_map["stakeholder_alignment"].archetype == "connector"

    def test_get_node_state(self, test_db):
        """Should get a specific node state by instance + node ID."""
        req = CreateInstanceRequest(
            template_id="contract-intake",
            workspace_id="ws-test",
        )
        instance = playbook_service.create_instance(test_db, request=req)
        test_db.commit()

        ns = playbook_service.get_node_state(test_db, instance_id=instance.id, node_id="triage")
        assert ns is not None
        assert ns.node_id == "triage"
        assert ns.status == NodeStatus.PENDING

    def test_get_node_state_not_found(self, test_db):
        """Should return None for unknown node."""
        req = CreateInstanceRequest(
            template_id="contract-intake",
            workspace_id="ws-test",
        )
        instance = playbook_service.create_instance(test_db, request=req)
        test_db.commit()

        ns = playbook_service.get_node_state(
            test_db, instance_id=instance.id, node_id="nonexistent"
        )
        assert ns is None

    def test_update_node_state_to_in_progress(self, test_db):
        """Updating node to IN_PROGRESS should set started_at."""
        req = CreateInstanceRequest(
            template_id="contract-intake",
            workspace_id="ws-test",
        )
        instance = playbook_service.create_instance(test_db, request=req)
        test_db.commit()

        updated = playbook_service.update_node_state(
            test_db,
            instance_id=instance.id,
            node_id="triage",
            request=UpdateNodeStateRequest(status=NodeStatus.IN_PROGRESS),
        )
        test_db.commit()

        assert updated.status == NodeStatus.IN_PROGRESS
        assert updated.started_at is not None

    def test_update_node_state_to_completed(self, test_db):
        """Updating node to COMPLETED should set completed_at."""
        req = CreateInstanceRequest(
            template_id="contract-intake",
            workspace_id="ws-test",
        )
        instance = playbook_service.create_instance(test_db, request=req)
        test_db.commit()

        playbook_service.update_node_state(
            test_db,
            instance_id=instance.id,
            node_id="triage",
            request=UpdateNodeStateRequest(status=NodeStatus.IN_PROGRESS),
        )
        updated = playbook_service.update_node_state(
            test_db,
            instance_id=instance.id,
            node_id="triage",
            request=UpdateNodeStateRequest(
                status=NodeStatus.COMPLETED,
                result={"classification": "Distribution Agreement", "risk": "low"},
            ),
        )
        test_db.commit()

        assert updated.status == NodeStatus.COMPLETED
        assert updated.completed_at is not None
        assert updated.result["classification"] == "Distribution Agreement"

    def test_update_node_state_with_gate_response(self, test_db):
        """Should store gate response data."""
        req = CreateInstanceRequest(
            template_id="contract-intake",
            workspace_id="ws-test",
        )
        instance = playbook_service.create_instance(test_db, request=req)
        test_db.commit()

        updated = playbook_service.update_node_state(
            test_db,
            instance_id=instance.id,
            node_id="extract_terms",
            request=UpdateNodeStateRequest(
                gate_response={
                    "approved": True,
                    "approver_id": "user-456",
                    "comment": "Terms verified",
                },
            ),
        )
        test_db.commit()

        assert updated.gate_response is not None
        assert updated.gate_response["approved"] is True

    def test_update_node_state_not_found(self, test_db):
        """Should raise ValueError for unknown node."""
        req = CreateInstanceRequest(
            template_id="contract-intake",
            workspace_id="ws-test",
        )
        instance = playbook_service.create_instance(test_db, request=req)
        test_db.commit()

        with pytest.raises(ValueError, match="Node state not found"):
            playbook_service.update_node_state(
                test_db,
                instance_id=instance.id,
                node_id="nonexistent",
                request=UpdateNodeStateRequest(status=NodeStatus.COMPLETED),
            )

    def test_pilot_close_node_initialization(self, test_db):
        """Pilot close should initialize 6 node states."""
        req = CreateInstanceRequest(
            template_id="pilot-close",
            workspace_id="ws-test",
        )
        instance = playbook_service.create_instance(test_db, request=req)
        test_db.commit()

        node_states = playbook_service.get_node_states(test_db, instance_id=instance.id)
        assert len(node_states) == 6

    def test_research_deep_dive_node_initialization(self, test_db):
        """Research deep dive should initialize 8 node states."""
        req = CreateInstanceRequest(
            template_id="research-deep-dive",
            workspace_id="ws-test",
        )
        instance = playbook_service.create_instance(test_db, request=req)
        test_db.commit()

        node_states = playbook_service.get_node_states(test_db, instance_id=instance.id)
        assert len(node_states) == 8

    def test_instance_cancelled_sets_completed_at(self, test_db):
        """Cancelling should also set completed_at."""
        req = CreateInstanceRequest(
            template_id="contract-intake",
            workspace_id="ws-test",
        )
        instance = playbook_service.create_instance(test_db, request=req)
        test_db.commit()

        updated = playbook_service.update_instance(
            test_db,
            instance_id=instance.id,
            request=UpdateInstanceRequest(status=InstanceStatus.CANCELLED),
        )
        test_db.commit()

        assert updated.status == InstanceStatus.CANCELLED
        assert updated.completed_at is not None

    def test_node_skipped_sets_completed_at(self, test_db):
        """Skipping a node should set completed_at."""
        req = CreateInstanceRequest(
            template_id="contract-intake",
            workspace_id="ws-test",
        )
        instance = playbook_service.create_instance(test_db, request=req)
        test_db.commit()

        updated = playbook_service.update_node_state(
            test_db,
            instance_id=instance.id,
            node_id="research",
            request=UpdateNodeStateRequest(status=NodeStatus.SKIPPED),
        )
        test_db.commit()

        assert updated.status == NodeStatus.SKIPPED
        assert updated.completed_at is not None


# =====================================================================
# Route Integration Tests
# =====================================================================


class TestPlaybookRoutes:
    """Integration tests via TestClient."""

    def test_list_templates_route(self, client):
        resp = client.get("/api/v1/playbooks/templates")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 3
        assert len(data["templates"]) == 3

    def test_get_template_route(self, client):
        resp = client.get("/api/v1/playbooks/templates/contract-intake")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "contract-intake"
        assert data["name"] == "Contract Intake"
        assert len(data["nodes"]) == 7

    def test_get_template_not_found_route(self, client):
        resp = client.get("/api/v1/playbooks/templates/nonexistent")
        assert resp.status_code == 404

    def test_template_node_details(self, client):
        """Template response should include full node details."""
        resp = client.get("/api/v1/playbooks/templates/contract-intake")
        assert resp.status_code == 200
        data = resp.json()

        # Find the triage node
        triage = next(n for n in data["nodes"] if n["id"] == "triage")
        assert triage["actor"] == "otto"
        assert triage["otto_archetype"] == "analyst"
        assert triage["chamber"] == "discover"
        assert triage["depends_on"] == []

    def test_template_gate_details(self, client):
        """Template response should include gate configs."""
        resp = client.get("/api/v1/playbooks/templates/contract-intake")
        assert resp.status_code == 200
        data = resp.json()

        # Find the extract_terms node (has a gate)
        extract = next(n for n in data["nodes"] if n["id"] == "extract_terms")
        assert extract["gate"] is not None
        assert extract["gate"]["type"] == "verification"
        assert extract["gate"]["required_approvals"] == 1

    def test_list_templates_summary_fields(self, client):
        """Template list should include summary fields."""
        resp = client.get("/api/v1/playbooks/templates")
        data = resp.json()

        for t in data["templates"]:
            assert "id" in t
            assert "name" in t
            assert "module" in t
            assert "node_count" in t
            assert "gate_count" in t
            assert t["node_count"] > 0


# =====================================================================
# Edge Cases
# =====================================================================


class TestEdgeCases:
    """Edge case tests."""

    def test_empty_depends_on(self):
        """Node with empty depends_on should be valid."""
        node = PlaybookNode(
            id="root",
            name="Root",
            chamber="discover",
            depends_on=[],
        )
        assert node.depends_on == []

    def test_node_without_gate(self):
        """Most nodes should have gate=None."""
        node = PlaybookNode(
            id="simple",
            name="Simple Node",
            chamber="build",
        )
        assert node.gate is None

    def test_node_with_all_fields(self):
        """Node with all fields populated."""
        node = PlaybookNode(
            id="full",
            name="Full Node",
            description="A fully specified node",
            actor=ActorType.HYBRID,
            otto_archetype="strategist",
            chamber="review",
            team_type="exploring",
            depends_on=["a", "b"],
            gate=GateConfig(
                type=GateType.APPROVAL,
                required_approvals=2,
                roles=["gatekeeper", "owner"],
                description="Final approval",
            ),
        )
        assert node.actor == ActorType.HYBRID
        assert node.gate is not None
        assert node.gate.required_approvals == 2

    def test_template_with_single_node(self):
        """Single-node template should be valid."""
        template = PlaybookTemplate(
            id="minimal",
            name="Minimal",
            module="contracts",
            nodes=[
                PlaybookNode(id="only", name="Only Node", chamber="discover"),
            ],
        )
        assert template.validate_dag() == []
        assert template.gate_count() == 0
        assert len(template.node_ids()) == 1

    def test_multiple_instances_same_template(self, test_db):
        """Should support multiple instances from same template."""
        for i in range(3):
            playbook_service.create_instance(
                test_db,
                request=CreateInstanceRequest(
                    template_id="contract-intake",
                    workspace_id="ws-test",
                    vault_id=f"vault-{i}",
                ),
            )
        test_db.commit()

        instances, total = playbook_service.list_instances(test_db, workspace_id="ws-test")
        assert total == 3

    def test_list_instances_pagination(self, test_db):
        """List instances should support pagination."""
        for i in range(5):
            playbook_service.create_instance(
                test_db,
                request=CreateInstanceRequest(
                    template_id="contract-intake",
                    workspace_id="ws-test",
                    vault_id=f"vault-{i}",
                ),
            )
        test_db.commit()

        instances, total = playbook_service.list_instances(
            test_db, workspace_id="ws-test", limit=2, offset=0
        )
        assert total == 5
        assert len(instances) == 2

        instances_2, _ = playbook_service.list_instances(
            test_db, workspace_id="ws-test", limit=2, offset=2
        )
        assert len(instances_2) == 2
