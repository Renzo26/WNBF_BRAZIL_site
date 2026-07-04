import uuid

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.services.sse_service import broadcaster

router = APIRouter(tags=["sse"])


@router.get("/sse/orders/{order_id}")
async def sse_order(order_id: uuid.UUID):
    """Stream do status do pedido. O checkout Pix assina e recebe a confirmação
    assim que o webhook do Asaas chega. O order_id (UUID) é a chave de acesso."""
    oid = str(order_id)

    async def event_stream():
        async for chunk in broadcaster.subscribe(oid):
            yield chunk

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )
