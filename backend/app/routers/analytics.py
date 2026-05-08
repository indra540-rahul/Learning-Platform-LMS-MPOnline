from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import require_roles
from ..models import Notification, Report, Task, User
from ..schemas import AnalyticsOverview, PerformancePoint

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview", response_model=AnalyticsOverview)
def overview(
  student_id: int | None = Query(default=None),
  db: Session = Depends(get_db),
  current_user: User = Depends(require_roles("admin", "mentor", "student")),
):
  if current_user.role == "admin":
    if student_id is not None:
      student = db.get(User, student_id)
      if not student or student.role != "student":
        raise HTTPException(status_code=404, detail="Student not found")
      student_tasks_query = db.query(Task).filter(Task.assigned_to == student_id)
      total_users = 1
      total_students = 1
      total_mentors = db.query(User).filter(User.role == "mentor").count()
      total_tasks = student_tasks_query.count()
      done_tasks = student_tasks_query.filter(Task.status == "Done").count()
      submitted_reports = db.query(Report).filter(Report.student_id == student_id).count()
      unread_notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read.is_(False),
      ).count()
    else:
      total_users = db.query(User).count()
      total_students = db.query(User).filter(User.role == "student").count()
      total_mentors = db.query(User).filter(User.role == "mentor").count()
      total_tasks = db.query(Task).count()
      done_tasks = db.query(Task).filter(Task.status == "Done").count()
      submitted_reports = db.query(Report).count()
      unread_notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read.is_(False),
      ).count()
  elif current_user.role == "mentor":
    assigned_students_query = db.query(User).filter(User.role == "student", User.assigned_mentor_id == current_user.id)
    assigned_students = assigned_students_query.all()
    assigned_student_ids = [student.id for student in assigned_students]
    if student_id is not None:
      if student_id not in assigned_student_ids:
        raise HTTPException(status_code=404, detail="Assigned student not found")
      mentor_tasks_query = db.query(Task).filter(Task.assigned_to == student_id)
      total_users = 1
      total_students = 1
      total_mentors = 1
      total_tasks = mentor_tasks_query.count()
      done_tasks = mentor_tasks_query.filter(Task.status == "Done").count()
      submitted_reports = db.query(Report).filter(Report.student_id == student_id).count()
    else:
      mentor_tasks_query = db.query(Task).filter(Task.assigned_to.in_(assigned_student_ids)) if assigned_student_ids else db.query(Task).filter(Task.id == -1)
      total_users = len(assigned_student_ids) + 1
      total_students = len(assigned_student_ids)
      total_mentors = 1
      total_tasks = mentor_tasks_query.count()
      done_tasks = mentor_tasks_query.filter(Task.status == "Done").count()
      submitted_reports = db.query(Report).filter(Report.student_id.in_(assigned_student_ids)).count() if assigned_student_ids else 0
    unread_notifications = db.query(Notification).filter(
      Notification.user_id == current_user.id,
      Notification.is_read.is_(False),
    ).count()
  else:
    student_tasks_query = db.query(Task).filter(Task.assigned_to == current_user.id)
    total_users = 1
    total_students = 1
    total_mentors = db.query(User).filter(User.role == "mentor").count()
    total_tasks = student_tasks_query.count()
    done_tasks = student_tasks_query.filter(Task.status == "Done").count()
    submitted_reports = db.query(Report).filter(Report.student_id == current_user.id).count()
    unread_notifications = db.query(Notification).filter(
      Notification.user_id == current_user.id,
      Notification.is_read.is_(False),
    ).count()

  return AnalyticsOverview(
    total_users=total_users,
    total_students=total_students,
    total_mentors=total_mentors,
    total_tasks=total_tasks,
    done_tasks=done_tasks,
    submitted_reports=submitted_reports,
    unread_notifications=unread_notifications,
  )


@router.get("/performance", response_model=list[PerformancePoint])
def performance(
  student_id: int | None = Query(default=None),
  db: Session = Depends(get_db),
  current_user: User = Depends(require_roles("admin", "mentor", "student")),
):
  task_query = db.query(Task)
  if current_user.role == "mentor":
    assigned_student_ids = [
      student.id
      for student in db.query(User).filter(User.role == "student", User.assigned_mentor_id == current_user.id).all()
    ]
    if student_id is not None:
      if student_id not in assigned_student_ids:
        raise HTTPException(status_code=404, detail="Assigned student not found")
      task_query = task_query.filter(Task.assigned_to == student_id)
    else:
      task_query = task_query.filter(Task.assigned_to.in_(assigned_student_ids)) if assigned_student_ids else task_query.filter(Task.id == -1)
  elif current_user.role == "student":
    task_query = task_query.filter(Task.assigned_to == current_user.id)

  task_rows = task_query.order_by(Task.updated_at.asc()).all()
  if not task_rows:
    return [PerformancePoint(label="This Week", progress=0, department="General", performance=0)]

  grouped: dict[str, list[Task]] = defaultdict(list)
  for task in task_rows:
    topic = ((task.tags or "").split(",")[0] or "General").strip()
    grouped[topic].append(task)

  points = []
  for label, items in grouped.items():
    average_progress = round(sum(task.progress for task in items) / max(1, len(items)))
    done_count = sum(1 for task in items if task.status == "Done")
    performance_value = round((done_count / max(1, len(items))) * 100)
    latest_date = max(task.updated_at or task.created_at or datetime.utcnow() for task in items)
    points.append(
      (
        latest_date,
        PerformancePoint(
          label=latest_date.strftime("%b %d"),
          progress=average_progress,
          department=label,
          performance=performance_value,
        ),
      )
    )

  return [point for _, point in sorted(points, key=lambda item: item[0])[-6:]]
