from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models import Notification, Report, Task, User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/{role}")
def role_dashboard(role: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
  tasks = db.query(Task).all() if current_user.role != "student" else db.query(Task).filter(Task.assigned_to == current_user.id).all()
  reports = db.query(Report).all() if current_user.role != "student" else db.query(Report).filter(Report.student_id == current_user.id).all()
  users = db.query(User).all()
  unread_notifications = (
    db.query(Notification).filter(Notification.is_read.is_(False)).count()
    if current_user.role == "admin"
    else db.query(Notification).filter(
      Notification.user_id == current_user.id,
      Notification.is_read.is_(False),
    ).count()
  )

  done = len([task for task in tasks if task.status == "Done"])
  completion = round((done / max(len(tasks), 1)) * 100)

  if role == "admin":
    return {
      "stats": [
        {"label": "Total Users", "value": str(len(users)), "variant": "green"},
        {"label": "Active Tasks", "value": str(len(tasks))},
        {"label": "Reports", "value": str(len(reports)), "variant": "orange"},
        {"label": "Completion", "value": f"{completion}%"},
      ],
      "unread_notifications": unread_notifications,
      "tasks": tasks,
      "reports": reports,
    }

  if role == "mentor":
    students = [user for user in users if user.role == "student"]
    return {
      "stats": [
        {"label": "Total Students", "value": str(len(students)), "variant": "blue"},
        {"label": "Pending Review", "value": str(len([r for r in reports if r.status == "Submitted"])), "variant": "red"},
        {"label": "Active Tasks", "value": str(len(tasks)), "variant": "orange"},
        {"label": "Completion", "value": f"{completion}%", "variant": "purple"},
      ],
      "unread_notifications": unread_notifications,
      "students": students,
      "tasks": tasks,
      "reports": reports,
    }

  return {
    "stats": [
      {"label": "Task Completion", "value": f"{completion}%", "note": "Synced from Kanban"},
      {"label": "Active Tasks", "value": str(len(tasks)), "note": "Assigned to you"},
      {"label": "Reports", "value": str(len(reports)), "note": "Submitted reports"},
    ],
    "unread_notifications": unread_notifications,
    "tasks": tasks,
    "reports": reports,
  }
