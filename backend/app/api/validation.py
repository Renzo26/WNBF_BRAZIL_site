"""Endpoints do app de credenciamento (validação de ingressos na portaria).

Todos exigem staff autenticado (Bearer JWT)."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_staff, get_session
from app.models.staff_user import StaffUser
from app.schemas.validation import (
    OfflineResult,
    StatsOut,
    SyncDownOut,
    SyncUpIn,
    SyncUpOut,
    ValidateIn,
    ValidateOut,
)
from app.services.ticket_service import ticket_service

router = APIRouter(prefix="/validation", tags=["validation"])


@router.post("/validate", response_model=ValidateOut)
async def validate(
    body: ValidateIn,
    staff: StaffUser = Depends(get_current_staff),
    db: AsyncSession = Depends(get_session),
):
    return await ticket_service.validate(
        db, body.token, staff=staff, device_id=body.device_id
    )


@router.get("/sync", response_model=SyncDownOut)
async def sync_down(
    staff: StaffUser = Depends(get_current_staff),
    db: AsyncSession = Depends(get_session),
):
    """Baixa a lista de ingressos para validação offline + estatísticas."""
    tickets = await ticket_service.list_for_sync(db)
    stats = await ticket_service.stats(db)
    return SyncDownOut(
        server_time=datetime.now(timezone.utc).isoformat(),
        tickets=tickets,
        stats=stats,
    )


@router.post("/sync", response_model=SyncUpOut)
async def sync_up(
    body: SyncUpIn,
    staff: StaffUser = Depends(get_current_staff),
    db: AsyncSession = Depends(get_session),
):
    """Envia os check-ins feitos offline; o servidor resolve conflitos."""
    raw = await ticket_service.apply_offline(db, body.checkins, staff=staff)
    stats = await ticket_service.stats(db)
    return SyncUpOut(results=[OfflineResult(**r) for r in raw], stats=stats)


@router.get("/stats", response_model=StatsOut)
async def stats(
    staff: StaffUser = Depends(get_current_staff),
    db: AsyncSession = Depends(get_session),
):
    return await ticket_service.stats(db)
