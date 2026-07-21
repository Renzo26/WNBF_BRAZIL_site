"""Cliente da API do Asaas (gateway de pagamento).

A chave da API vive só no servidor (ASAAS_API_KEY). Toda comunicação usa HTTPS
com timeout. Erros do Asaas viram `AsaasError` com mensagem segura (sem vazar
detalhes internos ao cliente)."""
from __future__ import annotations

import logging
from typing import Any, Optional

import httpx

from app.core.config import get_settings

logger = logging.getLogger("checkout.asaas")


class AsaasError(Exception):
    """Falha ao comunicar/processar no Asaas."""

    def __init__(self, message: str, *, status_code: int = 502) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class AsaasService:
    def __init__(self) -> None:
        settings = get_settings()
        self._base_url = settings.asaas_base_url.rstrip("/")
        self._api_key = settings.asaas_api_key
        self._timeout = httpx.Timeout(20.0, connect=10.0)

    @property
    def configured(self) -> bool:
        return bool(self._api_key)

    def _headers(self) -> dict[str, str]:
        return {
            "access_token": self._api_key,
            "Content-Type": "application/json",
            "User-Agent": "WNBF-Checkout/1.0",
        }

    async def _request(self, method: str, path: str, json: Optional[dict] = None) -> dict[str, Any]:
        if not self.configured:
            raise AsaasError("Gateway de pagamento não configurado", status_code=503)
        url = f"{self._base_url}{path}"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.request(method, url, json=json, headers=self._headers())
        except httpx.HTTPError as exc:
            logger.error("Asaas conexão falhou: %s", exc.__class__.__name__)
            raise AsaasError("Não foi possível contatar o provedor de pagamento")

        if resp.status_code >= 400:
            # Asaas devolve {"errors": [{"description": "..."}]}
            description = "Pagamento recusado pelo provedor"
            try:
                data = resp.json()
                errs = data.get("errors") or []
                if errs and isinstance(errs, list):
                    description = errs[0].get("description", description)
            except Exception:
                pass
            logger.warning("Asaas %s %s -> %s: %s", method, path, resp.status_code, description)
            raise AsaasError(description, status_code=400 if resp.status_code < 500 else 502)

        try:
            return resp.json()
        except Exception:
            raise AsaasError("Resposta inválida do provedor de pagamento")

    # ------------------------- clientes -------------------------

    async def create_customer(
        self,
        *,
        name: str,
        cpf_cnpj: str,
        email: str,
        phone: str,
        postal_code: str,
        address_number: str,
        address: Optional[str] = None,
        province: Optional[str] = None,
        complement: Optional[str] = None,
    ) -> str:
        body = {
            "name": name,
            "cpfCnpj": cpf_cnpj,
            "email": email,
            "mobilePhone": phone,
            "postalCode": postal_code,
            "addressNumber": address_number,
            "address": address,
            "province": province,
            "complement": complement,
            "notificationDisabled": True,  # nós é que enviamos o ingresso
        }
        data = await self._request("POST", "/customers", {k: v for k, v in body.items() if v is not None})
        return data["id"]

    # ------------------------- cobranças -------------------------

    async def create_pix_payment(
        self, *, customer_id: str, value_reais: float, due_date: str, description: str, external_reference: str
    ) -> dict[str, Any]:
        body = {
            "customer": customer_id,
            "billingType": "PIX",
            "value": value_reais,
            "dueDate": due_date,
            "description": description,
            "externalReference": external_reference,
        }
        return await self._request("POST", "/payments", body)

    async def get_pix_qr(self, payment_id: str) -> dict[str, Any]:
        return await self._request("GET", f"/payments/{payment_id}/pixQrCode")

    async def create_card_payment(
        self,
        *,
        customer_id: str,
        total_reais: float,
        installment_count: int,
        due_date: str,
        description: str,
        external_reference: str,
        card: dict[str, str],
        holder_info: dict[str, str],
        remote_ip: str,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {
            "customer": customer_id,
            "billingType": "CREDIT_CARD",
            "dueDate": due_date,
            "description": description,
            "externalReference": external_reference,
            "creditCard": card,
            "creditCardHolderInfo": holder_info,
            "remoteIp": remote_ip,
        }
        if installment_count > 1:
            body["installmentCount"] = installment_count
            body["totalValue"] = total_reais
        else:
            body["value"] = total_reais
        return await self._request("POST", "/payments", body)


asaas_service = AsaasService()
