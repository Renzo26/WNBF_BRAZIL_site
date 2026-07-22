"""Entrega do ingresso após confirmação do pagamento.

Gera o(s) ingresso(s) com QR único e assinado e dispara a confirmação para o n8n
(WhatsApp/e-mail). Nunca logamos PII completa."""
from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import mask_email
from app.models.order import Order
from app.services.meta_capi_service import send_purchase_event
from app.services.notify_service import send_confirmation
from app.services.ticket_service import qr_token, ticket_service

logger = logging.getLogger("checkout.fulfillment")


async def fulfill_order(db: AsyncSession, order: Order) -> None:
    logger.info(
        "pedido pago order=%s ticket=%s email=%s",
        order.id, order.ticket_slug, mask_email(order.buyer_email),
    )
    # gera o(s) ingresso(s) com QR único ANTES de notificar (idempotente)
    tickets = await ticket_service.issue_for_order(db, order)
    qr_tokens = [qr_token(t) for t in tickets]
    await send_confirmation(order, tickets=tickets, qr_tokens=qr_tokens)
    # Meta Ads: confirma a venda (cobre Pix — o pixel do navegador não roda nesse caminho)
    await send_purchase_event(order)


async def cancel_order_tickets(db: AsyncSession, order: Order) -> None:
    """Invalida os ingressos de um pedido reembolsado/cancelado."""
    await ticket_service.cancel_for_order(db, order.id)
    logger.info("ingressos cancelados order=%s", order.id)
