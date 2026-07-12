"""tickets + staff_users (credenciamento)

Revision ID: 0002_tickets_and_staff
Revises: 0001_initial
Create Date: 2026-07-07

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_tickets_and_staff"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---- staff_users ----
    op.create_table(
        "staff_users",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("hashed_password", sa.String(length=200), nullable=False),
        sa.Column("role", sa.Enum("ADMIN", "STAFF", name="staff_role"), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
    )
    op.create_index(op.f("ix_staff_users_username"), "staff_users", ["username"], unique=True)

    # ---- tickets ----
    op.create_table(
        "tickets",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("order_id", sa.UUID(), nullable=False),
        sa.Column("code", sa.String(length=24), nullable=False),
        sa.Column("holder_name", sa.String(length=200), nullable=False),
        sa.Column("ticket_slug", sa.String(length=50), nullable=False),
        sa.Column("ticket_name", sa.String(length=120), nullable=False),
        sa.Column("seq", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "status",
            sa.Enum("VALID", "CHECKED_IN", "CANCELED", name="ticket_status"),
            nullable=False,
            server_default="VALID",
        ),
        sa.Column("checked_in_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("checked_in_by", sa.UUID(), nullable=True),
        sa.Column("checked_in_device", sa.String(length=80), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["checked_in_by"], ["staff_users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index(op.f("ix_tickets_order_id"), "tickets", ["order_id"], unique=False)
    op.create_index(op.f("ix_tickets_code"), "tickets", ["code"], unique=True)
    op.create_index(op.f("ix_tickets_status"), "tickets", ["status"], unique=False)


def downgrade() -> None:
    op.drop_table("tickets")
    op.drop_table("staff_users")
    sa.Enum(name="ticket_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="staff_role").drop(op.get_bind(), checkfirst=True)
