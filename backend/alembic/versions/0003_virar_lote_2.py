"""virada do 2º lote: preço COBRADO (ticket_types.unit_amount)

Revision ID: 0003_virar_lote_2
Revises: 0002_tickets_and_staff
Create Date: 2026-07-21

------------------------------------------------------------
⚠️ ATENÇÃO — LEIA ANTES DE DEPLOYAR
------------------------------------------------------------
O Dockerfile roda `alembic upgrade head` a cada start do container.
Portanto esta migration vira o preço do 1º -> 2º lote no MOMENTO do
deploy do backend. Só faça o push/deploy dela no instante real da
virada, JUNTO com trocar LOTE_ATIVO = 2 no frontend (src/data.js).

Preços (em CENTAVOS):
  slug                1º lote   ->  2º lote
  dia-1               11400     ->  13500   (R$ 135,00)
  passaporte-2-dias   18900     ->  25200   (R$ 252,00)
  dia-2               11400     ->  13500   (R$ 135,00)

Reversão: `downgrade` volta aos preços do 1º lote. Mas como o container
roda `upgrade head` no start, para reverter de verdade em produção não
basta rodar o downgrade — é preciso remover esta revisão do head
(ou criar uma 0004 revertendo), senão o próximo restart re-aplica.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0003_virar_lote_2"
down_revision: Union[str, None] = "0002_tickets_and_staff"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE ticket_types SET unit_amount = 13500 WHERE slug = 'dia-1'")
    op.execute("UPDATE ticket_types SET unit_amount = 25200 WHERE slug = 'passaporte-2-dias'")
    op.execute("UPDATE ticket_types SET unit_amount = 13500 WHERE slug = 'dia-2'")


def downgrade() -> None:
    op.execute("UPDATE ticket_types SET unit_amount = 11400 WHERE slug = 'dia-1'")
    op.execute("UPDATE ticket_types SET unit_amount = 18900 WHERE slug = 'passaporte-2-dias'")
    op.execute("UPDATE ticket_types SET unit_amount = 11400 WHERE slug = 'dia-2'")
