from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from .config import settings
from .database import Base, SessionLocal, engine
from .routers import analytics, auth, contact, courses, dashboard, mentors, newsletter, notifications, payments, planner, reports, tasks, users
from .seed import seed_database

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
  CORSMiddleware,
  allow_origins=settings.CORS_ORIGINS,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)


@app.on_event("startup")
def startup():
  Base.metadata.create_all(bind=engine)
  db = SessionLocal()
  try:
    inspector = inspect(engine)
    user_columns = {column["name"] for column in inspector.get_columns("users")} if inspector.has_table("users") else set()
    task_columns = {column["name"] for column in inspector.get_columns("tasks")} if inspector.has_table("tasks") else set()
    contact_columns = {column["name"] for column in inspector.get_columns("contact_messages")} if inspector.has_table("contact_messages") else set()
    if inspector.has_table("users"):
      user_migrations = [
        ("daily_study_minutes", "ALTER TABLE users ADD COLUMN daily_study_minutes INTEGER NOT NULL DEFAULT 120"),
        ("burnout_limit_minutes", "ALTER TABLE users ADD COLUMN burnout_limit_minutes INTEGER NOT NULL DEFAULT 240"),
        ("goal_title", "ALTER TABLE users ADD COLUMN goal_title VARCHAR(180) NULL"),
        ("goal_target_date", "ALTER TABLE users ADD COLUMN goal_target_date DATETIME NULL"),
        ("oauth_provider", "ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(32) NULL"),
        ("avatar", "ALTER TABLE users ADD COLUMN avatar TEXT NULL"),
        ("contact_number", "ALTER TABLE users ADD COLUMN contact_number VARCHAR(32) NULL"),
        ("mentor_speciality", "ALTER TABLE users ADD COLUMN mentor_speciality VARCHAR(180) NULL"),
        ("assigned_mentor_id", "ALTER TABLE users ADD COLUMN assigned_mentor_id INTEGER NULL"),
      ]
      for column_name, statement in user_migrations:
        if column_name not in user_columns:
          with engine.begin() as connection:
            connection.execute(text(statement))
    if "progress" not in task_columns and inspector.has_table("tasks"):
      with engine.begin() as connection:
        connection.execute(text("ALTER TABLE tasks ADD COLUMN progress INTEGER NOT NULL DEFAULT 0"))
        connection.execute(
          text(
            """
            UPDATE tasks
            SET progress = CASE status
              WHEN 'Done' THEN 100
              WHEN 'Review' THEN 85
              WHEN 'In Progress' THEN 60
              ELSE 0
            END
            """
          )
        )
    if inspector.has_table("tasks"):
      task_migrations = [
        ("difficulty", "ALTER TABLE tasks ADD COLUMN difficulty VARCHAR(6) NOT NULL DEFAULT 'Medium'"),
        ("estimated_minutes", "ALTER TABLE tasks ADD COLUMN estimated_minutes INTEGER NOT NULL DEFAULT 90"),
        ("time_spent_minutes", "ALTER TABLE tasks ADD COLUMN time_spent_minutes INTEGER NOT NULL DEFAULT 0"),
        ("source_type", "ALTER TABLE tasks ADD COLUMN source_type VARCHAR(24) NOT NULL DEFAULT 'manual'"),
      ]
      for column_name, statement in task_migrations:
        if column_name not in task_columns:
          with engine.begin() as connection:
            connection.execute(text(statement))
    if inspector.has_table("contact_messages"):
      contact_migrations = [
        ("admin_reply", "ALTER TABLE contact_messages ADD COLUMN admin_reply TEXT NULL"),
        ("replied_at", "ALTER TABLE contact_messages ADD COLUMN replied_at DATETIME NULL"),
      ]
      for column_name, statement in contact_migrations:
        if column_name not in contact_columns:
          with engine.begin() as connection:
            connection.execute(text(statement))
    if not inspector.has_table("mentor_feedback"):
      Base.metadata.tables["mentor_feedback"].create(bind=engine)
    seed_database(db)
  finally:
    db.close()


@app.get("/api/health")
def health():
  return {"status": "ok", "service": settings.PROJECT_NAME}


app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(users.router, prefix=settings.API_PREFIX)
app.include_router(tasks.router, prefix=settings.API_PREFIX)
app.include_router(reports.router, prefix=settings.API_PREFIX)
app.include_router(analytics.router, prefix=settings.API_PREFIX)
app.include_router(notifications.router, prefix=settings.API_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_PREFIX)
app.include_router(mentors.router, prefix=settings.API_PREFIX)
app.include_router(planner.router, prefix=settings.API_PREFIX)
app.include_router(contact.router, prefix=settings.API_PREFIX)
app.include_router(newsletter.router, prefix=settings.API_PREFIX)
app.include_router(payments.router, prefix=settings.API_PREFIX)
app.include_router(courses.router, prefix=settings.API_PREFIX)
