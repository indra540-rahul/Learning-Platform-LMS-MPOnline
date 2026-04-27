from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import require_roles
from ..models import Notification, Report, Task, User
from ..schemas import AnalyticsOverview, PerformancePoint

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview", response_model=AnalyticsOverview)
def overview(
  db: Session = Depends(get_db),
  _: User = Depends(require_roles("admin", "mentor", "student")),
):
  return AnalyticsOverview(
    total_users=db.query(User).count(),
    total_students=db.query(User).filter(User.role == "student").count(),
    total_mentors=db.query(User).filter(User.role == "mentor").count(),
    total_tasks=db.query(Task).count(),
    done_tasks=db.query(Task).filter(Task.status == "Done").count(),
    submitted_reports=db.query(Report).count(),
    unread_notifications=db.query(Notification).filter(Notification.is_read.is_(False)).count(),
  )


@router.get("/performance", response_model=list[PerformancePoint])
def performance(
  db: Session = Depends(get_db),
  _: User = Depends(require_roles("admin", "mentor", "student")),
):
  status_counts = dict(db.query(Task.status, func.count(Task.id)).group_by(Task.status).all())
  return [
    PerformancePoint(label="Week 1", progress=35, department="Frontend", performance=72),
    PerformancePoint(label="Week 2", progress=48, department="Backend", performance=81),
    PerformancePoint(label="Week 3", progress=68, department="Database", performance=76),
    PerformancePoint(label="Week 4", progress=min(95, 70 + status_counts.get("Done", 0) * 5), department="AI Planner", performance=88),
  ]
