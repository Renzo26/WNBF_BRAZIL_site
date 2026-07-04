from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuração da aplicação. Todos os segredos vêm de variáveis de ambiente
    (arquivo .env no dev; painel do EasyPanel em produção) — nunca do código."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # ---- Banco de dados (Supabase — Session Pooler / IPv4) ----
    database_url: str

    # ---- Redis (opcional: rate limit distribuído). Sem Redis, cai para memória. ----
    redis_url: str | None = None

    # ---- Asaas (gateway de pagamento) ----
    asaas_api_key: str = ""
    # Sandbox: https://sandbox.asaas.com/api/v3 · Produção: https://api.asaas.com/v3
    asaas_base_url: str = "https://sandbox.asaas.com/api/v3"
    # Token que configuramos no painel do Asaas e que ele reenvia no header do webhook
    asaas_webhook_token: str = ""

    # ---- Criptografia de PII em repouso (LGPD) ----
    # Chave Fernet (base64 urlsafe de 32 bytes) para cifrar CPF/CNPJ, telefone, endereço
    encryption_key: str
    # Chave HMAC para gerar hash determinístico do documento (busca/dedupe sem expor o dado)
    doc_hash_key: str

    # ---- Regras de negócio ----
    fee_rate: float = 0.10            # taxa de serviço sobre o ingresso
    pix_expiration_minutes: int = 30  # validade do QR Pix
    terms_version: str = "2026-07-03" # versão dos termos/privacidade aceitos no checkout

    # ---- Segurança / rate limit ----
    checkout_rate_limit: int = 8      # tentativas de checkout
    checkout_rate_window_s: int = 60  # por janela (segundos), por IP

    # ---- App ----
    app_env: str = "development"
    app_port: int = 8080
    frontend_url: str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173,http://localhost:5174"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {"production", "prod"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
