"""Entrega do ingresso após confirmação do pagamento.

Hoje dispara a confirmação para o n8n (WhatsApp/e-mail). Em produção, é aqui que
também geramos o ingresso digital (código/QR único). Nunca logamos PII completa."""
from __future__ import annotations

import logging

from app.core.security import mask_email
from app.models.order import Order
from app.services.notify_service import send_confirmation

logger = logging.getLogger("checkout.fulfillment")


async def fulfill_order(order: Order) -> None:
    logger.info(
        "pedido pago order=%s ticket=%s email=%s",
        order.id, order.ticket_slug, mask_email(order.buyer_email),
    )
    # TODO(produção): gerar ingresso (QR único) antes de notificar.
    await send_confirmation(order)
