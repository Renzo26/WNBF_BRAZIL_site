from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

# Resultado da validação de um ingresso na portaria.
#   approved   → entrada liberada agora
#   duplicate  → ingresso válido, mas JÁ foi usado (tentativa de reentrada)
#   canceled   → ingresso cancelado (reembolso/chargeback)
#   invalid    → QR/código não confere (forjado ou inexistente)
ValidationResultCode = Literal["approved", "duplicate", "canceled", "invalid"]


class ValidateIn(BaseModel):
    # Conteúdo lido do QR (token assinado) ou código digitado à mão.
    token: str = Field(min_length=1, max_length=120)
    device_id: Optional[str] = Field(default=None, max_length=80)


class TicketInfo(BaseModel):
    code: str
    holder_name: str
    ticket_name: str
    ticket_slug: str
    status: str
    checked_in_at: Optional[str] = None
    checked_in_by: Optional[str] = None   # nome do staff que validou


class ValidateOut(BaseModel):
    result: ValidationResultCode
    message: str
    ticket: Optional[TicketInfo] = None


# ---------- sincronização offline ----------

class StatsOut(BaseModel):
    total: int          # ingressos emitidos (válidos + usados)
    checked_in: int     # já validados
    remaining: int      # ainda não usados
    canceled: int


class SyncTicket(BaseModel):
    code: str
    holder_name: str
    ticket_name: str
    ticket_slug: str
    status: str
    checked_in_at: Optional[str] = None


class SyncDownOut(BaseModel):
    server_time: str
    tickets: list[SyncTicket]
    stats: "StatsOut"


class OfflineCheckin(BaseModel):
    token: str = Field(max_length=120)
    at: str                    # ISO 8601 — momento do check-in no dispositivo
    device_id: Optional[str] = Field(default=None, max_length=80)


class SyncUpIn(BaseModel):
    checkins: list[OfflineCheckin] = Field(default_factory=list)


class OfflineResult(BaseModel):
    token: str
    result: ValidationResultCode
    code: Optional[str] = None


class SyncUpOut(BaseModel):
    results: list[OfflineResult]
    stats: "StatsOut"
