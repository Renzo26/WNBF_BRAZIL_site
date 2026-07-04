from redis.asyncio import Redis

from app.core.config import get_settings

_redis: Redis | None = None


async def get_redis() -> Redis | None:
    """Cliente Redis único. Retorna None se REDIS_URL não estiver configurado
    (o rate limit então usa fallback em memória)."""
    global _redis
    settings = get_settings()
    if not settings.redis_url:
        return None
    if _redis is None:
        _redis = Redis.from_url(settings.redis_url, decode_responses=True)
    return _redis
