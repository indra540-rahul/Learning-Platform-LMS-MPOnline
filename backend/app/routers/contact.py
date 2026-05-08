from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import require_roles
from ..mailer import is_mail_configured, send_email
from ..models import ActivityLog, ContactMessage, User
from ..schemas import ContactMessageCreate, ContactMessageOut, ContactReplyCreate, MessageResponse, SupportFaqOut

router = APIRouter(prefix="/contact", tags=["Contact"])

COMMUNITY_FAQ = [
  {
    "id": "forum-setup",
    "question": "How do I get help from the Lumina learning community?",
    "answer": "Send your question through this support flow and mention the topic, course, or blocker. Our team will guide you to the right discussion thread or community channel.",
    "category": "Community Access",
  },
  {
    "id": "forum-best-practices",
    "question": "What should I include when asking for community help?",
    "answer": "Share your goal, what you already tried, the exact issue, and any screenshots or error text. Clear context helps mentors and peers respond faster.",
    "category": "Posting Tips",
  },
  {
    "id": "forum-response-time",
    "question": "When should I use the community flow instead of direct support?",
    "answer": "Use community support for discussion-based questions, peer learning, study strategies, and shared experiences. Use the contact form for account, billing, or platform issues.",
    "category": "Routing",
  },
]


@router.get("", response_model=list[ContactMessageOut])
def list_contact_messages(
  db: Session = Depends(get_db),
  current_user: User = Depends(require_roles("admin")),
):
  return db.query(ContactMessage).order_by(ContactMessage.created_at.desc()).all()


@router.get("/community-faq", response_model=list[SupportFaqOut])
def get_community_faq():
  return COMMUNITY_FAQ


@router.post("", response_model=MessageResponse)
def submit_contact_message(payload: ContactMessageCreate, db: Session = Depends(get_db)):
  message = ContactMessage(
    full_name=payload.full_name.strip(),
    email=payload.email.strip().lower(),
    subject=payload.subject.strip(),
    message=payload.message.strip(),
  )
  db.add(message)
  db.flush()

  admins = db.query(User).filter(User.role == "admin").all()

  db.add(ActivityLog(user_id=admins[0].id if admins else None, action=f"Received contact inquiry: {payload.subject}"))

  if admins and is_mail_configured():
    for admin in admins:
      send_email(
        admin.email,
        f"New contact inquiry: {payload.subject}",
        (
          f"Name: {payload.full_name}\n"
          f"Email: {payload.email}\n"
          f"Subject: {payload.subject}\n\n"
          f"Message:\n{payload.message}"
        ),
      )

  db.commit()
  return {"message": "Your message has been sent successfully."}


@router.post("/{message_id}/reply", response_model=ContactMessageOut)
def reply_to_contact_message(
  message_id: int,
  payload: ContactReplyCreate,
  db: Session = Depends(get_db),
  current_user: User = Depends(require_roles("admin")),
):
  contact_message = db.get(ContactMessage, message_id)
  if not contact_message:
    raise HTTPException(status_code=404, detail="Contact inquiry not found")

  reply_text = payload.reply.strip()
  if not reply_text:
    raise HTTPException(status_code=400, detail="Reply message is required")

  contact_message.admin_reply = reply_text
  contact_message.replied_at = datetime.utcnow()

  send_email(
    contact_message.email,
    f"Reply to your inquiry: {contact_message.subject}",
    (
      f"Hi {contact_message.full_name},\n\n"
      f"Regarding your inquiry about \"{contact_message.subject}\", our admin replied:\n\n"
      f"{reply_text}\n\n"
      f"Original message:\n{contact_message.message}\n\n"
      f"Regards,\nLumina LMS Admin Team"
    ),
  )

  db.add(ActivityLog(user_id=current_user.id, action=f"Replied to contact inquiry #{contact_message.id}"))
  db.commit()
  db.refresh(contact_message)
  return contact_message
