"""Smoke tests for ORM model imports and table names."""

from src.models import User, UserModuleRole, Workspace


def test_user_tablename():
    assert User.__tablename__ == "users"


def test_workspace_tablename():
    assert Workspace.__tablename__ == "workspaces"


def test_user_module_role_tablename():
    assert UserModuleRole.__tablename__ == "user_module_roles"


def test_all_models_importable():
    """Verify all models can be imported from src.models."""
    from src.models import User, UserModuleRole, Workspace

    assert User is not None
    assert Workspace is not None
    assert UserModuleRole is not None
