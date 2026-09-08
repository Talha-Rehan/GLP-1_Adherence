from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email:    EmailStr
    password: str


class UserLogin(BaseModel):
    email:    EmailStr
    password: str


class UserPublic(BaseModel):
    id:    str
    email: str


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         UserPublic