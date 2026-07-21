"""Regra de negócio do checkout: valida, calcula preço no servidor, persiste o
pedido com PII cifrada e cria a cobrança no Asaas (Pix ou cartão)."""
from __future__ import annotations

import json
import logging
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.money import brl
from app.core.security import doc_hash, encrypt, mask_doc, mask_email
from app.core.validators import doc_kind
from app.models.order import DocType, Order, OrderStatus, PaymentMethod
from app.models.ticket_type import TicketType
from app.schemas.checkout import CheckoutIn, CheckoutOut, PixOut, TicketOut
from app.services.asaas_service import AsaasError, asaas_service
from app.services.fulfillment_service import fulfill_order
from app.services.ticket_service import qr_token as ticket_qr_token
from app.services.ticket_service import ticket_service

logger = logging.getLogger("checkout.service")
_settings = get_settings()

_PAID_STATUSES = {"CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"}
_PENDING_STATUSES = {"PENDING", "AWAITING_RISK_ANALYSIS"}


class CheckoutError(Exception):
    def __init__(self, message: str, *, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _service_fee(unit_cents: int, method: str) -> int:
    """Taxa de serviço (repasse da taxa do Asaas) em centavos, por método.
    Espelha src/data.js::serviceFee — o valor exibido no front tem que bater
    com o cobrado aqui (que é a fonte da verdade)."""
    if method == "card":
        return round(unit_cents * _settings.asaas_card_fee_pct) + _settings.asaas_card_fee_cents
    return _settings.asaas_pix_fee_cents


def _card_brand(digits: str) -> str:
    if digits.startswith("4"):
        return "Visa"
    if digits[:2] in {"51", "52", "53", "54", "55"} or 2221 <= int(digits[:4] or 0) <= 2720:
        return "Mastercard"
    if digits[:2] in {"34", "37"}:
        return "Amex"
    if digits[:2] in {"36", "38"}:
        return "Elo"
    return "Cartão"


class CheckoutService:
    async def create(
        self, db: AsyncSession, data: CheckoutIn, *, client_ip: str, idempotency_key: str | None
    ) -> CheckoutOut:
        # ---- idempotência: replay retorna o mesmo pedido ----
        if idempotency_key:
            existing = await db.scalar(select(Order).where(Order.idempotency_key == idempotency_key))
            if existing:
                return await self._build_response(db, existing)

        # ---- preço vem do servidor (nunca do cliente) ----
        ticket = await db.scalar(
            select(TicketType).where(TicketType.slug == data.ticket_slug, TicketType.active.is_(True))
        )
        if not ticket:
            raise CheckoutError("Ingresso indisponível", status_code=404)

        unit = ticket.unit_amount
        fee = _service_fee(unit, data.method)  # repasse da taxa do Asaas (por método)
        total = unit + fee

        kind = doc_kind(data.doc)  # já validado no schema
        addr = data.address

        order = Order(
            idempotency_key=idempotency_key,
            ticket_slug=ticket.slug,
            ticket_name=ticket.name,
            quantity=1,
            unit_amount=unit,
            fee_amount=fee,
            total_amount=total,
            buyer_name=data.name,
            buyer_email=str(data.email).lower(),
            buyer_phone_enc=encrypt(data.phone),
            doc_type=DocType(kind),
            doc_enc=encrypt(data.doc),
            doc_hash=doc_hash(data.doc),
            address_enc=encrypt(json.dumps(addr.model_dump(), ensure_ascii=False)),
            method=PaymentMethod.PIX if data.method == "pix" else PaymentMethod.CREDIT_CARD,
            installments=data.installments,
            status=OrderStatus.PENDING,
            consent_accepted=data.consent,
            consent_at=datetime.now(timezone.utc),
            consent_ip=client_ip,
            terms_version=_settings.terms_version,
        )
        db.add(order)
        await db.commit()  # persiste antes de tocar o gateway (auditoria durável)
        await db.refresh(order)

        logger.info(
            "checkout criado order=%s ticket=%s doc=%s email=%s método=%s ip=%s",
            order.id, ticket.slug, mask_doc(data.doc), mask_email(str(data.email)), data.method, client_ip,
        )

        # ---- MODO SIMULAÇÃO: marca pago e confirma, sem chamar o Asaas ----
        if _settings.simulate_payment:
            order.status = OrderStatus.PAID
            order.paid_at = datetime.now(timezone.utc)
            if data.method == "card" and data.card:
                order.card_brand = _card_brand(data.card.digits)
                order.card_last4 = data.card.digits[-4:]
            await db.commit()
            await db.refresh(order)
            await fulfill_order(db, order)  # emite ingressos + confirmação (n8n -> WhatsApp)
            return await self._build_response(db, order)

        try:
            customer_id = await asaas_service.create_customer(
                name=data.name,
                cpf_cnpj=data.doc,
                email=str(data.email),
                phone=data.phone,
                postal_code=addr.cep,
                address_number=addr.number,
                address=addr.logradouro,
                province=addr.bairro,
                complement=addr.complemento,
            )
            order.asaas_customer_id = customer_id

            if data.method == "pix":
                await self._charge_pix(order, total, ticket.name)
            else:
                await self._charge_card(db, order, data, total, ticket.name, client_ip)
        except AsaasError as exc:
            order.status = OrderStatus.FAILED
            # libera a chave para permitir nova tentativa do comprador
            order.idempotency_key = None
            await db.commit()
            raise CheckoutError(exc.message, status_code=exc.status_code)

        await db.commit()
        await db.refresh(order)
        return await self._build_response(db, order)

    async def _charge_pix(self, order: Order, total: int, description: str) -> None:
        due = (date.today() + timedelta(days=1)).isoformat()
        payment = await asaas_service.create_pix_payment(
            customer_id=order.asaas_customer_id,
            value_reais=round(total / 100, 2),
            due_date=due,
            description=description,
            external_reference=str(order.id),
        )
        order.asaas_payment_id = payment["id"]
        order.expires_at = datetime.now(timezone.utc) + timedelta(minutes=_settings.pix_expiration_minutes)

    async def _charge_card(
        self, db: AsyncSession, order: Order, data: CheckoutIn, total: int, description: str, client_ip: str
    ) -> None:
        card = data.card
        digits = card.digits
        order.card_brand = _card_brand(digits)
        order.card_last4 = digits[-4:]
        due = date.today().isoformat()
        payment = await asaas_service.create_card_payment(
            customer_id=order.asaas_customer_id,
            total_reais=round(total / 100, 2),
            installment_count=data.installments,
            due_date=due,
            description=description,
            external_reference=str(order.id),
            card={
                "holderName": card.holder_name,
                "number": digits,
                "expiryMonth": card.exp_month,
                "expiryYear": card.exp_year,
                "ccv": card.cvv,
            },
            holder_info={
                "name": data.name,
                "email": str(data.email),
                "cpfCnpj": data.doc,
                "postalCode": data.address.cep,
                "addressNumber": data.address.number,
                "phone": data.phone,
            },
            remote_ip=client_ip,
        )
        order.asaas_payment_id = payment.get("id")
        status = (payment.get("status") or "").upper()
        if status in _PAID_STATUSES:
            order.status = OrderStatus.PAID
            order.paid_at = datetime.now(timezone.utc)
            await fulfill_order(db, order)
        elif status in _PENDING_STATUSES:
            order.status = OrderStatus.PENDING
        else:
            order.status = OrderStatus.FAILED
            raise AsaasError("Cartão recusado. Verifique os dados ou tente outro.", status_code=400)

    async def _build_response(self, db: AsyncSession, order: Order) -> CheckoutOut:
        pix: PixOut | None = None
        if order.method == PaymentMethod.PIX and order.status == OrderStatus.PENDING and order.asaas_payment_id:
            try:
                qr = await asaas_service.get_pix_qr(order.asaas_payment_id)
                pix = PixOut(
                    qr_image=f"data:image/png;base64,{qr.get('encodedImage', '')}",
                    copy_paste=qr.get("payload"),
                    expires_at=qr.get("expirationDate"),
                )
            except AsaasError:
                pix = PixOut()

        # ingressos já emitidos (pedido pago) — o front gera o QR a partir do qr_token
        tickets_out: list[TicketOut] = []
        if order.status == OrderStatus.PAID:
            for t in await ticket_service.tickets_for_order(db, order.id):
                tickets_out.append(
                    TicketOut(
                        code=t.code,
                        qr_token=ticket_qr_token(t),
                        holder_name=t.holder_name,
                        ticket_name=t.ticket_name,
                    )
                )

        return CheckoutOut(
            order_id=str(order.id),
            status=order.status.value,
            method=order.method.value,
            total_amount=order.total_amount,
            total_formatted=brl(order.total_amount),
            pix=pix,
            tickets=tickets_out,
        )


checkout_service = CheckoutService()
