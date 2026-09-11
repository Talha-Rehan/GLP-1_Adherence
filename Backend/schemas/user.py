from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email:    EmailStr
    password: str = Field(min_length=8, max_length=72)


class UserLogin(BaseModel):
    email:    EmailStr
    password: str = Field(max_length=72)


class UserPublic(BaseModel):
    id:    str
    email: str


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         UserPublic