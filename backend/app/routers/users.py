from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user, require_roles
from ..models import User
from ..schemas import UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=list[UserOut])
def list_users(
  db: Session = Depends(get_db),
  _: User = Depends(require_roles("admin", "mentor")),
):
  return db.query(User).order_by(User.created_at.desc()).all()


@router.get("/{user_id}", response_model=UserOut)
def get_user(
  user_id: int,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_user),
):
  if current_user.role == "student" and current_user.id != user_id:
    raise HTTPException(status_code=403, detail="Students can only view their own profile")

  user = db.get(User, user_id)
  if not user:
    raise HTTPException(status_code=404, detail="User not found")
  return user


@router.patch("/me", response_model=UserOut)
def update_profile(
  payload: UserUpdate,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_user),
):
  for key, value in payload.model_dump(exclude_unset=True).items():
    setattr(current_user, key, value)
  db.commit()
  db.refresh(current_user)
  return current_user
