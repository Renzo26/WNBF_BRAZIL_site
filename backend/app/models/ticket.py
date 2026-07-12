import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TicketStatus(str, enum.Enum):
    VALID = "VALID"            # emitido, ainda não usado
    CHECKED_IN = "CHECKED_IN"  # já validado na entrada (não pode reentrar)
    CANCELED = "CANCELED"      # cancelado (reembolso/chargeback)


class Ticket(Base):
    """Ingresso físico único, gerado quando o pedido é pago.

    O `code` vai no QR (assinado) e também serve para digitação manual. O estado
    de check-in é a fonte da verdade contra reentrada — a validação é atômica."""

    __tablename__ = "tickets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(24), nullable=False, unique=True, index=True)

    # snapshot para exibir na portaria sem depender de join pesado
    holder_name: Mapped[str] = mapped_column(String(200), nullable=False)
    ticket_slug: Mapped[str] = mapped_column(String(50), nullable=False)
    ticket_name: Mapped[str] = mapped_column(String(120), nullable=False)
    seq: Mapped[int] = mapped_column(Integer, nullable=False, default=1)  # nº do ingresso dentro do pedido

    status: Mapped[TicketStatus] = mapped_column(
        Enum(TicketStatus, name="ticket_status"), nullable=False, default=TicketStatus.VALID, index=True
    )
    checked_in_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    checked_in_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("staff_users.id", ondelete="SET NULL"), nullable=True
    )
    checked_in_device: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
