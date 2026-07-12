"""Regra de negócio dos ingressos: emissão (após pagamento), validação atômica
na portaria (online) e sincronização offline.

A validação é a parte crítica contra reentrada: o check-in é um UPDATE atômico
condicionado a `status = VALID`. Se dois leitores baterem o mesmo QR ao mesmo
tempo, só um consegue (rowcount == 1); o outro recebe "duplicate"."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import tokens
from app.models.order import Order, OrderStatus
from app.models.staff_user import StaffUser
from app.models.ticket import Ticket, TicketStatus
from app.schemas.validation import (
    StatsOut,
    SyncTicket,
    TicketInfo,
    ValidateOut,
)

logger = logging.getLogger("ticket.service")


def _iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


def qr_token(ticket: Ticket) -> str:
    return tokens.sign(ticket.code)


class TicketService:
    # ---------------- emissão ----------------

    async def issue_for_order(self, db: AsyncSession, order: Order) -> list[Ticket]:
        """Gera os ingressos de um pedido pago. Idempotente: se já existem, retorna-os."""
        existing = list(
            await db.scalars(select(Ticket).where(Ticket.order_id == order.id).order_by(Ticket.seq))
        )
        if existing:
            return existing

        tickets: list[Ticket] = []
        for seq in range(1, (order.quantity or 1) + 1):
            ticket = Ticket(
                order_id=order.id,
                code=await self._unique_code(db),
                holder_name=order.buyer_name,
                ticket_slug=order.ticket_slug,
                ticket_name=order.ticket_name,
                seq=seq,
                status=TicketStatus.VALID,
            )
            db.add(ticket)
            tickets.append(ticket)
        await db.commit()
        for t in tickets:
            await db.refresh(t)
        logger.info("ingressos emitidos order=%s qtd=%s", order.id, len(tickets))
        return tickets

    async def _unique_code(self, db: AsyncSession) -> str:
        for _ in range(6):
            code = tokens.new_code()
            if not await db.scalar(select(Ticket.id).where(Ticket.code == code)):
                return code
        raise RuntimeError("não foi possível gerar código único do ingresso")

    async def tickets_for_order(self, db: AsyncSession, order_id) -> list[Ticket]:
        return list(
            await db.scalars(select(Ticket).where(Ticket.order_id == order_id).order_by(Ticket.seq))
        )

    async def cancel_for_order(self, db: AsyncSession, order_id) -> None:
        """Cancela os ingressos de um pedido (reembolso/chargeback)."""
        await db.execute(
            update(Ticket).where(Ticket.order_id == order_id).values(status=TicketStatus.CANCELED)
        )
        await db.commit()

    # ---------------- validação (online) ----------------

    async def validate(
        self,
        db: AsyncSession,
        raw: str,
        *,
        staff: StaffUser,
        device_id: str | None,
        at: datetime | None = None,
    ) -> ValidateOut:
        code = tokens.parse(raw)
        if not code:
            return ValidateOut(result="invalid", message="QR Code inválido ou adulterado.")

        ticket = await db.scalar(select(Ticket).where(Ticket.code == code))
        if not ticket:
            return ValidateOut(result="invalid", message="Ingresso não encontrado.")

        if ticket.status == TicketStatus.CANCELED:
            return ValidateOut(
                result="canceled",
                message="Ingresso cancelado.",
                ticket=await self._info(db, ticket),
            )

        when = at or datetime.now(timezone.utc)
        # check-in atômico: só passa quem ainda está VALID.
        res = await db.execute(
            update(Ticket)
            .where(Ticket.id == ticket.id, Ticket.status == TicketStatus.VALID)
            .values(
                status=TicketStatus.CHECKED_IN,
                checked_in_at=when,
                checked_in_by=staff.id,
                checked_in_device=device_id,
            )
        )
        await db.commit()
        await db.refresh(ticket)

        if res.rowcount == 1:
            logger.info("check-in OK code=%s staff=%s", code, staff.username)
            return ValidateOut(
                result="approved",
                message="Entrada liberada.",
                ticket=await self._info(db, ticket),
            )

        # já estava usado → tentativa de reentrada
        logger.info("reentrada barrada code=%s staff=%s", code, staff.username)
        return ValidateOut(
            result="duplicate",
            message="Ingresso já utilizado.",
            ticket=await self._info(db, ticket),
        )

    async def _info(self, db: AsyncSession, ticket: Ticket) -> TicketInfo:
        by_name = None
        if ticket.checked_in_by:
            by_name = await db.scalar(
                select(StaffUser.name).where(StaffUser.id == ticket.checked_in_by)
            )
        return TicketInfo(
            code=ticket.code,
            holder_name=ticket.holder_name,
            ticket_name=ticket.ticket_name,
            ticket_slug=ticket.ticket_slug,
            status=ticket.status.value,
            checked_in_at=_iso(ticket.checked_in_at),
            checked_in_by=by_name,
        )

    # ---------------- offline: download / upload ----------------

    async def list_for_sync(self, db: AsyncSession) -> list[SyncTicket]:
        rows = await db.scalars(select(Ticket).order_by(Ticket.created_at))
        return [
            SyncTicket(
                code=t.code,
                holder_name=t.holder_name,
                ticket_name=t.ticket_name,
                ticket_slug=t.ticket_slug,
                status=t.status.value,
                checked_in_at=_iso(t.checked_in_at),
            )
            for t in rows
        ]

    async def apply_offline(
        self, db: AsyncSession, checkins: list, *, staff: StaffUser
    ) -> list[dict]:
        """Aplica check-ins feitos offline. Resolve conflitos: se o ingresso já
        foi usado (aqui ou em outro dispositivo), marca 'duplicate'."""
        results: list[dict] = []
        for item in checkins:
            code = tokens.parse(item.token)
            if not code:
                results.append({"token": item.token, "result": "invalid", "code": None})
                continue
            ticket = await db.scalar(select(Ticket).where(Ticket.code == code))
            if not ticket:
                results.append({"token": item.token, "result": "invalid", "code": None})
                continue
            if ticket.status == TicketStatus.CANCELED:
                results.append({"token": item.token, "result": "canceled", "code": code})
                continue

            when = self._parse_at(item.at)
            res = await db.execute(
                update(Ticket)
                .where(Ticket.id == ticket.id, Ticket.status == TicketStatus.VALID)
                .values(
                    status=TicketStatus.CHECKED_IN,
                    checked_in_at=when,
                    checked_in_by=staff.id,
                    checked_in_device=item.device_id,
                )
            )
            result = "approved" if res.rowcount == 1 else "duplicate"
            results.append({"token": item.token, "result": result, "code": code})
        await db.commit()
        logger.info("sync offline staff=%s itens=%s", staff.username, len(results))
        return results

    def _parse_at(self, raw: str) -> datetime:
        try:
            dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            return min(dt, now)  # nunca aceita carimbo no futuro (relógio adiantado)
        except (ValueError, AttributeError):
            return datetime.now(timezone.utc)

    # ---------------- estatísticas ----------------

    async def stats(self, db: AsyncSession) -> StatsOut:
        checked = await db.scalar(
            select(func.count()).select_from(Ticket).where(Ticket.status == TicketStatus.CHECKED_IN)
        ) or 0
        valid = await db.scalar(
            select(func.count()).select_from(Ticket).where(Ticket.status == TicketStatus.VALID)
        ) or 0
        canceled = await db.scalar(
            select(func.count()).select_from(Ticket).where(Ticket.status == TicketStatus.CANCELED)
        ) or 0
        return StatsOut(
            total=checked + valid,
            checked_in=checked,
            remaining=valid,
            canceled=canceled,
        )


ticket_service = TicketService()
