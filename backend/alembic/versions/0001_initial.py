"""initial: ticket_types, orders, webhook_events

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-03

"""
import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---- ticket_types ----
    op.create_table(
        "ticket_types",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("slug", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("tier", sa.String(length=120), nullable=False),
        sa.Column("unit_amount", sa.Integer(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index(op.f("ix_ticket_types_slug"), "ticket_types", ["slug"], unique=True)

    # ---- orders ----
    op.create_table(
        "orders",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("idempotency_key", sa.String(length=80), nullable=True),
        sa.Column("ticket_slug", sa.String(length=50), nullable=False),
        sa.Column("ticket_name", sa.String(length=120), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_amount", sa.Integer(), nullable=False),
        sa.Column("fee_amount", sa.Integer(), nullable=False),
        sa.Column("total_amount", sa.Integer(), nullable=False),
        sa.Column("buyer_name", sa.String(length=200), nullable=False),
        sa.Column("buyer_email", sa.String(length=200), nullable=False),
        sa.Column("buyer_phone_enc", sa.Text(), nullable=True),
        sa.Column("doc_type", sa.Enum("CPF", "CNPJ", name="doc_type"), nullable=False),
        sa.Column("doc_enc", sa.Text(), nullable=False),
        sa.Column("doc_hash", sa.String(length=64), nullable=False),
        sa.Column("address_enc", sa.Text(), nullable=True),
        sa.Column("method", sa.Enum("PIX", "CREDIT_CARD", name="payment_method"), nullable=False),
        sa.Column("installments", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("PENDING", "PAID", "FAILED", "CANCELED", "REFUNDED", "EXPIRED", name="order_status"),
            nullable=False,
        ),
        sa.Column("asaas_customer_id", sa.String(length=60), nullable=True),
        sa.Column("asaas_payment_id", sa.String(length=60), nullable=True),
        sa.Column("card_brand", sa.String(length=30), nullable=True),
        sa.Column("card_last4", sa.String(length=4), nullable=True),
        sa.Column("consent_accepted", sa.Boolean(), nullable=False),
        sa.Column("consent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("consent_ip", sa.String(length=64), nullable=True),
        sa.Column("terms_version", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("anonymized_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key"),
    )
    op.create_index(op.f("ix_orders_idempotency_key"), "orders", ["idempotency_key"], unique=True)
    op.create_index(op.f("ix_orders_ticket_slug"), "orders", ["ticket_slug"], unique=False)
    op.create_index(op.f("ix_orders_buyer_email"), "orders", ["buyer_email"], unique=False)
    op.create_index(op.f("ix_orders_doc_hash"), "orders", ["doc_hash"], unique=False)
    op.create_index(op.f("ix_orders_status"), "orders", ["status"], unique=False)
    op.create_index(op.f("ix_orders_asaas_payment_id"), "orders", ["asaas_payment_id"], unique=False)

    # ---- webhook_events ----
    op.create_table(
        "webhook_events",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("dedupe_key", sa.String(length=120), nullable=False),
        sa.Column("event_type", sa.String(length=60), nullable=False),
        sa.Column("asaas_payment_id", sa.String(length=60), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dedupe_key"),
    )
    op.create_index(op.f("ix_webhook_events_dedupe_key"), "webhook_events", ["dedupe_key"], unique=True)
    op.create_index(op.f("ix_webhook_events_asaas_payment_id"), "webhook_events", ["asaas_payment_id"], unique=False)

    # ---- seed dos ingressos (fonte da verdade dos preços) ----
    from app.data.tickets import TICKET_CATALOG

    op.bulk_insert(
        sa.table(
            "ticket_types",
            sa.column("id", sa.UUID()),
            sa.column("slug", sa.String()),
            sa.column("name", sa.String()),
            sa.column("tier", sa.String()),
            sa.column("unit_amount", sa.Integer()),
        ),
        [
            {
                "id": uuid.uuid4(),
                "slug": t["slug"],
                "name": t["name"],
                "tier": t["tier"],
                "unit_amount": t["unit_amount"],
            }
            for t in TICKET_CATALOG
        ],
    )


def downgrade() -> None:
    op.drop_table("webhook_events")
    op.drop_table("orders")
    op.drop_table("ticket_types")
    sa.Enum(name="order_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="payment_method").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="doc_type").drop(op.get_bind(), checkfirst=True)
