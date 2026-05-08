from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models import Notification, User
from ..schemas import MessageResponse, NotificationOut

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def is_relevant_for_mentor(notification: Notification, assigned_student_names: set[str]) -> bool:
  message = notification.message or ""

  if message.startswith("Planner reminder:"):
    return False

  if message.endswith(" submitted a report"):
    student_name = message[: -len(" submitted a report")].strip()
    return student_name in assigned_student_names

  if ' updated "' in message:
    student_name = message.split(' updated "', 1)[0].strip()
    return student_name in assigned_student_names

  if message.startswith("You have been assigned to mentor "):
    student_name = message.removeprefix("You have been assigned to mentor ").strip()
    return student_name in assigned_student_names

  if message.startswith("Your mentor assignment for ") and message.endswith(" was removed"):
    return False

  if message.endswith(" shared mentor feedback"):
    student_name = message[: -len(" shared mentor feedback")].strip()
    return student_name in assigned_student_names

  return True


@router.get("", response_model=list[NotificationOut])
def list_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
  notifications = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).all()
  if current_user.role != "mentor":
    return notifications

  assigned_student_names = {
    student.name
    for student in db.query(User).filter(User.role == "student", User.assigned_mentor_id == current_user.id).all()
  }
  return [
    notification
    for notification in notifications
    if is_relevant_for_mentor(notification, assigned_student_names)
  ]


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_read(
  notification_id: int,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_user),
):
  notification = db.get(Notification, notification_id)
  if not notification:
    raise HTTPException(status_code=404, detail="Notification not found")
  if notification.user_id != current_user.id:
    raise HTTPException(status_code=403, detail="Cannot update this notification")

  notification.is_read = True
  db.commit()
  db.refresh(notification)
  return notification


@router.delete("/{notification_id}", response_model=MessageResponse)
def delete_notification(
  notification_id: int,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_user),
):
  notification = db.get(Notification, notification_id)
  if not notification:
    raise HTTPException(status_code=404, detail="Notification not found")
  if notification.user_id != current_user.id:
    raise HTTPException(status_code=403, detail="Cannot delete this notification")

  db.delete(notification)
  db.commit()
  return {"message": "Notification cleared"}
