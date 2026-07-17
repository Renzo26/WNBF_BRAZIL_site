-- ============================================================
-- VIRADA DO 2º LOTE — preço COBRADO (fonte da verdade do servidor)
-- ------------------------------------------------------------
-- Este script NÃO faz parte da cadeia de migrations do Alembic de
-- propósito: o Dockerfile roda `alembic upgrade head` a cada start,
-- então uma migration aqui viraria o lote sozinha no próximo deploy.
-- Rode este SQL MANUALMENTE, só no momento real da virada, junto com
-- trocar LOTE_ATIVO = 2 no frontend (src/data.js).
--
-- Valores em CENTAVOS. Preços do 2º lote:
--   dia-1              R$ 135,00 -> 13500
--   passaporte-2-dias  R$ 252,00 -> 25200
--   dia-2              R$ 135,00 -> 13500
--
-- Uso (psql):
--   psql "$DATABASE_URL" -f backend/scripts/virar_lote_2.sql
-- ============================================================

BEGIN;

-- Confere os valores ANTES (1º lote): 11400 / 18900 / 11400
SELECT slug, name, unit_amount AS antes_centavos
FROM ticket_types
WHERE slug IN ('dia-1', 'passaporte-2-dias', 'dia-2')
ORDER BY slug;

UPDATE ticket_types SET unit_amount = 13500 WHERE slug = 'dia-1';
UPDATE ticket_types SET unit_amount = 25200 WHERE slug = 'passaporte-2-dias';
UPDATE ticket_types SET unit_amount = 13500 WHERE slug = 'dia-2';

-- Confere os valores DEPOIS (2º lote): 13500 / 25200 / 13500
SELECT slug, name, unit_amount AS depois_centavos
FROM ticket_types
WHERE slug IN ('dia-1', 'passaporte-2-dias', 'dia-2')
ORDER BY slug;

-- Revise os SELECTs acima. Se estiver correto, troque para COMMIT.
-- (deixado em ROLLBACK por segurança para você conferir primeiro)
ROLLBACK;
-- COMMIT;
