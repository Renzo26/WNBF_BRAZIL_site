from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import client_ip, get_current_staff, get_session
from app.core.config import get_settings
from app.models.staff_user import StaffUser
from app.schemas.staff import LoginIn, StaffOut, TokenOut
from app.services.rate_limit import allow
from app.services.staff_service import StaffError, staff_service

router = APIRouter(prefix="/auth", tags=["auth"])
_settings = get_settings()


def _staff_out(user: StaffUser) -> StaffOut:
    return StaffOut(id=str(user.id), username=user.username, name=user.name, role=user.role.value)


@router.post("/login", response_model=TokenOut)
async def login(body: LoginIn, request: Request, db: AsyncSession = Depends(get_session)):
    ip = client_ip(request)
    # anti brute-force por IP
    if not await allow(f"login:{ip}", 10, 60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas. Aguarde um instante.",
        )
    try:
        user, token = await staff_service.authenticate(db, body.username, body.password)
    except StaffError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return TokenOut(
        access_token=token,
        expires_in=_settings.jwt_expire_minutes * 60,
        user=_staff_out(user),
    )


@router.get("/me", response_model=StaffOut)
async def me(staff: StaffUser = Depends(get_current_staff)):
    return _staff_out(staff)
