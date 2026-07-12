"""Autenticação do staff (app de credenciamento): hash de senha + JWT.

- Senha: bcrypt via passlib (nunca armazenamos a senha em claro).
- Sessão: JWT HS256 assinado com JWT_SECRET (cai para DOC_HASH_KEY se vazio).
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

_settings = get_settings()
_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"


def hash_password(plain: str) -> str:
    return _pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _pwd.verify(plain, hashed)
    except ValueError:
        return False


def create_access_token(*, subject: str, name: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "name": name,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=_settings.jwt_expire_minutes)).timestamp()),
    }
    return jwt.encode(payload, _settings.jwt_key, algorithm=ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, _settings.jwt_key, algorithms=[ALGORITHM])
    except JWTError:
        return None
