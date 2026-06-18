from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int = Field(example=1)
    username: str = Field(example="sandhiya")
    email: str = Field(example="sandhiya@gmail.com")
    full_name: Optional[str] = Field(example="Sandhiya K")

    is_active: bool = Field(example=True)
    is_admin: bool = Field(example=True)

    role: str = Field(example="super_admin")

    created_at: datetime

    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class TokenData(BaseModel):
    username: Optional[str] = None
