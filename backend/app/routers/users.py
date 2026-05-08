from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..dependencies import get_current_user, require_roles
from ..models import (
  ActivityLog,
  CourseEnrollment,
  MentorFeedback,
  MentorRequest,
  Notification,
  PaymentOrder,
  Report,
  Task,
  User,
)
from ..schemas import UserAdminUpdate, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])


def serialize_user(user: User) -> UserOut:
  return UserOut.model_validate(
    {
      **user.__dict__,
      "assigned_mentor_name": user.assigned_mentor.name if user.assigned_mentor else None,
      "assigned_mentor_email": user.assigned_mentor.email if user.assigned_mentor else None,
      "assigned_mentor_speciality": user.assigned_mentor.mentor_speciality if user.assigned_mentor else None,
    }
  )


@router.get("", response_model=list[UserOut])
def list_users(
  db: Session = Depends(get_db),
  current_user: User = Depends(require_roles("admin", "mentor")),
):
  query = db.query(User)
  if current_user.role == "mentor":
    query = query.filter(User.role == "student", User.assigned_mentor_id == current_user.id)
  return [serialize_user(user) for user in query.order_by(User.created_at.desc()).all()]


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
  return serialize_user(user)


@router.patch("/me", response_model=UserOut)
def update_profile(
  payload: UserUpdate,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_user),
):
  for key, value in payload.model_dump(exclude_unset=True).items():
    if key == "email" and value != current_user.email:
      existing = db.query(User).filter(User.email == value, User.id != current_user.id).first()
      if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    setattr(current_user, key, value)
  db.commit()
  db.refresh(current_user)
  return serialize_user(current_user)


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
  user_id: int,
  payload: UserAdminUpdate,
  db: Session = Depends(get_db),
  current_user: User = Depends(require_roles("admin")),
):
  user = db.get(User, user_id)
  if not user:
    raise HTTPException(status_code=404, detail="User not found")
  if current_user.id == user.id and payload.role and payload.role != current_user.role:
    raise HTTPException(status_code=400, detail="Admin cannot change their own role")

  allowed_roles = {"admin", "mentor", "student"}
  if payload.role and payload.role not in allowed_roles:
    raise HTTPException(status_code=400, detail="Invalid role")

  if payload.email and payload.email != user.email:
    existing = db.query(User).filter(User.email == payload.email, User.id != user.id).first()
    if existing:
      raise HTTPException(status_code=400, detail="Email already registered")

  if payload.assigned_mentor_id is not None:
    if payload.assigned_mentor_id == user.id:
      raise HTTPException(status_code=400, detail="User cannot be assigned as their own mentor")
    mentor = db.get(User, payload.assigned_mentor_id)
    if not mentor or mentor.role != "mentor":
      raise HTTPException(status_code=400, detail="Assigned mentor is invalid")

  for key, value in payload.model_dump(exclude_unset=True).items():
    setattr(user, key, value)
  db.commit()
  db.refresh(user)
  return serialize_user(user)


@router.delete("/{user_id}")
def delete_user(
  user_id: int,
  db: Session = Depends(get_db),
  current_user: User = Depends(require_roles("admin")),
):
  user = db.get(User, user_id)
  if not user:
    raise HTTPException(status_code=404, detail="User not found")
  if current_user.id == user.id:
    raise HTTPException(status_code=400, detail="Admin cannot delete their own account from this page")
  if user.role != "student":
    raise HTTPException(status_code=400, detail="Only student accounts can be removed from the Users page")

  if user.assigned_mentor_id:
    db.add(
      Notification(
        user_id=user.assigned_mentor_id,
        message=f"{current_user.name} removed student account {user.name}",
      )
    )

  admin_ids = [admin.id for admin in db.query(User).filter(User.role == "admin", User.id != current_user.id).all()]
  if admin_ids:
    db.add_all([
      Notification(
        user_id=admin_id,
        message=f"{current_user.name} removed student account {user.name}",
      )
      for admin_id in admin_ids
    ])

  for report in db.query(Report).filter(Report.student_id == user.id).all():
    if report.file_path:
      file_path = Path(report.file_path)
      upload_root = Path(settings.UPLOAD_DIR).resolve()
      try:
        resolved = file_path.resolve()
      except OSError:
        resolved = None
      if resolved and upload_root in resolved.parents and resolved.exists():
        resolved.unlink()
    db.delete(report)

  db.query(Task).filter(Task.assigned_to == user.id).delete(synchronize_session=False)
  db.query(Task).filter(Task.created_by == user.id).update({Task.created_by: None}, synchronize_session=False)
  db.query(Notification).filter(Notification.user_id == user.id).delete(synchronize_session=False)
  db.query(MentorRequest).filter(MentorRequest.user_id == user.id).delete(synchronize_session=False)
  db.query(MentorFeedback).filter(MentorFeedback.student_id == user.id).delete(synchronize_session=False)
  db.query(CourseEnrollment).filter(CourseEnrollment.user_id == user.id).delete(synchronize_session=False)
  db.query(PaymentOrder).filter(PaymentOrder.user_id == user.id).delete(synchronize_session=False)
  db.query(ActivityLog).filter(ActivityLog.user_id == user.id).update({ActivityLog.user_id: None}, synchronize_session=False)

  db.add(ActivityLog(user_id=current_user.id, action=f"Deleted student account {user.email}"))
  db.delete(user)
  db.commit()
  return {"deleted": True}
