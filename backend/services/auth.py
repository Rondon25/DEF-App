import os
import random
import string
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

SECRET_KEY = os.environ.get("JWT_SECRET", "def-mobile-jwt-secret")
ALGORITHM  = "HS256"
EXPIRE_MIN = int(os.environ.get("JWT_EXPIRE_MINUTES", 10080))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=EXPIRE_MIN)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


def otp_expiry(minutes: int = 10) -> datetime:
    return datetime.utcnow() + timedelta(minutes=minutes)


def is_otp_valid(submitted: str, stored: str | None, expires_at: datetime | None) -> bool:
    if not stored or not expires_at:
        return False
    from datetime import timezone
    now = datetime.now(timezone.utc)
    # Handle both aware and naive datetimes
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if now > expires_at:
        return False
    return submitted == stored
