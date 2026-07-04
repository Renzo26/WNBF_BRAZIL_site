def brl(cents: int) -> str:
    """Formata centavos em moeda BRL (R$ 1.234,56)."""
    return f"R$ {cents / 100:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
