import hmac
import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_session
from app.core.config import get_settings
from app.services.webhook_service import webhook_service

router = APIRouter(tags=["webhooks"])
logger = logging.getLogger("checkout.webhook")
_settings = get_settings()


@router.post("/webhooks/asaas", status_code=status.HTTP_200_OK)
async def asaas_webhook(
    request: Request,
    db: AsyncSession = Depends(get_session),
    asaas_access_token: str | None = Header(default=None, alias="asaas-access-token"),
):
    # Autenticação do webhook: token configurado no painel do Asaas.
    expected = _settings.asaas_webhook_token
    if not expected or not asaas_access_token or not hmac.compare_digest(asaas_access_token, expected):
        logger.warning("webhook rejeitado: token inválido")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autorizado")

    payload = await request.json()
    await webhook_service.process(db, payload)
    return {"received": True}
