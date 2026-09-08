"""
Auth endpoints — register + login against the `users` collection.

Follows the same pattern as the other routers: APIRouter(), get_db()
for Mongo access, HTTPException for errors. Passwords are hashed with
bcrypt directly (no passlib — avoids a known passlib/bcrypt version
mismatch bug). Login issues a short-lived JWT via python-jose.
"""

from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import APIRouter, HTTPException
from jose import jwt

from core.config import settings
from core.mongo import get_db
from schemas.user import UserCreate, UserLogin, UserPublic, TokenResponse

router = APIRouter()

_ALGORITHM = "HS256"
_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24h


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def _create_token(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "email": email, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=_ALGORITHM)


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: UserCreate):
    db = get_db()

    existing = await db.users.find_one({"email": body.email.lower()})
    if existing is not None:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    doc = {
        "email":         body.email.lower(),
        "password_hash": _hash_password(body.password),
        "created_at":    datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(doc)
    user_id = str(result.inserted_id)

    return TokenResponse(
        access_token=_create_token(user_id, doc["email"]),
        user=UserPublic(id=user_id, email=doc["email"]),
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin):
    db = get_db()

    doc = await db.users.find_one({"email": body.email.lower()})
    if doc is None or not _verify_password(body.password, doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = str(doc["_id"])
    return TokenResponse(
        access_token=_create_token(user_id, doc["email"]),
        user=UserPublic(id=user_id, email=doc["email"]),
    )