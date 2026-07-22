"""Meta Conversions API — confirma a compra ao Meta Ads direto do servidor.

Necessário porque no Pix o cliente paga fora do site (o webhook do Asaas
confirma depois, com o cliente já sem o navegador aberto) — o Purchase
disparado pelo pixel do navegador nunca acontece nesse caminho.

O `event_id` = id do pedido é o MESMO valor enviado pelo pixel do navegador
(cartão aprovado na hora, ver Checkout.jsx). O Meta deduplica os dois
automaticamente pelo event_id — a venda não é contada 2x.

Best-effort: se falhar, só loga (nunca derruba a confirmação do pedido)."""
from __future__ import annotations

import hashlib
import logging

import httpx

from app.core.config import get_settings
from app.core.security import decrypt
from app.models.order import Order

logger = logging.getLogger("checkout.meta_capi")
_settings = get_settings()

_GRAPH_URL = "https://graph.facebook.com/v21.0/{pixel_id}/events"


def _sha256(value: str) -> str:
    return hashlib.sha256(value.strip().lower().encode()).hexdigest()


async def send_purchase_event(order: Order, *, client_ip: str | None = None) -> None:
    if not _settings.meta_capi_token:
        return  # Conversions API não configurada — ignora silenciosamente

    user_data: dict = {"em": [_sha256(order.buyer_email)]}
    phone = decrypt(order.buyer_phone_enc) or ""
    if phone:
        user_data["ph"] = [_sha256(f"55{phone}")]  # E.164 sem "+", padrão do Meta
    ip = client_ip or order.consent_ip
    if ip:
        user_data["client_ip_address"] = ip

    body = {
        "data": [
            {
                "event_name": "Purchase",
                "event_time": int((order.paid_at or order.created_at).timestamp()),
                "event_id": str(order.id),
                "action_source": "website",
                "user_data": user_data,
                "custom_data": {
                    "currency": "BRL",
                    "value": round(order.total_amount / 100, 2),
                    "content_type": "product",
                    "content_ids": [order.ticket_slug],
                    "content_name": order.ticket_name,
                    "num_items": order.quantity,
                },
            }
        ],
        "access_token": _settings.meta_capi_token,
    }

    url = _GRAPH_URL.format(pixel_id=_settings.meta_pixel_id)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=body)
            if resp.status_code >= 400:
                logger.warning("Meta CAPI rejeitou order=%s: %s", order.id, resp.text[:300])
            else:
                logger.info("Meta CAPI Purchase enviado order=%s", order.id)
    except httpx.HTTPError as exc:
        logger.error("Meta CAPI falhou order=%s erro=%s", order.id, exc.__class__.__name__)
