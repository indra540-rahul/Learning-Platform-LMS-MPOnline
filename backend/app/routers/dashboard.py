from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user, require_roles
from ..models import ActivityLog, MentorRequest, Notification, Report, Task, User
from ..schemas import AdminOverview, AdminOverviewCard, AdminOverviewLog, AdminOverviewService, AdminOverviewTrafficPoint, AdminOverviewUser, UserOut

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def serialize_user(user: User) -> UserOut:
  return UserOut.model_validate(
    {
      **user.__dict__,
      "assigned_mentor_name": user.assigned_mentor.name if user.assigned_mentor else None,
      "assigned_mentor_email": user.assigned_mentor.email if user.assigned_mentor else None,
      "assigned_mentor_speciality": user.assigned_mentor.mentor_speciality if user.assigned_mentor else None,
    }
  )


def format_relative_time(value: datetime | None) -> str:
  if not value:
    return "No activity"
  diff = datetime.utcnow() - value
  minutes = max(0, int(diff.total_seconds() // 60))
  if minutes < 1:
    return "Just now"
  if minutes < 60:
    return f"{minutes} min{'s' if minutes != 1 else ''} ago"
  hours = minutes // 60
  if hours < 24:
    return f"{hours} hour{'s' if hours != 1 else ''} ago"
  days = hours // 24
  return f"{days} day{'s' if days != 1 else ''} ago"


def classify_log_level(message: str) -> str:
  lowered = message.lower()
  if any(term in lowered for term in ["auth", "login", "password", "otp"]):
    return "AUTH"
  if any(term in lowered for term in ["error", "failed", "timeout", "overdue"]):
    return "ERR"
  if any(term in lowered for term in ["reminder", "warning", "review"]):
    return "WARN"
  return "INFO"


@router.get("/admin/overview", response_model=AdminOverview)
def admin_overview(
  db: Session = Depends(get_db),
  current_user: User = Depends(require_roles("admin")),
):
  users = db.query(User).order_by(User.created_at.desc()).all()
  tasks = db.query(Task).order_by(Task.updated_at.desc()).all()
  reports = db.query(Report).order_by(Report.submitted_at.desc()).all()
  notifications = db.query(Notification).order_by(Notification.created_at.desc()).all()
  activity_logs = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).all()
  mentor_requests = db.query(MentorRequest).order_by(MentorRequest.created_at.desc()).all()

  user_latest_activity: dict[int, datetime] = {}
  user_courses: dict[int, set[str]] = defaultdict(set)

  for log in activity_logs:
    if log.user_id:
      user_latest_activity[log.user_id] = max(user_latest_activity.get(log.user_id, datetime.min), log.timestamp)

  for task in tasks:
    task_time = task.updated_at or task.created_at
    topic = ((task.tags or "").split(",")[0] or "General").strip()
    if task.assigned_to:
      user_latest_activity[task.assigned_to] = max(user_latest_activity.get(task.assigned_to, datetime.min), task_time)
      user_courses[task.assigned_to].add(topic)
    if task.created_by:
      user_latest_activity[task.created_by] = max(user_latest_activity.get(task.created_by, datetime.min), task_time)
      user_courses[task.created_by].add(topic)

  for report in reports:
    report_time = report.reviewed_at or report.submitted_at
    user_latest_activity[report.student_id] = max(user_latest_activity.get(report.student_id, datetime.min), report_time)

  for notification in notifications:
    user_latest_activity[notification.user_id] = max(user_latest_activity.get(notification.user_id, datetime.min), notification.created_at)

  active_tasks = [task for task in tasks if task.status != "Done"]
  done_tasks = [task for task in tasks if task.status == "Done"]
  completion_rate = round((len(done_tasks) / max(1, len(tasks))) * 100)
  in_progress_count = len([task for task in tasks if task.status in {"In Progress", "Review"}])
  active_course_topics = sorted({
    ((task.tags or "").split(",")[0] or "General").strip()
    for task in active_tasks
  })
  new_users_last_week = len([user for user in users if user.created_at >= datetime.utcnow() - timedelta(days=7)])
  unread_notifications = len([notification for notification in notifications if not notification.is_read])
  pending_mentor_requests = len([request for request in mentor_requests if request.status == "Pending"])

  cards = [
    AdminOverviewCard(
      label="Task Completion",
      value=f"{completion_rate}%",
      note=f"{len(done_tasks)} of {len(tasks)} tasks completed",
      badge="Live",
      tone="green",
      progress=completion_rate,
    ),
    AdminOverviewCard(
      label="Total Users",
      value=str(len(users)),
      note=f"{new_users_last_week} joined in the last 7 days",
      badge=f"+{new_users_last_week} / 7d" if new_users_last_week else "No new users",
      tone="blue",
    ),
    AdminOverviewCard(
      label="Active Workload",
      value=str(in_progress_count),
      note="Tasks currently in progress or review",
      badge=f"{round((in_progress_count / max(1, len(tasks))) * 100)}% active",
      tone="orange",
      progress=round((in_progress_count / max(1, len(tasks))) * 100),
    ),
    AdminOverviewCard(
      label="Mentor Requests",
      value=str(len(mentor_requests)),
      note=f"{pending_mentor_requests} requests waiting for assignment",
      badge=f"{unread_notifications} unread alerts",
      tone="purple",
    ),
  ]

  overview_users = []
  for user in users:
    latest_activity = max(user_latest_activity.get(user.id, datetime.min), user.created_at)
    status = "Online" if latest_activity >= datetime.utcnow() - timedelta(minutes=30) else "Offline"
    initials = "".join(part[:1] for part in user.name.split()[:2]).upper() or "NA"
    topics = sorted(user_courses.get(user.id) or [])
    course_access = ", ".join(topics[:2]) if topics else "General"
    if len(topics) > 2:
      course_access = f"{course_access} +{len(topics) - 2}"
    overview_users.append(
      AdminOverviewUser(
        id=user.id,
        initials=initials,
        name=user.name,
        email=user.email,
        role=user.role.title(),
        course_access=course_access,
        last_active=format_relative_time(latest_activity if latest_activity != datetime.min else user.created_at),
        status=status,
      )
    )

  recent_entries = []
  for mentor_request in mentor_requests[:8]:
    message = f"Mentor request from {mentor_request.user.name}: {mentor_request.requested_domain} ({mentor_request.status})"
    recent_entries.append((mentor_request.created_at, classify_log_level(message), message))
  for log in activity_logs[:12]:
    actor = log.user.name if log.user else "System"
    message = f"{actor}: {log.action}"
    recent_entries.append((log.timestamp, classify_log_level(message), message))
  for notification in notifications[:8]:
    actor = notification.user.name if notification.user else "User"
    message = f"Notification for {actor}: {notification.message}"
    recent_entries.append((notification.created_at, classify_log_level(message), message))
  recent_entries.sort(key=lambda item: item[0], reverse=True)

  overview_logs = [
    AdminOverviewLog(
      time=timestamp.strftime("%H:%M:%S"),
      level=level,
      message=message,
    )
    for timestamp, level, message in recent_entries[:12]
  ]

  now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
  traffic = []
  for offset in range(9, -1, -1):
    bucket_start = now - timedelta(hours=offset)
    bucket_end = bucket_start + timedelta(hours=1)
    inbound = sum(1 for log in activity_logs if bucket_start <= log.timestamp < bucket_end)
    outbound = sum(1 for report in reports if bucket_start <= report.submitted_at < bucket_end)
    traffic.append(
      AdminOverviewTrafficPoint(
        label=bucket_start.strftime("%H:%M"),
        inbound=inbound,
        outbound=outbound,
      )
    )

  services = [
    AdminOverviewService(
      name="Tasks Module",
      version=f"{len(tasks)} tracked tasks",
      tone="blue",
      status="live" if tasks else "sync",
    ),
    AdminOverviewService(
      name="Reports Module",
      version=f"{len(reports)} submitted reports",
      tone="purple",
      status="live" if reports else "sync",
    ),
    AdminOverviewService(
      name="Notifications Module",
      version=f"{len(notifications)} total notifications",
      tone="orange",
      status="live" if notifications else "sync",
    ),
  ]

  return AdminOverview(
    cards=cards,
    users=overview_users,
    logs=overview_logs,
    traffic=traffic,
    services=services,
  )


@router.get("/{role}")
def role_dashboard(
  role: str,
  student_id: int | None = Query(default=None),
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_user),
):
  if role != current_user.role:
    raise HTTPException(status_code=403, detail="Dashboard role mismatch")

  if current_user.role == "admin":
    if student_id is not None:
      student = db.get(User, student_id)
      if not student or student.role != "student":
        raise HTTPException(status_code=404, detail="Student not found")
      tasks = db.query(Task).filter(Task.assigned_to == student_id).order_by(Task.updated_at.desc()).all()
      reports = db.query(Report).filter(Report.student_id == student_id).order_by(Report.submitted_at.desc()).all()
      users = [student]
    else:
      tasks = db.query(Task).order_by(Task.updated_at.desc()).all()
      reports = db.query(Report).order_by(Report.submitted_at.desc()).all()
      users = db.query(User).order_by(User.created_at.desc()).all()
    unread_notifications = db.query(Notification).filter(
      Notification.user_id == current_user.id,
      Notification.is_read.is_(False),
    ).count()
  elif current_user.role == "mentor":
    assigned_students = db.query(User).filter(User.role == "student", User.assigned_mentor_id == current_user.id).order_by(User.created_at.desc()).all()
    assigned_student_ids = [student.id for student in assigned_students]
    if student_id is not None:
      if student_id not in assigned_student_ids:
        raise HTTPException(status_code=404, detail="Assigned student not found")
      tasks = db.query(Task).filter(Task.assigned_to == student_id).order_by(Task.updated_at.desc()).all()
      reports = db.query(Report).filter(Report.student_id == student_id).order_by(Report.submitted_at.desc()).all()
      users = [student for student in assigned_students if student.id == student_id]
    else:
      tasks = db.query(Task).filter(Task.assigned_to.in_(assigned_student_ids)).order_by(Task.updated_at.desc()).all() if assigned_student_ids else []
      reports = db.query(Report).filter(Report.student_id.in_(assigned_student_ids)).order_by(Report.submitted_at.desc()).all() if assigned_student_ids else []
      users = assigned_students
    unread_notifications = db.query(Notification).filter(
      Notification.user_id == current_user.id,
      Notification.is_read.is_(False),
    ).count()
  else:
    tasks = db.query(Task).filter(Task.assigned_to == current_user.id).order_by(Task.updated_at.desc()).all()
    reports = db.query(Report).filter(Report.student_id == current_user.id).order_by(Report.submitted_at.desc()).all()
    users = [current_user]
    unread_notifications = db.query(Notification).filter(
      Notification.user_id == current_user.id,
      Notification.is_read.is_(False),
    ).count()

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
    students = [serialize_user(user) for user in users if user.role == "student"]
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
    "assigned_mentor": {
      "id": current_user.assigned_mentor.id,
      "name": current_user.assigned_mentor.name,
      "email": current_user.assigned_mentor.email,
      "mentor_speciality": current_user.assigned_mentor.mentor_speciality,
      "bio": current_user.assigned_mentor.bio,
    } if current_user.assigned_mentor else None,
  }
