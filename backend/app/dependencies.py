from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import User
from .security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
  try:
    payload = decode_access_token(token)
  except ValueError as exc:
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Invalid or expired token",
    ) from exc

  user_id = payload.get("sub")
  user = db.get(User, int(user_id)) if user_id else None

  if not user:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

  return user


def require_roles(*roles: str):
  def checker(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in roles:
      raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return current_user

  return checker
