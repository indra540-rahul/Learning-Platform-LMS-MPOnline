from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..dependencies import get_current_user, require_roles
from ..models import ActivityLog, Notification, Report, User
from ..schemas import FeedbackCreate, ReportCreate, ReportOut

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("", response_model=list[ReportOut])
def list_reports(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
  query = db.query(Report)
  if current_user.role == "student":
    query = query.filter(Report.student_id == current_user.id)
  elif current_user.role == "mentor":
    assigned_student_ids = [
      student.id
      for student in db.query(User).filter(User.role == "student", User.assigned_mentor_id == current_user.id).all()
    ]
    query = query.filter(Report.student_id.in_(assigned_student_ids)) if assigned_student_ids else query.filter(Report.id == -1)
  return query.order_by(Report.submitted_at.desc()).all()


@router.post("", response_model=ReportOut)
def submit_report(payload: ReportCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
  report = Report(student_id=current_user.id, content=payload.content, status="Submitted")
  db.add(report)
  db.flush()

  recipients: set[int] = set()
  if current_user.assigned_mentor_id:
    recipients.add(current_user.assigned_mentor_id)
  recipients.update(user.id for user in db.query(User).filter(User.role == "admin").all())
  db.add_all([Notification(user_id=user_id, message=f"{current_user.name} submitted a report") for user_id in recipients])
  db.add(ActivityLog(user_id=current_user.id, action="Submitted markdown report"))
  db.commit()
  db.refresh(report)
  return report


@router.post("/{report_id}/feedback", response_model=ReportOut)
def add_feedback(
  report_id: int,
  payload: FeedbackCreate,
  db: Session = Depends(get_db),
  current_user: User = Depends(require_roles("admin", "mentor")),
):
  report = db.get(Report, report_id)
  if not report:
    raise HTTPException(status_code=404, detail="Report not found")
  if current_user.role == "mentor":
    student = db.get(User, report.student_id)
    if not student or student.assigned_mentor_id != current_user.id:
      raise HTTPException(status_code=403, detail="Cannot review reports outside your assigned students")

  report.feedback = payload.feedback
  report.status = "Reviewed"
  report.reviewed_at = datetime.utcnow()
  db.add(Notification(user_id=report.student_id, message="Your report has new mentor feedback"))
  db.add(ActivityLog(user_id=current_user.id, action=f"Reviewed report {report.id}"))
  db.commit()
  db.refresh(report)
  return report


@router.post("/{report_id}/upload", response_model=ReportOut)
def upload_report_file(
  report_id: int,
  file: UploadFile = File(...),
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_user),
):
  report = db.get(Report, report_id)
  if not report:
    raise HTTPException(status_code=404, detail="Report not found")
  if current_user.role == "student" and report.student_id != current_user.id:
    raise HTTPException(status_code=403, detail="Cannot upload to another student's report")

  upload_dir = Path(settings.UPLOAD_DIR)
  upload_dir.mkdir(parents=True, exist_ok=True)
  safe_name = f"report_{report_id}_{file.filename}".replace(" ", "_")
  file_path = upload_dir / safe_name
  file_path.write_bytes(file.file.read())

  report.file_path = str(file_path)
  db.add(ActivityLog(user_id=current_user.id, action=f"Uploaded file for report {report.id}"))
  db.commit()
  db.refresh(report)
  return report


@router.delete("/{report_id}")
def delete_report(
  report_id: int,
  db: Session = Depends(get_db),
  current_user: User = Depends(require_roles("student")),
):
  report = db.get(Report, report_id)
  if not report:
    raise HTTPException(status_code=404, detail="Report not found")
  if report.student_id != current_user.id:
    raise HTTPException(status_code=403, detail="Cannot delete another student's report")

  recipients: set[int] = set()
  if current_user.assigned_mentor_id:
    recipients.add(current_user.assigned_mentor_id)
  recipients.update(user.id for user in db.query(User).filter(User.role == "admin").all())

  if report.file_path:
    file_path = Path(report.file_path)
    if file_path.exists():
      file_path.unlink()

  db.add_all([Notification(user_id=user_id, message=f"{current_user.name} deleted report #{report.id}") for user_id in recipients])
  db.add(ActivityLog(user_id=current_user.id, action=f"Deleted report {report.id}"))
  db.delete(report)
  db.commit()
  return {"deleted": True}
