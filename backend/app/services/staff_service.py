"""Regras de autenticação e gestão do staff (credenciadores)."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import create_access_token, hash_password, verify_password
from app.core.config import get_settings
from app.models.staff_user import StaffRole, StaffUser

logger = logging.getLogger("staff.service")
_settings = get_settings()


class StaffError(Exception):
    def __init__(self, message: str, *, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class StaffService:
    async def authenticate(self, db: AsyncSession, username: str, password: str) -> tuple[StaffUser, str]:
        user = await db.scalar(select(StaffUser).where(StaffUser.username == username.strip().lower()))
        # Sempre executa o verify (mesmo sem usuário) p/ não vazar timing de existência.
        placeholder = "$2b$12$0000000000000000000000000000000000000000000000000000a"
        ok = verify_password(password, user.hashed_password if user else placeholder)
        if not user or not ok or not user.active:
            raise StaffError("Usuário ou senha inválidos", status_code=401)

        user.last_login_at = datetime.now(timezone.utc)
        await db.commit()

        token = create_access_token(subject=str(user.id), name=user.name, role=user.role.value)
        logger.info("login staff=%s role=%s", user.username, user.role.value)
        return user, token

    async def create_user(
        self, db: AsyncSession, *, username: str, name: str, password: str, role: str
    ) -> StaffUser:
        username = username.strip().lower()
        exists = await db.scalar(select(StaffUser).where(StaffUser.username == username))
        if exists:
            raise StaffError("Já existe um usuário com esse login", status_code=409)
        user = StaffUser(
            username=username,
            name=name.strip(),
            hashed_password=hash_password(password),
            role=StaffRole(role),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info("staff criado username=%s role=%s", user.username, user.role.value)
        return user

    async def seed_admin_if_empty(self, db: AsyncSession) -> None:
        """Cria o 1º admin a partir do .env se a tabela ainda estiver vazia."""
        if not _settings.staff_seed_username or not _settings.staff_seed_password:
            return
        count = await db.scalar(select(func.count()).select_from(StaffUser))
        if count:
            return
        await self.create_user(
            db,
            username=_settings.staff_seed_username,
            name=_settings.staff_seed_name,
            password=_settings.staff_seed_password,
            role="ADMIN",
        )
        logger.info("admin inicial criado a partir do .env (username=%s)", _settings.staff_seed_username)


staff_service = StaffService()
