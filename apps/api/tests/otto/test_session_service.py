"""Test session service changes — messenger scope + surface tracking."""

from src.otto.models import OttoSession


def test_otto_session_has_scope_field():
    """OttoSession model should have scope and surface columns."""
    assert hasattr(OttoSession, "scope")
    assert hasattr(OttoSession, "surface")
    assert hasattr(OttoSession, "tier_used")


def test_otto_session_scope_default():
    """Scope defaults to 'vault' at the database level."""
    col = OttoSession.__table__.columns["scope"]
    assert col.server_default is not None
    assert "vault" in str(col.server_default.arg)


def test_otto_session_surface_nullable():
    """Surface is nullable (not always known at session creation)."""
    col = OttoSession.__table__.columns["surface"]
    assert col.nullable is True


def test_otto_session_tier_used_nullable():
    """tier_used is nullable (set after first route execution)."""
    col = OttoSession.__table__.columns["tier_used"]
    assert col.nullable is True
