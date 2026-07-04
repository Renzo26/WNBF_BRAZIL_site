import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class OrderStatus(str, enum.Enum):
    PENDING = "PENDING"      # aguardando pagamento (Pix gerado / cartão em análise)
    PAID = "PAID"            # confirmado pelo webhook do Asaas
    FAILED = "FAILED"        # recusado
    CANCELED = "CANCELED"
    REFUNDED = "REFUNDED"
    EXPIRED = "EXPIRED"      # Pix venceu sem pagamento


class PaymentMethod(str, enum.Enum):
    PIX = "PIX"
    CREDIT_CARD = "CREDIT_CARD"


class DocType(str, enum.Enum):
    CPF = "CPF"
    CNPJ = "CNPJ"


class Order(Base):
    """Pedido de ingresso. Dados pessoais sensíveis ficam CIFRADOS (LGPD)."""

    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # ---- Idempotência (evita cobrança duplicada em cliques repetidos) ----
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(80), nullable=True, unique=True, index=True)

    # ---- Ingresso (snapshot no momento da compra) ----
    ticket_slug: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    ticket_name: Mapped[str] = mapped_column(String(120), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_amount: Mapped[int] = mapped_column(Integer, nullable=False)   # centavos
    fee_amount: Mapped[int] = mapped_column(Integer, nullable=False)    # centavos
    total_amount: Mapped[int] = mapped_column(Integer, nullable=False)  # centavos

    # ---- Comprador (PII) ----
    buyer_name: Mapped[str] = mapped_column(String(200), nullable=False)
    buyer_email: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    buyer_phone_enc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # cifrado
    doc_type: Mapped[DocType] = mapped_column(Enum(DocType, name="doc_type"), nullable=False)
    doc_enc: Mapped[str] = mapped_column(Text, nullable=False)          # CPF/CNPJ cifrado
    doc_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)  # HMAC p/ busca
    address_enc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON cifrado

    # ---- Pagamento ----
    method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod, name="payment_method"), nullable=False)
    installments: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, name="order_status"), nullable=False, default=OrderStatus.PENDING, index=True
    )
    asaas_customer_id: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    asaas_payment_id: Mapped[Optional[str]] = mapped_column(String(60), nullable=True, index=True)
    card_brand: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    card_last4: Mapped[Optional[str]] = mapped_column(String(4), nullable=True)

    # ---- Consentimento LGPD (base legal: execução de contrato + consentimento) ----
    consent_accepted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    consent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    consent_ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    terms_version: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # ---- Ciclo de vida ----
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    # LGPD: direito ao esquecimento — quando anonimizado, os campos PII são apagados
    anonymized_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
