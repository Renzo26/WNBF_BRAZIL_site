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

    # ---- Simulação de pagamento (enquanto o Asaas não está ligado) ----
    # Quando True, o checkout marca o pedido como PAGO na hora (não chama o Asaas)
    # e dispara a confirmação — útil para testar o fluxo ponta a ponta.
    simulate_payment: bool = False
    # Webhook do n8n que recebe a confirmação (para enviar WhatsApp, e-mail etc.)
    n8n_confirm_webhook_url: str = ""

    # ---- Criptografia de PII em repouso (LGPD) ----
    # Chave Fernet (base64 urlsafe de 32 bytes) para cifrar CPF/CNPJ, telefone, endereço
    encryption_key: str
    # Chave HMAC para gerar hash determinístico do documento (busca/dedupe sem expor o dado)
    doc_hash_key: str

    # ---- Ingresso / credenciamento ----
    # Chave HMAC que assina o token do QR do ingresso (impede forjar QR válido).
    # Se vazia, cai para doc_hash_key (funciona, mas o ideal é uma chave própria).
    ticket_sign_key: str = ""
    # JWT do app de credenciamento (login do staff). Se vazio, cai para doc_hash_key.
    jwt_secret: str = ""
    jwt_expire_minutes: int = 720     # 12h — cobre um dia inteiro de evento
    # Seed do 1º usuário admin no start (só cria se ainda não houver usuários).
    staff_seed_username: str = ""
    staff_seed_password: str = ""
    staff_seed_name: str = "Administrador"

    @property
    def ticket_key(self) -> str:
        return self.ticket_sign_key or self.doc_hash_key

    @property
    def jwt_key(self) -> str:
        return self.jwt_secret or self.doc_hash_key

    # ---- Regras de negócio ----
    # Taxa de serviço = repasse da taxa do gateway (Asaas), varia por método.
    # Valores em centavos (jul/2026). A MESMA regra roda no front (src/data.js).
    asaas_pix_fee_cents: int = 199    # Pix: R$ 1,99 fixo
    asaas_card_fee_pct: float = 0.0299  # Cartão: 2,99% ...
    asaas_card_fee_cents: int = 49    #        ... + R$ 0,49
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
