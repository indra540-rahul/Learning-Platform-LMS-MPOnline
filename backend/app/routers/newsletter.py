from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ActivityLog, NewsletterSubscriber, User
from ..schemas import MessageResponse, NewsletterSubscribeCreate

router = APIRouter(prefix="/newsletter", tags=["Newsletter"])


@router.post("/subscribe", response_model=MessageResponse)
def subscribe_to_newsletter(payload: NewsletterSubscribeCreate, db: Session = Depends(get_db)):
  normalized_email = payload.email.strip().lower()
  existing = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.email == normalized_email).first()

  if existing:
    if not existing.is_active:
      existing.is_active = True
      db.add(ActivityLog(action=f"Reactivated newsletter subscription: {normalized_email}"))
      db.commit()
    return {"message": "This email is already subscribed to the newsletter."}

  subscriber = NewsletterSubscriber(email=normalized_email)
  db.add(subscriber)

  admin = db.query(User).filter(User.role == "admin").order_by(User.id.asc()).first()
  db.add(ActivityLog(user_id=admin.id if admin else None, action=f"New newsletter subscription: {normalized_email}"))

  db.commit()
  return {"message": "You have been subscribed to the newsletter successfully."}
