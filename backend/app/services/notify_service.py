"""Envia a confirmação de pagamento para o webhook do n8n (que dispara o
WhatsApp/e-mail). Server-to-server via HTTPS — o telefone/PII não passa pelo
navegador. É best-effort: se o n8n estiver fora, não derruba o checkout."""
from __future__ import annotations

import logging

import httpx

from app.core.config import get_settings
from app.core.money import brl
from app.core.security import decrypt, mask_email
from app.models.order import Order

logger = logging.getLogger("checkout.notify")
_settings = get_settings()

EVENT_NAME = "Natural Fitness & Health Brasil"
EVENT_DATE = "10 e 11 de Outubro de 2026"


def _payload(order: Order) -> dict:
    phone = decrypt(order.buyer_phone_enc) or ""
    return {
        "event": "payment_confirmed",
        "simulated": _settings.simulate_payment,
        "order_id": str(order.id),
        "status": order.status.value,
        "paid_at": order.paid_at.isoformat() if order.paid_at else None,
        "customer": {
            "name": order.buyer_name,
            "first_name": order.buyer_name.split()[0],
            "email": order.buyer_email,
            "phone": phone,                    # só dígitos (DDD + número)
            "phone_e164": f"55{phone}" if phone else None,  # formato WhatsApp
        },
        "ticket": {
            "slug": order.ticket_slug,
            "name": order.ticket_name,
            "quantity": order.quantity,
        },
        "payment": {
            "method": order.method.value,
            "installments": order.installments,
            "total_cents": order.total_amount,
            "total_formatted": brl(order.total_amount),
        },
        "event": {"name": EVENT_NAME, "date": EVENT_DATE},
    }


async def send_confirmation(order: Order) -> None:
    url = _settings.n8n_confirm_webhook_url
    if not url:
        logger.info("n8n webhook não configurado — pulando confirmação order=%s", order.id)
        return
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=_payload(order))
            resp.raise_for_status()
        logger.info(
            "confirmação enviada ao n8n order=%s email=%s", order.id, mask_email(order.buyer_email)
        )
    except httpx.HTTPError as exc:
        # não falha o checkout — apenas registra para reprocessamento manual
        logger.error("falha ao notificar n8n order=%s erro=%s", order.id, exc.__class__.__name__)
