from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=200)


class StaffOut(BaseModel):
    id: str
    username: str
    name: str
    role: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int          # segundos
    user: StaffOut


class StaffCreateIn(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=6, max_length=200)
    role: str = Field(default="STAFF", pattern="^(ADMIN|STAFF)$")


class StaffListItem(BaseModel):
    id: str
    username: str
    name: str
    role: str
    active: bool
    last_login_at: Optional[str] = None
