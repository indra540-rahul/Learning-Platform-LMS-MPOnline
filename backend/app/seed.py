from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from .models import ActivityLog, Notification, Report, Task, User
from .security import hash_password


def seed_database(db: Session):
  if db.query(User).count() > 0:
    return

  users = [
    User(name="Admin User", email="admin@example.com", password=hash_password("admin123"), role="admin"),
    User(name="Mentor User", email="mentor@example.com", password=hash_password("mentor123"), role="mentor", mentor_speciality="React, frontend architecture"),
    User(name="Student User", email="student@example.com", password=hash_password("student123"), role="student"),
    User(name="Ananya Sharma", email="ananya@example.com", password=hash_password("student123"), role="student"),
    User(name="Rahul Mehta", email="rahul@example.com", password=hash_password("student123"), role="student"),
  ]
  db.add_all(users)
  db.flush()

  admin, mentor, student = users[0], users[1], users[2]
  student.assigned_mentor_id = mentor.id
  due_base = datetime.utcnow() + timedelta(days=2)
  tasks = [
    Task(
      title="Finish React routing module",
      description="Complete nested route practice and dashboard navigation.",
      status="To Do",
      priority="High",
      progress=0,
      difficulty="Hard",
      estimated_minutes=180,
      time_spent_minutes=20,
      tags="react,frontend",
      assigned_to=student.id,
      created_by=mentor.id,
      due_date=due_base,
    ),
    Task(
      title="Prepare DBMS normalization notes",
      description="Summarize 1NF, 2NF, 3NF and BCNF with examples.",
      status="In Progress",
      priority="Medium",
      progress=55,
      difficulty="Medium",
      estimated_minutes=150,
      time_spent_minutes=70,
      tags="database,assignment",
      assigned_to=student.id,
      created_by=mentor.id,
      due_date=due_base + timedelta(days=1),
    ),
    Task(
      title="Review weekly LMS progress",
      description="Mentor review for student study plan adherence.",
      status="Review",
      priority="Critical",
      progress=85,
      difficulty="Medium",
      estimated_minutes=90,
      time_spent_minutes=55,
      tags="review,mentor",
      assigned_to=mentor.id,
      created_by=admin.id,
      due_date=due_base + timedelta(days=3),
    ),
    Task(
      title="Submit markdown report",
      description="Write a weekly learning report and submit it for feedback.",
      status="Done",
      priority="Low",
      progress=100,
      difficulty="Easy",
      estimated_minutes=60,
      time_spent_minutes=60,
      tags="report,markdown",
      assigned_to=student.id,
      created_by=mentor.id,
      due_date=due_base - timedelta(days=1),
    ),
  ]
  db.add_all(tasks)

  report = Report(
    student_id=student.id,
    content="# Weekly Learning Report\n\nCompleted React routing and began database normalization.",
    feedback="Good progress. Add more examples in the DBMS section.",
    status="Reviewed",
    reviewed_at=datetime.utcnow(),
  )
  db.add(report)

  notifications = [
    Notification(user_id=student.id, message="DBMS assignment deadline is approaching."),
    Notification(user_id=mentor.id, message="A student submitted a new weekly report."),
    Notification(user_id=admin.id, message="System seed data has been initialized."),
  ]
  db.add_all(notifications)

  logs = [
    ActivityLog(user_id=admin.id, action="Created LMS workspace"),
    ActivityLog(user_id=mentor.id, action="Assigned study tasks"),
    ActivityLog(user_id=student.id, action="Submitted weekly report"),
  ]
  db.add_all(logs)
  db.commit()
