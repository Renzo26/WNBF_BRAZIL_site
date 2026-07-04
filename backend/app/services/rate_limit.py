"""Rate limiting por IP. Usa Redis (janela fixa) se disponível; senão, memória.

Protege o endpoint de checkout contra abuso e teste de cartões (carding)."""
from __future__ import annotations

import time

from app.core.redis import get_redis

# fallback em memória: {key: (contagem, epoch_da_janela)}
_memory: dict[str, tuple[int, float]] = {}


async def allow(key: str, limit: int, window_s: int) -> bool:
    redis = await get_redis()
    if redis is not None:
        redis_key = f"rl:{key}"
        count = await redis.incr(redis_key)
        if count == 1:
            await redis.expire(redis_key, window_s)
        return count <= limit

    # fallback em memória (processo único)
    now = time.time()
    count, start = _memory.get(key, (0, now))
    if now - start >= window_s:
        count, start = 0, now
    count += 1
    _memory[key] = (count, start)
    return count <= limit
