# WNBF Checkout — Backend

API de pagamento do checkout de ingressos (Pix e cartão) via **Asaas**, em
FastAPI + SQLAlchemy async + PostgreSQL (Supabase). Espelha a arquitetura em
camadas do projeto Mecaflow.

## Arquitetura (camadas)

```
app/
├── api/          routers (um por recurso) — só HTTP, sem regra de negócio
│   ├── checkout.py   POST /checkout · GET /checkout/{id}/status
│   ├── webhooks.py   POST /webhooks/asaas  (autenticado por token)
│   └── sse.py        GET  /sse/orders/{id} (confirmação do Pix em tempo real)
├── services/     regra de negócio
│   ├── checkout_service.py   orquestra pedido + cobrança
│   ├── asaas_service.py      cliente HTTP do gateway
│   ├── webhook_service.py    processa eventos (idempotente)
│   ├── fulfillment_service.py entrega do ingresso (stub — integrar e-mail)
│   ├── rate_limit.py         anti-abuso (Redis ou memória)
│   └── sse_service.py        broadcaster SSE
├── models/       ORM SQLAlchemy (ticket_types, orders, webhook_events)
├── schemas/      Pydantic In/Out (validação forte)
├── core/         config, database, redis, security (cripto), validators
└── data/         catálogo de ingressos (fonte da verdade dos preços)
```

## Rodando localmente

```bash
cd backend
py -3.11 -m venv .venv
./.venv/Scripts/python -m pip install -r requirements.txt
cp .env.example .env          # e preencha os valores
./.venv/Scripts/python -m alembic upgrade head   # cria tabelas + seed
./.venv/Scripts/python -m uvicorn main:app --reload --port 8080
```

Health: `GET http://localhost:8080/health` · Docs (dev): `/docs`.

## Variáveis de ambiente

| Var | Descrição |
|---|---|
| `DATABASE_URL` | Supabase (Session Pooler, IPv4, porta 5432) |
| `REDIS_URL` | opcional — sem ele, rate limit usa memória |
| `ASAAS_API_KEY` | chave da conta Asaas (sandbox/produção) |
| `ASAAS_BASE_URL` | `https://sandbox.asaas.com/api/v3` ou `https://api.asaas.com/v3` |
| `ASAAS_WEBHOOK_TOKEN` | token do webhook (definido no painel do Asaas) |
| `ENCRYPTION_KEY` | Fernet — cifra PII em repouso (**gere própria, nunca commite**) |
| `DOC_HASH_KEY` | HMAC — hash de busca do documento |
| `CORS_ORIGINS` | origens liberadas (frontend) |

> **Segredos** ficam só no `.env` (dev, gitignored) ou no painel do EasyPanel
> (produção). Nunca no código nem no git.

## Segurança implementada

- **Chave do Asaas só no servidor** — o frontend nunca fala com o gateway.
- **Preço calculado no servidor** (tabela `ticket_types`) — o valor do cliente é ignorado (anti-adulteração).
- **Webhook autenticado** por token (`asaas-access-token`) com `compare_digest` + **idempotência** via `webhook_events` (nunca processa 2x).
- **Idempotency-Key** no checkout evita cobrança duplicada por clique repetido.
- **Rate limit** por IP (anti-carding).
- **Validação server-side** de CPF/CNPJ, e-mail, telefone e CEP (não confia no front).
- **Headers de segurança** (HSTS, nosniff, X-Frame-Options, no-store) + **CORS restrito**.
- **Docs desabilitadas em produção**.
- **TLS** obrigatório no banco (`ssl: require`).

## LGPD

- **Cripto em repouso**: CPF/CNPJ, telefone e endereço são cifrados (Fernet). O documento tem também um **HMAC** para busca/dedupe sem expor o dado.
- **Minimização**: coletamos só o necessário para a compra e a nota.
- **Consentimento**: registrado (`consent_accepted`, `consent_at`, `consent_ip`, `terms_version`) — base legal: execução de contrato + consentimento.
- **Direito ao esquecimento**: campo `anonymized_at` previsto para anonimização (rotina de expurgo a implementar).
- **Logs sem PII**: documento e e-mail são mascarados antes de logar.

## Para ir à produção (pendências)

1. **Criar conta no Asaas**, pegar a `ASAAS_API_KEY` e cadastrar o webhook apontando para `POST /api/webhooks/asaas` com o `ASAAS_WEBHOOK_TOKEN`.
2. **Cartão / PCI**: hoje os dados do cartão trafegam pelo backend e vão direto ao Asaas (não são persistidos — guardamos só bandeira + últimos 4). Para reduzir escopo PCI, migrar para **tokenização no frontend** (JS do Asaas) ou checkout hospedado.
3. **Entrega do ingresso**: implementar `fulfillment_service.fulfill_order` (gerar QR único + e-mail transacional).
4. **Rotina LGPD** de anonimização/expurgo por retenção.
5. **Redis** em produção para rate limit distribuído.
6. Conectar o **frontend** (ver abaixo).

## Integração com o frontend

No `Checkout.jsx`, trocar o `handleSubmit` simulado por:

1. `POST /api/checkout` com os campos + `ticket_slug` + `Idempotency-Key`.
2. **Pix**: exibir `pix.qr_image` (data URI) e `pix.copy_paste`; abrir `EventSource('/api/sse/orders/{order_id}')` para receber a confirmação e mostrar a tela de sucesso.
3. **Cartão**: usar o `status` retornado (`PAID` → sucesso; `PENDING` → em análise).
