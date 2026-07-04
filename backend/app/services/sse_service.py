import asyncio
import json
from typing import AsyncGenerator


class SSEBroadcaster:
    """Broadcaster de Server-Sent Events com filtro por order_id.

    O checkout do Pix assina o canal do seu pedido; quando o webhook do Asaas
    confirma o pagamento, publicamos o novo status e a tela atualiza na hora."""

    def __init__(self) -> None:
        # cada item: (queue, order_id)
        self._subs: set[tuple[asyncio.Queue, str]] = set()

    def _format(self, event: str, data: dict) -> str:
        return f"event: {event}\ndata: {json.dumps(data)}\n\n"

    async def publish(self, order_id: str, event: str, data: dict) -> None:
        payload = self._format(event, data)
        dead: set = set()
        for entry in self._subs:
            q, oid = entry
            if oid != order_id:
                continue
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                dead.add(entry)
        self._subs -= dead

    async def subscribe(self, order_id: str) -> AsyncGenerator[str, None]:
        queue: asyncio.Queue = asyncio.Queue(maxsize=50)
        entry = (queue, order_id)
        self._subs.add(entry)
        try:
            # comentário inicial p/ abrir o stream
            yield ": connected\n\n"
            while True:
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=25)
                    yield payload
                except asyncio.TimeoutError:
                    # heartbeat mantém a conexão viva atrás de proxies
                    yield ": keep-alive\n\n"
        finally:
            self._subs.discard(entry)


broadcaster = SSEBroadcaster()
