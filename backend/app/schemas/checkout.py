from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.core.security import only_digits
from app.core.validators import doc_kind, is_valid_cep, is_valid_phone


class AddressIn(BaseModel):
    cep: str
    logradouro: str = Field(min_length=1, max_length=200)
    number: str = Field(min_length=1, max_length=20)
    complemento: Optional[str] = Field(default=None, max_length=120)
    bairro: str = Field(min_length=1, max_length=120)
    cidade: str = Field(min_length=1, max_length=120)
    uf: str = Field(min_length=2, max_length=2)

    @field_validator("cep")
    @classmethod
    def _cep(cls, v: str) -> str:
        if not is_valid_cep(v):
            raise ValueError("CEP inválido")
        return only_digits(v)

    @field_validator("uf")
    @classmethod
    def _uf(cls, v: str) -> str:
        return v.upper()


class CardIn(BaseModel):
    number: str = Field(min_length=13, max_length=25)
    holder_name: str = Field(min_length=2, max_length=100)
    expiry: str = Field(description="MM/AA")
    cvv: str = Field(min_length=3, max_length=4)

    @property
    def digits(self) -> str:
        return only_digits(self.number)

    @property
    def exp_month(self) -> str:
        return only_digits(self.expiry)[:2]

    @property
    def exp_year(self) -> str:
        yy = only_digits(self.expiry)[2:4]
        return f"20{yy}" if len(yy) == 2 else yy

    @field_validator("cvv")
    @classmethod
    def _cvv(cls, v: str) -> str:
        d = only_digits(v)
        if len(d) not in (3, 4):
            raise ValueError("CVV inválido")
        return d


class CheckoutIn(BaseModel):
    ticket_slug: str = Field(max_length=50)
    name: str = Field(min_length=3, max_length=200)
    email: EmailStr
    email_confirm: EmailStr
    doc: str
    phone: str
    address: AddressIn
    method: str = Field(pattern="^(pix|card)$")
    installments: int = Field(default=1, ge=1, le=12)
    card: Optional[CardIn] = None
    consent: bool

    @field_validator("name")
    @classmethod
    def _name(cls, v: str) -> str:
        if len(v.strip().split()) < 2:
            raise ValueError("Informe o nome completo")
        return v.strip()

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        if not is_valid_phone(v):
            raise ValueError("Celular inválido")
        return only_digits(v)

    @field_validator("doc")
    @classmethod
    def _doc(cls, v: str) -> str:
        if doc_kind(v) is None:
            raise ValueError("CPF ou CNPJ inválido")
        return only_digits(v)

    @model_validator(mode="after")
    def _cross(self) -> "CheckoutIn":
        if str(self.email).lower() != str(self.email_confirm).lower():
            raise ValueError("Os e-mails não coincidem")
        if not self.consent:
            raise ValueError("É necessário aceitar os termos e a política de privacidade")
        if self.method == "card" and self.card is None:
            raise ValueError("Dados do cartão são obrigatórios")
        if self.method == "pix":
            self.installments = 1
        return self


# ------------------------- saída -------------------------

class PixOut(BaseModel):
    qr_image: Optional[str] = None       # data URI (base64) do QR
    copy_paste: Optional[str] = None     # código copia-e-cola
    expires_at: Optional[str] = None


class TicketOut(BaseModel):
    code: str            # código legível do ingresso
    qr_token: str        # conteúdo assinado do QR (o front gera o QR a partir disto)
    holder_name: str
    ticket_name: str


class CheckoutOut(BaseModel):
    order_id: str
    status: str
    method: str
    total_amount: int                    # centavos
    total_formatted: str
    pix: Optional[PixOut] = None
    tickets: list[TicketOut] = []        # preenchido quando o pedido já está pago


class OrderStatusOut(BaseModel):
    order_id: str
    status: str
    method: str
    paid: bool
