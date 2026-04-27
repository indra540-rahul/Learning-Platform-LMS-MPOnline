from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models import Notification, User
from ..schemas import NotificationOut

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationOut])
def list_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
  query = db.query(Notification)
  if current_user.role != "admin":
    query = query.filter(Notification.user_id == current_user.id)
  return query.order_by(Notification.created_at.desc()).all()


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_read(
  notification_id: int,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_user),
):
  notification = db.get(Notification, notification_id)
  if not notification:
    raise HTTPException(status_code=404, detail="Notification not found")
  if current_user.role != "admin" and notification.user_id != current_user.id:
    raise HTTPException(status_code=403, detail="Cannot update this notification")

  notification.is_read = True
  db.commit()
  db.refresh(notification)
  return notification
