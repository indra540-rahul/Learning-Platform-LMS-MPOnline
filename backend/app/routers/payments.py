import hashlib
import hmac
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..config import settings
from ..course_catalog import COURSE_INDEX
from ..database import get_db
from ..dependencies import get_current_user
from ..models import CourseEnrollment, PaymentOrder, User
from ..schemas import (
  CourseEnrollmentOut,
  PaymentOrderCreate,
  PaymentVerifyRequest,
  PaymentVerifyResponse,
  RazorpayOrderResponse,
)

router = APIRouter(prefix="/payments", tags=["Payments"])

PROMO_CODES = {
  "LUMINA10": 0.10,
}


def require_student(current_user: User) -> User:
  if current_user.role != "student":
    raise HTTPException(status_code=403, detail="Course purchase is available for student accounts only")
  return current_user


def require_razorpay_config():
  if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
    raise HTTPException(status_code=503, detail="Razorpay is not configured on the server")


def calculate_order_amounts(course_ids: list[str], promo_code: str | None):
  unique_ids = list(dict.fromkeys(course_ids))
  if not unique_ids:
    raise HTTPException(status_code=400, detail="Please add at least one course to continue")

  missing_ids = [course_id for course_id in unique_ids if course_id not in COURSE_INDEX]
  if missing_ids:
    raise HTTPException(status_code=400, detail=f"Unknown course ids: {', '.join(missing_ids)}")

  subtotal_rupees = sum(int(COURSE_INDEX[course_id]["price"]) for course_id in unique_ids)
  discount_rate = PROMO_CODES.get((promo_code or "").strip().upper(), 0)
  discount_rupees = round(subtotal_rupees * discount_rate)
  taxable_rupees = max(0, subtotal_rupees - discount_rupees)
  tax_rupees = round(taxable_rupees * 0.18)

  return {
    "course_ids": unique_ids,
    "subtotal_paise": subtotal_rupees * 100,
    "discount_paise": discount_rupees * 100,
    "tax_paise": tax_rupees * 100,
    "total_paise": (taxable_rupees + tax_rupees) * 100,
  }


@router.get("/enrollments", response_model=list[CourseEnrollmentOut])
def my_enrollments(
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_user),
):
  require_student(current_user)
  return (
    db.query(CourseEnrollment)
    .filter(CourseEnrollment.user_id == current_user.id)
    .order_by(CourseEnrollment.purchased_at.desc())
    .all()
  )


@router.post("/razorpay/order", response_model=RazorpayOrderResponse)
async def create_razorpay_order(
  payload: PaymentOrderCreate,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_user),
):
  require_student(current_user)
  require_razorpay_config()

  amounts = calculate_order_amounts(payload.course_ids, payload.promo_code)
  existing_ids = {
    entry.course_id
    for entry in db.query(CourseEnrollment).filter(CourseEnrollment.user_id == current_user.id).all()
  }
  duplicate_ids = [course_id for course_id in amounts["course_ids"] if course_id in existing_ids]
  if duplicate_ids:
    raise HTTPException(
      status_code=400,
      detail=f"You already own: {', '.join(duplicate_ids)}",
    )
  course_titles = [COURSE_INDEX[course_id]["title"] for course_id in amounts["course_ids"]]
  description = f"{len(course_titles)} course purchase"

  async with httpx.AsyncClient(timeout=20) as client:
    response = await client.post(
      "https://api.razorpay.com/v1/orders",
      auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
      json={
        "amount": amounts["total_paise"],
        "currency": "INR",
        "receipt": f"user-{current_user.id}-{int(datetime.utcnow().timestamp())}",
        "notes": {
          "user_id": str(current_user.id),
          "course_ids": ",".join(amounts["course_ids"]),
        },
      },
      headers={"Content-Type": "application/json"},
    )

  if response.status_code >= 400:
    raise HTTPException(status_code=502, detail="Unable to create Razorpay order")

  order_data = response.json()
  payment_order = PaymentOrder(
    user_id=current_user.id,
    provider="razorpay",
    provider_order_id=order_data["id"],
    course_ids=",".join(amounts["course_ids"]),
    subtotal_amount=amounts["subtotal_paise"],
    discount_amount=amounts["discount_paise"],
    tax_amount=amounts["tax_paise"],
    total_amount=amounts["total_paise"],
    currency=order_data.get("currency", "INR"),
    promo_code=(payload.promo_code or "").strip().upper() or None,
    status="created",
  )
  db.add(payment_order)
  db.commit()

  return RazorpayOrderResponse(
    key_id=settings.RAZORPAY_KEY_ID,
    order_id=order_data["id"],
    amount=order_data["amount"],
    currency=order_data.get("currency", "INR"),
    name="Lumina Learning Platform",
    description=description,
    prefill_name=current_user.name,
    prefill_email=current_user.email,
  )


@router.post("/razorpay/verify", response_model=PaymentVerifyResponse)
def verify_razorpay_payment(
  payload: PaymentVerifyRequest,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_user),
):
  require_student(current_user)
  require_razorpay_config()

  payment_order = (
    db.query(PaymentOrder)
    .filter(
      PaymentOrder.provider_order_id == payload.razorpay_order_id,
      PaymentOrder.user_id == current_user.id,
    )
    .first()
  )
  if not payment_order:
    raise HTTPException(status_code=404, detail="Payment order not found")
  if payment_order.status == "paid" and payment_order.provider_payment_id and payment_order.provider_payment_id != payload.razorpay_payment_id:
    raise HTTPException(status_code=409, detail="This Razorpay order has already been verified")

  expected_signature = hmac.new(
    settings.RAZORPAY_KEY_SECRET.encode(),
    f"{payment_order.provider_order_id}|{payload.razorpay_payment_id}".encode(),
    hashlib.sha256,
  ).hexdigest()
  if not hmac.compare_digest(expected_signature, payload.razorpay_signature):
    raise HTTPException(status_code=400, detail="Payment signature verification failed")

  payment_order.provider_payment_id = payload.razorpay_payment_id
  payment_order.provider_signature = payload.razorpay_signature
  payment_order.status = "paid"
  payment_order.paid_at = datetime.utcnow()

  enrolled_ids = []
  existing_ids = {
    entry.course_id
    for entry in db.query(CourseEnrollment).filter(CourseEnrollment.user_id == current_user.id).all()
  }
  for course_id in filter(None, payment_order.course_ids.split(",")):
    enrolled_ids.append(course_id)
    if course_id in existing_ids:
      continue
    db.add(
      CourseEnrollment(
        user_id=current_user.id,
        course_id=course_id,
        payment_order_id=payment_order.id,
        razorpay_payment_id=payload.razorpay_payment_id,
      )
    )

  db.commit()

  return PaymentVerifyResponse(
    message="Payment successful. Your courses are now available in My Courses.",
    enrolled_course_ids=enrolled_ids,
  )
