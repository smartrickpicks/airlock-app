"""add orbit creator tables

Revision ID: 022
Revises: 021
Create Date: 2026-03-12

Creates the 6-table Orbit creator schema:
  orbit_profiles, orbit_sections, orbit_links,
  orbit_link_clicks, orbit_personas, fan_calibrations.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "022"
down_revision: str = "021"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # orbit_profiles — extends user identity with public creator mode     #
    # ------------------------------------------------------------------ #
    op.create_table(
        "orbit_profiles",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Text(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("slug", sa.String(64), nullable=False),
        sa.Column("display_name", sa.String(128), nullable=False, server_default=""),
        sa.Column("tagline", sa.String(256), nullable=False, server_default=""),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column("brand_pillars", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column(
            "theme",
            sa.JSON(),
            nullable=False,
            server_default='{"primary_color": "#8e6bc7", "accent_color": "#e8bcfd", "layout_preset": "default"}',
        ),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("spellcast_completed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("page_views", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", name="uq_orbit_profiles_user_id"),
        sa.UniqueConstraint("slug", name="uq_orbit_profiles_slug"),
    )
    op.create_index("idx_orbit_profiles_slug", "orbit_profiles", ["slug"])

    # ------------------------------------------------------------------ #
    # orbit_sections — section blocks for Orbit pages                     #
    # ------------------------------------------------------------------ #
    op.create_table(
        "orbit_sections",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column(
            "orbit_profile_id",
            sa.Text(),
            sa.ForeignKey("orbit_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("section_type", sa.String(32), nullable=False),
        sa.Column("title", sa.String(128), nullable=False, server_default=""),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_visible", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("content", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_orbit_sections_profile_order",
        "orbit_sections",
        ["orbit_profile_id", "order_index"],
    )

    # ------------------------------------------------------------------ #
    # orbit_links — tracked link-in-bio entries                           #
    # ------------------------------------------------------------------ #
    op.create_table(
        "orbit_links",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column(
            "orbit_profile_id",
            sa.Text(),
            sa.ForeignKey("orbit_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(128), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("icon", sa.String(32), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_visible", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("click_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_orbit_links_profile",
        "orbit_links",
        ["orbit_profile_id", "order_index"],
    )

    # ------------------------------------------------------------------ #
    # orbit_link_clicks — append-only click analytics                     #
    # ------------------------------------------------------------------ #
    op.create_table(
        "orbit_link_clicks",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column(
            "link_id",
            sa.Text(),
            sa.ForeignKey("orbit_links.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "orbit_profile_id",
            sa.Text(),
            sa.ForeignKey("orbit_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("fan_id", sa.Text(), nullable=True),
        sa.Column("referrer", sa.Text(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("utm_source", sa.String(128), nullable=True),
        sa.Column("utm_medium", sa.String(128), nullable=True),
        sa.Column("utm_campaign", sa.String(128), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_orbit_link_clicks_link",
        "orbit_link_clicks",
        ["link_id", "created_at"],
    )
    op.create_index(
        "ix_orbit_link_clicks_profile",
        "orbit_link_clicks",
        ["orbit_profile_id", "created_at"],
    )

    # ------------------------------------------------------------------ #
    # orbit_personas — creator-branded PI profile mappings                #
    # ------------------------------------------------------------------ #
    op.create_table(
        "orbit_personas",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column(
            "orbit_profile_id",
            sa.Text(),
            sa.ForeignKey("orbit_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("pi_profile", sa.String(32), nullable=False),
        sa.Column("display_name", sa.String(64), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("traits", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("emoji", sa.String(8), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_orbit_personas_profile",
        "orbit_personas",
        ["orbit_profile_id", "order_index"],
    )

    # ------------------------------------------------------------------ #
    # fan_calibrations — portable behavioral identity from quiz           #
    # ------------------------------------------------------------------ #
    op.create_table(
        "fan_calibrations",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("fan_id", sa.Text(), nullable=True),
        sa.Column(
            "orbit_profile_id",
            sa.Text(),
            sa.ForeignKey("orbit_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "persona_id",
            sa.Text(),
            sa.ForeignKey("orbit_personas.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("session_token", sa.String(128), nullable=False),
        sa.Column("drives", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("answers", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("share_card_url", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("session_token", name="uq_fan_calibrations_session_token"),
    )
    op.create_index("idx_fan_calibrations_session_token", "fan_calibrations", ["session_token"])
    op.create_index(
        "ix_fan_calibrations_profile",
        "fan_calibrations",
        ["orbit_profile_id", "created_at"],
    )
    op.create_index("ix_fan_calibrations_fan", "fan_calibrations", ["fan_id"])


def downgrade() -> None:
    op.drop_index("ix_fan_calibrations_fan", table_name="fan_calibrations")
    op.drop_index("ix_fan_calibrations_profile", table_name="fan_calibrations")
    op.drop_index("idx_fan_calibrations_session_token", table_name="fan_calibrations")
    op.drop_table("fan_calibrations")
    op.drop_index("ix_orbit_personas_profile", table_name="orbit_personas")
    op.drop_table("orbit_personas")
    op.drop_index("ix_orbit_link_clicks_profile", table_name="orbit_link_clicks")
    op.drop_index("ix_orbit_link_clicks_link", table_name="orbit_link_clicks")
    op.drop_table("orbit_link_clicks")
    op.drop_index("ix_orbit_links_profile", table_name="orbit_links")
    op.drop_table("orbit_links")
    op.drop_index("ix_orbit_sections_profile_order", table_name="orbit_sections")
    op.drop_table("orbit_sections")
    op.drop_index("idx_orbit_profiles_slug", table_name="orbit_profiles")
    op.drop_table("orbit_profiles")
