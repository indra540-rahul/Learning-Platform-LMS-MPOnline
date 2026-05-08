from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user, require_roles
from ..models import ActivityLog, MentorFeedback, MentorRequest, Notification, Task, User
from ..schemas import MentorAssignmentCreate, MentorCreate, MentorFeedbackCreate, MentorFeedbackOut, MentorRequestCreate, MentorRequestOut, MessageResponse, UserOut
from ..security import hash_password

router = APIRouter(prefix="/mentors", tags=["Mentors"])


def serialize_user(user: User) -> UserOut:
  return UserOut.model_validate(
    {
      **user.__dict__,
      "assigned_mentor_name": user.assigned_mentor.name if user.assigned_mentor else None,
      "assigned_mentor_email": user.assigned_mentor.email if user.assigned_mentor else None,
      "assigned_mentor_speciality": user.assigned_mentor.mentor_speciality if user.assigned_mentor else None,
    }
  )


def serialize_request(request: MentorRequest) -> MentorRequestOut:
  return MentorRequestOut.model_validate(
    {
      **request.__dict__,
      "user_name": request.user.name,
      "user_email": request.user.email,
      "assigned_mentor_name": request.mentor.name if request.mentor else None,
      "assigned_mentor_email": request.mentor.email if request.mentor else None,
      "assigned_mentor_speciality": request.mentor.mentor_speciality if request.mentor else None,
    }
  )


def serialize_feedback(feedback: MentorFeedback) -> MentorFeedbackOut:
  return MentorFeedbackOut.model_validate(
    {
      **feedback.__dict__,
      "student_name": feedback.student.name,
      "mentor_name": feedback.mentor.name,
    }
  )


@router.get("", response_model=list[UserOut])
def list_mentors(
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_user),
):
  query = db.query(User)
  if current_user.role == "admin":
    query = query.filter(User.role.in_(["mentor", "admin"]))
  else:
    query = query.filter(User.role == "mentor")
  return [serialize_user(member) for member in query.order_by(User.created_at.desc()).all()]


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_mentor(
  payload: MentorCreate,
  db: Session = Depends(get_db),
  current_user: User = Depends(require_roles("admin")),
):
  existing = db.query(User).filter(User.email == payload.email).first()
  if existing:
    raise HTTPException(status_code=400, detail="Email already registered")
  if payload.role not in {"mentor", "admin"}:
    raise HTTPException(status_code=400, detail="Role must be mentor or admin")

  mentor = User(
    name=payload.name,
    email=payload.email,
    password=hash_password(payload.password),
    role=payload.role,
    mentor_speciality=payload.mentor_speciality or ("Platform operations" if payload.role == "admin" else None),
    bio=payload.bio,
  )
  db.add(mentor)
  db.flush()
  db.add(ActivityLog(user_id=current_user.id, action=f"Added {mentor.role} {mentor.name}"))
  db.commit()
  db.refresh(mentor)
  return serialize_user(mentor)


@router.get("/requests", response_model=list[MentorRequestOut])
def list_mentor_requests(
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_user),
):
  query = db.query(MentorRequest)
  if current_user.role == "student":
    query = query.filter(MentorRequest.user_id == current_user.id)
  elif current_user.role == "mentor":
    query = query.filter(MentorRequest.assigned_mentor_id == current_user.id)
  requests = query.order_by(MentorRequest.created_at.desc()).all()
  return [serialize_request(item) for item in requests]


@router.get("/feedback", response_model=list[MentorFeedbackOut])
def list_mentor_feedback(
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_user),
):
  query = db.query(MentorFeedback)
  if current_user.role == "student":
    query = query.filter(MentorFeedback.student_id == current_user.id)
  elif current_user.role == "mentor":
    query = query.filter(MentorFeedback.mentor_id == current_user.id)
  feedback_rows = query.order_by(MentorFeedback.created_at.desc()).all()
  return [serialize_feedback(item) for item in feedback_rows]


@router.post("/requests", response_model=MentorRequestOut, status_code=status.HTTP_201_CREATED)
def create_mentor_request(
  payload: MentorRequestCreate,
  db: Session = Depends(get_db),
  current_user: User = Depends(require_roles("student")),
):
  mentor_request = MentorRequest(
    user_id=current_user.id,
    requested_domain=payload.requested_domain,
    message=payload.message,
    status="Pending",
  )
  db.add(mentor_request)

  admins = db.query(User).filter(User.role == "admin").all()
  for admin in admins:
    db.add(Notification(user_id=admin.id, message=f"{current_user.name} requested a mentor for {payload.requested_domain}"))
  db.add(ActivityLog(user_id=current_user.id, action=f"Requested mentor for {payload.requested_domain}"))
  db.commit()
  db.refresh(mentor_request)
  return serialize_request(mentor_request)


@router.post("/feedback", response_model=MentorFeedbackOut, status_code=status.HTTP_201_CREATED)
def create_mentor_feedback(
  payload: MentorFeedbackCreate,
  db: Session = Depends(get_db),
  current_user: User = Depends(require_roles("student")),
):
  if not current_user.assigned_mentor_id:
    raise HTTPException(status_code=400, detail="No mentor is assigned yet")
  if payload.rating < 1 or payload.rating > 5:
    raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

  mentor = db.get(User, current_user.assigned_mentor_id)
  if not mentor or mentor.role != "mentor":
    raise HTTPException(status_code=400, detail="Assigned mentor is invalid")

  feedback = MentorFeedback(
    student_id=current_user.id,
    mentor_id=mentor.id,
    rating=payload.rating,
    message=payload.message.strip(),
  )
  db.add(feedback)
  db.add(Notification(user_id=mentor.id, message=f"{current_user.name} shared mentor feedback"))
  admins = db.query(User).filter(User.role == "admin").all()
  for admin in admins:
    db.add(Notification(user_id=admin.id, message=f"New mentor feedback from {current_user.name}"))
  db.add(ActivityLog(user_id=current_user.id, action=f"Submitted mentor feedback for {mentor.name}"))
  db.commit()
  db.refresh(feedback)
  return serialize_feedback(feedback)


@router.post("/requests/{request_id}/assign", response_model=MentorRequestOut)
def assign_mentor(
  request_id: int,
  payload: MentorAssignmentCreate,
  db: Session = Depends(get_db),
  current_user: User = Depends(require_roles("admin")),
):
  mentor_request = db.get(MentorRequest, request_id)
  if not mentor_request:
    raise HTTPException(status_code=404, detail="Mentor request not found")

  mentor = db.get(User, payload.mentor_id)
  if not mentor or mentor.role != "mentor":
    raise HTTPException(status_code=400, detail="Selected mentor is invalid")

  student = db.get(User, mentor_request.user_id)
  if not student:
    raise HTTPException(status_code=404, detail="Student not found")

  student.assigned_mentor_id = mentor.id
  mentor_request.assigned_mentor_id = mentor.id
  mentor_request.status = "Assigned"
  mentor_request.resolved_at = datetime.utcnow()

  db.add(Notification(user_id=student.id, message=f"{mentor.name} has been assigned as your mentor"))
  db.add(Notification(user_id=mentor.id, message=f"You have been assigned to mentor {student.name}"))
  db.add(ActivityLog(user_id=current_user.id, action=f"Assigned mentor {mentor.name} to {student.name}"))
  db.commit()
  db.refresh(mentor_request)
  return serialize_request(mentor_request)


@router.delete("/requests/{request_id}/assign", response_model=MentorRequestOut)
def unassign_mentor(
  request_id: int,
  db: Session = Depends(get_db),
  current_user: User = Depends(require_roles("admin")),
):
  mentor_request = db.get(MentorRequest, request_id)
  if not mentor_request:
    raise HTTPException(status_code=404, detail="Mentor request not found")
  if not mentor_request.assigned_mentor_id:
    raise HTTPException(status_code=400, detail="No mentor is assigned to this request")

  student = db.get(User, mentor_request.user_id)
  mentor = db.get(User, mentor_request.assigned_mentor_id)

  if student and student.assigned_mentor_id == mentor_request.assigned_mentor_id:
    student.assigned_mentor_id = None

  mentor_request.assigned_mentor_id = None
  mentor_request.status = "Pending"
  mentor_request.resolved_at = None

  if student:
    db.add(Notification(user_id=student.id, message="Your mentor assignment was cleared and is waiting for reassignment"))
  if mentor:
    db.add(Notification(user_id=mentor.id, message=f"Your mentor assignment for {student.name if student else 'a student'} was removed"))
  db.add(ActivityLog(user_id=current_user.id, action=f"Cleared mentor assignment for request #{mentor_request.id}"))
  db.commit()
  db.refresh(mentor_request)
  return serialize_request(mentor_request)


@router.get("/me/assigned", response_model=UserOut | MessageResponse)
def my_assigned_mentor(
  current_user: User = Depends(require_roles("student")),
):
  if not current_user.assigned_mentor:
    return {"message": "No mentor assigned yet"}
  return serialize_user(current_user.assigned_mentor)


@router.delete("/{user_id}", response_model=MessageResponse)
def delete_staff_member(
  user_id: int,
  db: Session = Depends(get_db),
  current_user: User = Depends(require_roles("admin")),
):
  staff_member = db.get(User, user_id)
  if not staff_member or staff_member.role not in {"mentor", "admin"}:
    raise HTTPException(status_code=404, detail="Staff member not found")
  if staff_member.id == current_user.id:
    raise HTTPException(status_code=400, detail="You cannot remove your own admin account")

  students = db.query(User).filter(User.assigned_mentor_id == staff_member.id).all()
  for student in students:
    student.assigned_mentor_id = None

  assigned_requests = db.query(MentorRequest).filter(MentorRequest.assigned_mentor_id == staff_member.id).all()
  for request in assigned_requests:
    request.assigned_mentor_id = None
    request.status = "Pending"
    request.resolved_at = None

  tasks = db.query(Task).filter((Task.created_by == staff_member.id) | (Task.assigned_to == staff_member.id)).all()
  for task in tasks:
    if task.created_by == staff_member.id:
      task.created_by = None
    if task.assigned_to == staff_member.id:
      task.assigned_to = None

  db.query(Notification).filter(Notification.user_id == staff_member.id).delete(synchronize_session=False)
  db.query(ActivityLog).filter(ActivityLog.user_id == staff_member.id).update({"user_id": None}, synchronize_session=False)

  db.delete(staff_member)
  db.add(ActivityLog(user_id=current_user.id, action=f"Removed {staff_member.role} {staff_member.name}"))
  db.commit()
  return {"message": "Staff member removed"}
