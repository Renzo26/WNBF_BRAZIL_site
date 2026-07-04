"""Criptografia de PII em repouso (LGPD) e utilidades de segurança.

- `encrypt`/`decrypt`: cifram campos sensíveis (CPF/CNPJ, telefone, endereço) com
  Fernet (AES-128-CBC + HMAC). A chave vem de ENCRYPTION_KEY.
- `doc_hash`: HMAC-SHA256 determinístico do documento — permite buscar/deduplicar
  sem armazenar o dado em claro nem permitir engenharia reversa.
- `mask_*`: mascaram PII para logs (nunca logamos dado sensível completo).
"""
from __future__ import annotations

import hashlib
import hmac
import re

from cryptography.fernet import Fernet

from app.core.config import get_settings

_settings = get_settings()
_fernet = Fernet(_settings.encryption_key.encode())
_hmac_key = _settings.doc_hash_key.encode()


def encrypt(plaintext: str | None) -> str | None:
    if plaintext is None or plaintext == "":
        return None
    return _fernet.encrypt(plaintext.encode()).decode()


def decrypt(token: str | None) -> str | None:
    if not token:
        return None
    return _fernet.decrypt(token.encode()).decode()


def doc_hash(digits: str) -> str:
    """HMAC-SHA256 dos dígitos do documento (chave secreta) — determinístico."""
    return hmac.new(_hmac_key, digits.encode(), hashlib.sha256).hexdigest()


# ---------------- máscaras para logs / respostas ----------------

def mask_doc(digits: str) -> str:
    if not digits:
        return ""
    return f"***{digits[-4:]}" if len(digits) >= 4 else "***"


def mask_email(email: str) -> str:
    if not email or "@" not in email:
        return "***"
    name, _, domain = email.partition("@")
    head = name[:2]
    return f"{head}***@{domain}"


_DIGITS = re.compile(r"\D")


def only_digits(value: str | None) -> str:
    return _DIGITS.sub("", value or "")
