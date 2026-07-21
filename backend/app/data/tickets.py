"""Catálogo de ingressos — fonte da verdade dos PREÇOS no servidor.

O valor NUNCA vem do frontend (evita adulteração). Estes dados também alimentam
o seed da tabela `ticket_types` na migration inicial. Valores em centavos.
"""
from __future__ import annotations

from typing import TypedDict


class TicketCatalogItem(TypedDict):
    slug: str
    name: str
    tier: str
    unit_amount: int  # centavos


TICKET_CATALOG: list[TicketCatalogItem] = [
    {"slug": "dia-1", "name": "Ingresso Dia 1", "tier": "10 Out · Sábado", "unit_amount": 13500},
    {"slug": "passaporte-2-dias", "name": "Passaporte 2 Dias", "tier": "10 + 11 Out · Os 2 dias", "unit_amount": 25200},
    {"slug": "dia-2", "name": "Ingresso Dia 2", "tier": "11 Out · Domingo", "unit_amount": 13500},
]

CATALOG_BY_SLUG = {t["slug"]: t for t in TICKET_CATALOG}
