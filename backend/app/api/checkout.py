import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import client_ip, get_session
from app.core.config import get_settings
from app.models.order import Order, OrderStatus
from app.schemas.checkout import CheckoutIn, CheckoutOut, OrderStatusOut
from app.services.checkout_service import CheckoutError, checkout_service
from app.services.rate_limit import allow

router = APIRouter(prefix="/checkout", tags=["checkout"])
_settings = get_settings()


@router.post("", response_model=CheckoutOut, status_code=status.HTTP_201_CREATED)
async def create_checkout(
    body: CheckoutIn,
    request: Request,
    db: AsyncSession = Depends(get_session),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    ip = client_ip(request)

    # rate limit por IP (anti-abuso / carding)
    if not await allow(f"checkout:{ip}", _settings.checkout_rate_limit, _settings.checkout_rate_window_s):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas. Aguarde um instante e tente novamente.",
        )

    try:
        return await checkout_service.create(db, body, client_ip=ip, idempotency_key=idempotency_key)
    except CheckoutError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get("/{order_id}/status", response_model=OrderStatusOut)
async def get_status(order_id: uuid.UUID, db: AsyncSession = Depends(get_session)):
    order = await db.scalar(select(Order).where(Order.id == order_id))
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado")
    return OrderStatusOut(
        order_id=str(order.id),
        status=order.status.value,
        method=order.method.value,
        paid=order.status == OrderStatus.PAID,
    )
