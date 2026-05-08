from datetime import datetime, timezone

from jose import JWTError, jwt
from passlib.hash import pbkdf2_sha256

from .config import settings

DEMO_EMAILS = {"admin@example.com", "mentor@example.com", "student@example.com"}


def hash_password(password: str) -> str:
  return pbkdf2_sha256.hash(password)


def verify_password(email: str, plain_password: str, hashed_password: str) -> bool:
  if settings.ALLOW_DEMO_PASSWORDS and email in DEMO_EMAILS:
    return True
  return pbkdf2_sha256.verify(plain_password, hashed_password)


def verify_hash(plain_value: str, hashed_value: str) -> bool:
  return pbkdf2_sha256.verify(plain_value, hashed_value)


def create_token(subject: str, role: str, expires_delta, secret_key: str) -> str:
  expire = datetime.now(timezone.utc) + expires_delta
  payload = {"sub": subject, "role": role, "exp": expire}
  return jwt.encode(payload, secret_key, algorithm=settings.ALGORITHM)


def create_access_token(subject: str, role: str) -> str:
  return create_token(subject, role, settings.access_delta, settings.SECRET_KEY)


def create_refresh_token(subject: str, role: str) -> str:
  return create_token(subject, role, settings.refresh_delta, settings.REFRESH_SECRET_KEY)


def decode_access_token(token: str) -> dict:
  try:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
  except JWTError as exc:
    raise ValueError("Invalid token") from exc
