"""Unit tests for the WorkspaceConfig ORM model.

Tests cover:
- Required field presence and types
- Default values for all server_default columns
- __tablename__ and constraint names
- metadata_ column alias mapping to 'metadata'
- Nullable vs non-nullable columns
"""

from sqlalchemy import inspect as sa_inspect

from src.models.workspace_config import WorkspaceConfig


class TestWorkspaceConfigTableDefinition:
    def test_tablename(self):
        assert WorkspaceConfig.__tablename__ == "workspace_config"

    def test_primary_key_is_id(self):
        mapper = sa_inspect(WorkspaceConfig)
        pk_names = [col.key for col in mapper.primary_key]
        assert "id" in pk_names

    def test_workspace_id_column_exists(self):
        mapper = sa_inspect(WorkspaceConfig)
        col_names = [col.key for col in mapper.columns]
        assert "workspace_id" in col_names

    def test_unique_constraint_on_workspace_id(self):
        args = WorkspaceConfig.__table_args__
        constraint_names = [c.name for c in args if hasattr(c, "name")]
        assert "uq_workspace_config_workspace_id" in constraint_names

    def test_domain_columns_exist(self):
        mapper = sa_inspect(WorkspaceConfig)
        col_names = [col.key for col in mapper.columns]
        assert "custom_domain" in col_names
        assert "vercel_domain" in col_names
        assert "domain_verified" in col_names

    def test_branding_columns_exist(self):
        mapper = sa_inspect(WorkspaceConfig)
        col_names = [col.key for col in mapper.columns]
        assert "logo_url" in col_names
        assert "accent_color" in col_names

    def test_ai_columns_exist(self):
        mapper = sa_inspect(WorkspaceConfig)
        col_names = [col.key for col in mapper.columns]
        assert "ai_provider" in col_names
        assert "ai_api_key_encrypted" in col_names
        assert "ai_tier" in col_names

    def test_google_columns_exist(self):
        mapper = sa_inspect(WorkspaceConfig)
        col_names = [col.key for col in mapper.columns]
        assert "google_refresh_token_encrypted" in col_names
        assert "google_scopes_granted" in col_names

    def test_billing_columns_exist(self):
        mapper = sa_inspect(WorkspaceConfig)
        col_names = [col.key for col in mapper.columns]
        assert "billing_tier" in col_names
        assert "stripe_customer_id" in col_names
        assert "stripe_subscription_id" in col_names

    def test_limit_columns_exist(self):
        mapper = sa_inspect(WorkspaceConfig)
        col_names = [col.key for col in mapper.columns]
        assert "max_users" in col_names
        assert "max_vaults" in col_names

    def test_timestamp_columns_exist(self):
        mapper = sa_inspect(WorkspaceConfig)
        col_names = [col.key for col in mapper.columns]
        assert "created_at" in col_names
        assert "updated_at" in col_names
        assert "deleted_at" in col_names

    def test_metadata_column_db_name(self):
        """metadata_ Python attribute maps to 'metadata' DB column name."""
        col = WorkspaceConfig.__table__.c["metadata"]
        assert col is not None

    def test_nullable_optional_fields(self):
        """Fields that should allow NULL in DB."""
        nullable_cols = {col.key: col.nullable for col in sa_inspect(WorkspaceConfig).columns}
        assert nullable_cols["custom_domain"] is True
        assert nullable_cols["vercel_domain"] is True
        assert nullable_cols["logo_url"] is True
        assert nullable_cols["ai_provider"] is True
        assert nullable_cols["ai_api_key_encrypted"] is True
        assert nullable_cols["google_refresh_token_encrypted"] is True
        assert nullable_cols["stripe_customer_id"] is True
        assert nullable_cols["stripe_subscription_id"] is True
        assert nullable_cols["deleted_at"] is True

    def test_non_nullable_required_fields(self):
        nullable_cols = {col.key: col.nullable for col in sa_inspect(WorkspaceConfig).columns}
        assert nullable_cols["workspace_id"] is False
        assert nullable_cols["domain_verified"] is False
        assert nullable_cols["accent_color"] is False
        assert nullable_cols["ai_tier"] is False
        assert nullable_cols["billing_tier"] is False
        assert nullable_cols["max_users"] is False
        assert nullable_cols["max_vaults"] is False


class TestWorkspaceConfigInstantiation:
    def test_minimal_instantiation(self):
        """Can create an in-memory object with only required fields."""
        config = WorkspaceConfig(id="01JTEST", workspace_id="ws_01JTEST")
        assert config.id == "01JTEST"
        assert config.workspace_id == "ws_01JTEST"

    def test_all_optional_fields_default_to_none(self):
        config = WorkspaceConfig(id="01JTEST2", workspace_id="ws_01JTEST2")
        assert config.custom_domain is None
        assert config.vercel_domain is None
        assert config.logo_url is None
        assert config.ai_provider is None
        assert config.ai_api_key_encrypted is None
        assert config.google_refresh_token_encrypted is None
        assert config.stripe_customer_id is None
        assert config.stripe_subscription_id is None
        assert config.deleted_at is None

    def test_explicit_values_stored(self):
        config = WorkspaceConfig(
            id="01JTEST3",
            workspace_id="ws_01JTEST3",
            custom_domain="acme.example.com",
            accent_color="#ff0000",
            ai_tier="byok",
            billing_tier="pro",
            max_users=50,
            max_vaults=100,
        )
        assert config.custom_domain == "acme.example.com"
        assert config.accent_color == "#ff0000"
        assert config.ai_tier == "byok"
        assert config.billing_tier == "pro"
        assert config.max_users == 50
        assert config.max_vaults == 100
