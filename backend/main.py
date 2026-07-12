from dotenv import load_dotenv

load_dotenv()  # carrega .env no os.environ antes de qualquer import da app

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, checkout, sse, staff, validation, webhooks
from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.services.staff_service import staff_service

settings = get_settings()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # cria o 1º admin (se configurado no .env e a tabela estiver vazia)
    try:
        async with AsyncSessionLocal() as db:
            await staff_service.seed_admin_if_empty(db)
    except Exception as exc:  # não impede o boot da API
        logging.getLogger("startup").warning("seed do admin falhou: %s", exc.__class__.__name__)
    yield


app = FastAPI(
    title="WNBF Checkout API",
    version="1.0.0",
    lifespan=lifespan,
    # Sem docs públicas em produção (reduz superfície de ataque)
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None,
    openapi_url=None if settings.is_production else "/openapi.json",
)

# CORS restrito à origem do frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"https?://.*\.easypanel\.host",
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Idempotency-Key", "Authorization"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


app.include_router(checkout.router, prefix="/api")
app.include_router(webhooks.router, prefix="/api")
app.include_router(sse.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(validation.router, prefix="/api")
app.include_router(staff.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
