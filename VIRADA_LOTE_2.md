# Virada do 2º lote

O site já está **pronto para o 2º lote**, sem quebrar o 1º. Este guia explica
como pré-visualizar, como virar de verdade e como reverter.

## Preços

| Ingresso            | 1º lote | 2º lote |
| ------------------- | ------- | ------- |
| Ingresso Dia 1      | R$ 114  | R$ 135  |
| Passaporte 2 Dias   | R$ 189  | R$ 252  |
| Ingresso Dia 2      | R$ 114  | R$ 135  |

Taxa de serviço: **10%** sobre o valor (inalterada — `FEE_RATE` no front / `fee_rate` no back).

## Duas peças independentes

1. **Frontend (o que aparece na landing e no checkout)** — controlado por uma
   chave única: `LOTE_ATIVO` em [`src/data.js`](src/data.js).
2. **Preço COBRADO (fonte da verdade)** — vem do banco (`ticket_types`), nunca do
   front. Trocado por um SQL manual: [`backend/scripts/virar_lote_2.sql`](backend/scripts/virar_lote_2.sql).

> ⚠️ As duas peças precisam virar **juntas**. Se o front mostrar 2º lote mas o
> banco ainda estiver no 1º, o cliente vê R$ 135 e é cobrado R$ 114 (e vice-versa).

## Pré-visualizar sem virar nada

Sem editar código, abra a landing com o parâmetro na URL:

- `?lote=1` → versão 1º lote
- `?lote=2` → versão 2º lote (selo âmbar, "1º lote esgotado", preço riscado)

Isso afeta só a **exibição** — o preço cobrado continua o do banco.

## Estado atual do repositório

- `LOTE_ATIVO = 2` em `src/data.js` → a landing **exibe** o 2º lote.
- Catálogo (`backend/app/data/tickets.py`) já está com os valores do 2º lote
  (13500 / 25200 / 13500) — novos ambientes já seedam no 2º lote.
- A virada do preço COBRADO em produção é feita pela migration
  `backend/alembic/versions/0003_virar_lote_2.py`, que roda no `alembic upgrade
  head` do **deploy do backend**. Enquanto o backend de produção não for
  deployado com essa revisão, o banco **ainda cobra o 1º lote**.

## Virar de verdade (na hora certa)

1. **Front:** confirme `LOTE_ATIVO = 2` em `src/data.js` e faça o deploy do `web`.
2. **Back:** rode o SQL contra o banco de produção:
   ```bash
   psql "$DATABASE_URL" -f backend/scripts/virar_lote_2.sql
   ```
   O script mostra os valores antes/depois e vem em `ROLLBACK` por segurança —
   confira os `SELECT` e troque para `COMMIT` para efetivar.
3. (Opcional) Para novos ambientes criados do zero seedarem já no 2º lote,
   atualize também os `unit_amount` em
   [`backend/app/data/tickets.py`](backend/app/data/tickets.py) (13500 / 25200 / 13500).

## Reverter para o 1º lote

- **Front:** `LOTE_ATIVO = 1` em `src/data.js` + deploy.
- **Back:** `UPDATE ticket_types SET unit_amount = 11400 WHERE slug IN ('dia-1','dia-2');`
  e `UPDATE ticket_types SET unit_amount = 18900 WHERE slug = 'passaporte-2-dias';`
