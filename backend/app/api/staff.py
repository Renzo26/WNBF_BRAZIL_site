"""Gestão de credenciadores — restrito a administradores."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_session
from app.models.staff_user import StaffUser
from app.schemas.staff import StaffCreateIn, StaffListItem
from app.services.staff_service import StaffError, staff_service

router = APIRouter(prefix="/staff", tags=["staff"])


@router.get("/users", response_model=list[StaffListItem])
async def list_users(
    _: StaffUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_session),
):
    users = await db.scalars(select(StaffUser).order_by(StaffUser.created_at))
    return [
        StaffListItem(
            id=str(u.id),
            username=u.username,
            name=u.name,
            role=u.role.value,
            active=u.active,
            last_login_at=u.last_login_at.isoformat() if u.last_login_at else None,
        )
        for u in users
    ]


@router.post("/users", response_model=StaffListItem, status_code=201)
async def create_user(
    body: StaffCreateIn,
    _: StaffUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_session),
):
    try:
        u = await staff_service.create_user(
            db, username=body.username, name=body.name, password=body.password, role=body.role
        )
    except StaffError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return StaffListItem(
        id=str(u.id), username=u.username, name=u.name, role=u.role.value, active=u.active, last_login_at=None
    )
