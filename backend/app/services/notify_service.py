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
EVENT_LOCATION = "Expo Barra Funda — São Paulo/SP"


def _whatsapp_message(order: Order) -> str:
    """Mensagem pronta para envio no WhatsApp (formatação do WhatsApp: *negrito*)."""
    first = order.buyer_name.split()[0]
    code = str(order.id)[:8].upper()
    return (
        f"Olá, {first}! 🎉\n\n"
        f"Seu pagamento foi *confirmado* e seu ingresso para o *{EVENT_NAME} 2026* está garantido! 💪\n\n"
        f"🎟️ *Ingresso:* {order.ticket_name}\n"
        f"📅 *Data:* {EVENT_DATE}\n"
        f"📍 *Local:* {EVENT_LOCATION}\n"
        f"💳 *Valor:* {brl(order.total_amount)}\n"
        f"🔖 *Pedido:* {code}\n\n"
        f"Seu ingresso com QR Code foi enviado para o seu e-mail ({order.buyer_email}). "
        f"É só apresentar o QR Code na entrada do evento. ✅\n\n"
        f"Guarde esta mensagem. Nos vemos lá! 🔥\n\n"
        f"_WNBF Brasil — World Natural Bodybuilding Federation_"
    )


def _payload(order: Order, tickets: list | None = None, qr_tokens: list[str] | None = None) -> dict:
    phone = decrypt(order.buyer_phone_enc) or ""
    codes = [t.code for t in (tickets or [])]
    return {
        "event_type": "payment_confirmed",
        "simulated": _settings.simulate_payment,
        "order_id": str(order.id),
        "order_code": str(order.id)[:8].upper(),
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
            "codes": codes,                    # códigos dos ingressos emitidos
            "qr_tokens": qr_tokens or [],      # conteúdo do QR (assinado)
        },
        "payment": {
            "method": order.method.value,
            "installments": order.installments,
            "total_cents": order.total_amount,
            "total_formatted": brl(order.total_amount),
        },
        "event": {"name": EVENT_NAME, "date": EVENT_DATE, "location": EVENT_LOCATION},
        # Mensagem já formatada para o WhatsApp (o n8n só precisa enviar isto)
        "message": _whatsapp_message(order),
    }


async def send_confirmation(order: Order, tickets: list | None = None, qr_tokens: list[str] | None = None) -> None:
    url = _settings.n8n_confirm_webhook_url
    if not url:
        logger.info("n8n webhook não configurado — pulando confirmação order=%s", order.id)
        return
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=_payload(order, tickets, qr_tokens))
            resp.raise_for_status()
        logger.info(
            "confirmação enviada ao n8n order=%s email=%s", order.id, mask_email(order.buyer_email)
        )
    except httpx.HTTPError as exc:
        # não falha o checkout — apenas registra para reprocessamento manual
        logger.error("falha ao notificar n8n order=%s erro=%s", order.id, exc.__class__.__name__)
