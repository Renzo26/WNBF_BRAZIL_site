"""Token do QR do ingresso.

O QR do ingresso NÃO pode ser um simples id do pedido: qualquer pessoa poderia
forjar/duplicar. Aqui o conteúdo do QR é o `code` do ingresso + uma assinatura
HMAC-SHA256 truncada. A validação recomputa a assinatura (tempo constante) e
rejeita qualquer QR adulterado, sem depender do banco.

Formato do QR:  ``NFH1:<code>:<sig>``
  - NFH1  → versão do esquema (Natural Fitness & Health, v1)
  - code  → código legível do ingresso (também aceito na digitação manual)
  - sig   → base32 (sem padding) dos 10 primeiros bytes do HMAC do code
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import secrets

from app.core.config import get_settings

_settings = get_settings()
_KEY = _settings.ticket_key.encode()

PREFIX = "NFH1"
_SIG_BYTES = 10  # 80 bits — inviável de forjar

# Alfabeto sem caracteres ambíguos (0/O, 1/I) para o código legível.
_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def new_code() -> str:
    """Código legível e não adivinhável do ingresso: NF-XXXX-XXXX-XXXX."""
    body = "".join(secrets.choice(_ALPHABET) for _ in range(12))
    return f"NF-{body[0:4]}-{body[4:8]}-{body[8:12]}"


def _sig(code: str) -> str:
    digest = hmac.new(_KEY, code.encode(), hashlib.sha256).digest()[:_SIG_BYTES]
    return base64.b32encode(digest).decode().rstrip("=")


def sign(code: str) -> str:
    """Conteúdo completo do QR para um `code`."""
    return f"{PREFIX}:{code}:{_sig(code)}"


def parse(raw: str) -> str | None:
    """Extrai o `code` de um conteúdo lido.

    Aceita tanto o token assinado do QR quanto o código puro (digitação manual).
    Retorna o `code` se válido, ou ``None`` se a assinatura não confere.
    """
    if not raw:
        return None
    raw = raw.strip()
    if raw.startswith(f"{PREFIX}:"):
        parts = raw.split(":")
        if len(parts) != 3:
            return None
        _, code, sig = parts
        if not hmac.compare_digest(sig, _sig(code)):
            return None
        return code
    # Código puro digitado à mão (o próprio code já é imprevisível).
    return raw.upper()
