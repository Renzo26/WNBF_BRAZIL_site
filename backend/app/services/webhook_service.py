"""Processa os webhooks do Asaas com IDEMPOTÊNCIA (fonte da verdade do pagamento).

Segurança: o endpoint valida o token do header antes de chamar este serviço.
Cada evento é registrado em `webhook_events` (dedupe) para nunca ser processado
duas vezes — mesmo que o Asaas reenvie."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order, OrderStatus
from app.models.webhook_event import WebhookEvent
from app.services.fulfillment_service import fulfill_order
from app.services.sse_service import broadcaster

logger = logging.getLogger("checkout.webhook")

# mapa evento do Asaas -> novo status do pedido
_EVENT_MAP = {
    "PAYMENT_CONFIRMED": OrderStatus.PAID,
    "PAYMENT_RECEIVED": OrderStatus.PAID,
    "PAYMENT_OVERDUE": OrderStatus.EXPIRED,
    "PAYMENT_REFUNDED": OrderStatus.REFUNDED,
    "PAYMENT_DELETED": OrderStatus.CANCELED,
    "PAYMENT_CHARGEBACK_REQUESTED": OrderStatus.REFUNDED,
}


class WebhookService:
    async def process(self, db: AsyncSession, payload: dict) -> None:
        event_type = payload.get("event", "")
        payment = payload.get("payment") or {}
        payment_id = payment.get("id")

        # id do evento para dedupe (usa o id nativo se houver; senão compõe um)
        dedupe_key = payload.get("id") or f"{event_type}:{payment_id}:{payment.get('status')}"
        if not dedupe_key:
            return

        # ---- registra o evento (dedupe atômico) ----
        db.add(WebhookEvent(dedupe_key=dedupe_key, event_type=event_type, asaas_payment_id=payment_id))
        try:
            await db.flush()
        except IntegrityError:
            await db.rollback()
            logger.info("webhook duplicado ignorado dedupe=%s", dedupe_key)
            return

        new_status = _EVENT_MAP.get(event_type)
        if new_status is None or not payment_id:
            await db.commit()  # evento irrelevante, mas registrado
            return

        order = await db.scalar(select(Order).where(Order.asaas_payment_id == payment_id))
        if not order:
            logger.warning("webhook sem pedido correspondente payment=%s", payment_id)
            await db.commit()
            return

        # transições idempotentes: não rebaixa um pedido já pago
        if order.status == OrderStatus.PAID and new_status != OrderStatus.REFUNDED:
            await db.commit()
            return

        order.status = new_status
        if new_status == OrderStatus.PAID:
            order.paid_at = datetime.now(timezone.utc)
            await fulfill_order(order)

        await db.execute(
            WebhookEvent.__table__.update()
            .where(WebhookEvent.dedupe_key == dedupe_key)
            .values(processed_at=datetime.now(timezone.utc))
        )
        await db.commit()

        # notifica o front (Pix pago -> tela de confirmação)
        await broadcaster.publish(
            str(order.id),
            "order_status",
            {"order_id": str(order.id), "status": order.status.value, "paid": order.status == OrderStatus.PAID},
        )
        logger.info("webhook processado order=%s status=%s", order.id, order.status.value)


webhook_service = WebhookService()
