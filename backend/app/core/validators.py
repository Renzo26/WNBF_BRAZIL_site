"""Validações de documentos brasileiros (server-side — nunca confiar só no front)."""
from __future__ import annotations

from app.core.security import only_digits


def is_valid_cpf(value: str) -> bool:
    cpf = only_digits(value)
    if len(cpf) != 11 or cpf == cpf[0] * 11:
        return False

    def check(length: int) -> int:
        total = sum(int(cpf[i]) * (length + 1 - i) for i in range(length))
        mod = (total * 10) % 11
        return 0 if mod == 10 else mod

    return check(9) == int(cpf[9]) and check(10) == int(cpf[10])


def is_valid_cnpj(value: str) -> bool:
    cnpj = only_digits(value)
    if len(cnpj) != 14 or cnpj == cnpj[0] * 14:
        return False

    def check(length: int) -> int:
        weights = (
            [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
            if length == 12
            else [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        )
        total = sum(int(cnpj[i]) * weights[i] for i in range(length))
        mod = total % 11
        return 0 if mod < 2 else 11 - mod

    return check(12) == int(cnpj[12]) and check(13) == int(cnpj[13])


def doc_kind(value: str) -> str | None:
    """Retorna 'CPF', 'CNPJ' ou None conforme validade."""
    digits = only_digits(value)
    if len(digits) == 11:
        return "CPF" if is_valid_cpf(digits) else None
    if len(digits) == 14:
        return "CNPJ" if is_valid_cnpj(digits) else None
    return None


def is_valid_phone(value: str) -> bool:
    return len(only_digits(value)) in (10, 11)


def is_valid_cep(value: str) -> bool:
    return len(only_digits(value)) == 8
