from typing import AsyncGenerator

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import decode_token
from app.core.database import get_db
from app.models.staff_user import StaffRole, StaffUser


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db():
        yield session


async def get_current_staff(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_session),
) -> StaffUser:
    """Valida o Bearer JWT e devolve o staff logado."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão inválida")
    payload = decode_token(authorization.split(" ", 1)[1].strip())
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão expirada")
    user = await db.scalar(select(StaffUser).where(StaffUser.id == payload["sub"]))
    if not user or not user.active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário inativo")
    return user


async def get_current_admin(staff: StaffUser = Depends(get_current_staff)) -> StaffUser:
    if staff.role != StaffRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito a administradores")
    return staff


def client_ip(request: Request) -> str:
    """IP real do cliente. Atrás do Nginx/EasyPanel, usa o primeiro X-Forwarded-For."""
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "0.0.0.0"
