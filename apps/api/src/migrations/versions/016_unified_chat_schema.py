"""unified chat schema — GIFs, reactions, embeds, notification prefs

Revision ID: 016
Revises: 015
Create Date: 2026-03-11

Adds:
- conversations: topic, context_type, context_id, context_name, persona_mode, archived
- conversation_participants: muted
- messages: nullable content, gif_url, gif_provider, gif_width, gif_height, embeds,
            persona_mode, read_at, FTS index
- NEW table: message_reactions
- NEW table: notification_preferences
- Backfill: conversations.topic and context_* from existing name/vault_id
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "016"
down_revision: str = "015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # conversations — ADD columns                                          #
    # ------------------------------------------------------------------ #
    op.add_column("conversations", sa.Column("topic", sa.Text(), nullable=True))
    op.add_column("conversations", sa.Column("context_type", sa.Text(), nullable=True))
    op.add_column("conversations", sa.Column("context_id", sa.Text(), nullable=True))
    op.add_column("conversations", sa.Column("context_name", sa.Text(), nullable=True))
    op.add_column(
        "conversations",
        sa.Column(
            "persona_mode",
            sa.Text(),
            server_default="scholar",
            nullable=True,
        ),
    )
    op.add_column(
        "conversations",
        sa.Column(
            "archived",
            sa.Boolean(),
            server_default="false",
            nullable=False,
        ),
    )
    op.create_index(
        "idx_conversations_context",
        "conversations",
        ["context_type", "context_id"],
    )

    # ------------------------------------------------------------------ #
    # conversation_participants — ADD column                               #
    # ------------------------------------------------------------------ #
    op.add_column(
        "conversation_participants",
        sa.Column("muted", sa.Boolean(), server_default="false", nullable=False),
    )

    # ------------------------------------------------------------------ #
    # messages — ALTER + ADD                                               #
    # ------------------------------------------------------------------ #
    op.alter_column("messages", "content", existing_type=sa.Text(), nullable=True)

    op.add_column("messages", sa.Column("gif_url", sa.Text(), nullable=True))
    op.add_column("messages", sa.Column("gif_provider", sa.Text(), nullable=True))
    op.add_column("messages", sa.Column("gif_width", sa.Integer(), nullable=True))
    op.add_column("messages", sa.Column("gif_height", sa.Integer(), nullable=True))
    op.add_column(
        "messages",
        sa.Column("embeds", JSONB(), server_default="[]", nullable=False),
    )
    op.add_column("messages", sa.Column("persona_mode", sa.Text(), nullable=True))
    op.add_column(
        "messages",
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Full-text search index on content
    op.execute(
        "CREATE INDEX idx_messages_content_fts ON messages "
        "USING GIN (to_tsvector('english', coalesce(content, '')));"
    )

    # ------------------------------------------------------------------ #
    # message_reactions — NEW table                                        #
    # ------------------------------------------------------------------ #
    op.create_table(
        "message_reactions",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column(
            "message_id",
            sa.Text(),
            sa.ForeignKey("messages.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("emoji", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "message_id",
            "user_id",
            "emoji",
            name="uq_reaction_per_user_emoji",
        ),
    )
    op.create_index(
        "idx_reactions_message",
        "message_reactions",
        ["message_id"],
    )

    # ------------------------------------------------------------------ #
    # notification_preferences — NEW table                                 #
    # ------------------------------------------------------------------ #
    op.create_table(
        "notification_preferences",
        sa.Column("user_id", sa.Text(), primary_key=True),
        sa.Column("toast_enabled", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("toast_otto", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("toast_people", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("sound_enabled", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("sound_send", sa.Text(), server_default="default", nullable=False),
        sa.Column("sound_receive", sa.Text(), server_default="default", nullable=False),
        sa.Column("sound_notification", sa.Text(), server_default="default", nullable=False),
        sa.Column("overlay_default", sa.Boolean(), server_default="true", nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # ------------------------------------------------------------------ #
    # Backfill                                                             #
    # ------------------------------------------------------------------ #
    op.execute("UPDATE conversations SET topic = name WHERE name IS NOT NULL;")
    op.execute(
        "UPDATE conversations "
        "SET context_type = 'vault', context_id = vault_id, context_name = name "
        "WHERE vault_id IS NOT NULL;"
    )


def downgrade() -> None:
    # Drop new tables
    op.drop_index("idx_reactions_message", table_name="message_reactions")
    op.drop_table("notification_preferences")
    op.drop_table("message_reactions")

    # messages — DROP added columns + FTS index + revert content to NOT NULL
    op.execute("DROP INDEX IF EXISTS idx_messages_content_fts;")
    op.drop_column("messages", "read_at")
    op.drop_column("messages", "persona_mode")
    op.drop_column("messages", "embeds")
    op.drop_column("messages", "gif_height")
    op.drop_column("messages", "gif_width")
    op.drop_column("messages", "gif_provider")
    op.drop_column("messages", "gif_url")
    op.alter_column("messages", "content", existing_type=sa.Text(), nullable=False)

    # conversation_participants — DROP column
    op.drop_column("conversation_participants", "muted")

    # conversations — DROP index + columns
    op.drop_index("idx_conversations_context", table_name="conversations")
    op.drop_column("conversations", "archived")
    op.drop_column("conversations", "persona_mode")
    op.drop_column("conversations", "context_name")
    op.drop_column("conversations", "context_id")
    op.drop_column("conversations", "context_type")
    op.drop_column("conversations", "topic")
