import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt
from passlib.context import CryptContext

# Configuration
SECRET_KEY = "SECRET_KEY_FOR_FOOD_SERVICE_FROM_SEHGALS"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

# Using bcrypt for secure hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def _pre_hash(password: str) -> str:
    """
    Standardize password length to bypass bcrypt's 72-byte limit.
    This turns any password into a fixed 64-character hex string.
    """
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def hash_password(password: str) -> str:
    """Returns a hashed version of the pre-hashed password."""
    return pwd_context.hash(_pre_hash(password))

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies the plain password against the stored hash using pre-hashing."""
    return pwd_context.verify(_pre_hash(plain_password), hashed_password)

def create_access_token(data: dict) -> str:
    """Generates a JWT token with an expiration timestamp."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
