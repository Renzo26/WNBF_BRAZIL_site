"""Entrega do ingresso após confirmação do pagamento.

PONTO DE INTEGRAÇÃO: aqui é onde, em produção, geramos o ingresso digital
(código/QR único) e enviamos por e-mail ao comprador. Mantido como stub para não
enviar nada em ambiente de protótipo. Nunca logamos PII completa."""
from __future__ import annotations

import logging

from app.core.security import mask_email
from app.models.order import Order

logger = logging.getLogger("checkout.fulfillment")


async def fulfill_order(order: Order) -> None:
    # TODO(produção): gerar ingresso (QR único) + enviar e-mail transacional.
    logger.info(
        "ingresso a entregar order=%s ticket=%s email=%s",
        order.id, order.ticket_slug, mask_email(order.buyer_email),
    )
