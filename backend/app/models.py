from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
  __tablename__ = "users"

  id = Column(Integer, primary_key=True, index=True)
  name = Column(String(120), nullable=False)
  email = Column(String(180), unique=True, index=True, nullable=False)
  password = Column(String(255), nullable=False)
  role = Column(Enum("admin", "mentor", "student", name="role_enum"), nullable=False, default="student")
  bio = Column(Text, nullable=True)
  notification_email = Column(Boolean, default=True)
  notification_push = Column(Boolean, default=True)
  created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

  assigned_tasks = relationship("Task", foreign_keys="Task.assigned_to", back_populates="assignee")
  created_tasks = relationship("Task", foreign_keys="Task.created_by", back_populates="creator")
  reports = relationship("Report", back_populates="student")
  notifications = relationship("Notification", back_populates="user")
  activity_logs = relationship("ActivityLog", back_populates="user")


class PasswordResetOTP(Base):
  __tablename__ = "password_reset_otps"

  id = Column(Integer, primary_key=True, index=True)
  email = Column(String(180), index=True, nullable=False)
  otp_hash = Column(String(255), nullable=False)
  expires_at = Column(DateTime, nullable=False)
  used = Column(Boolean, default=False)
  created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Task(Base):
  __tablename__ = "tasks"

  id = Column(Integer, primary_key=True, index=True)
  title = Column(String(180), nullable=False)
  description = Column(Text, nullable=False)
  status = Column(Enum("To Do", "In Progress", "Review", "Done", name="task_status_enum"), default="To Do")
  priority = Column(Enum("Low", "Medium", "High", "Critical", name="priority_enum"), default="Medium")
  tags = Column(String(255), default="")
  assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
  created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
  due_date = Column(DateTime, nullable=True)
  created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
  updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

  assignee = relationship("User", foreign_keys=[assigned_to], back_populates="assigned_tasks")
  creator = relationship("User", foreign_keys=[created_by], back_populates="created_tasks")


class Report(Base):
  __tablename__ = "reports"

  id = Column(Integer, primary_key=True, index=True)
  student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
  content = Column(Text, nullable=False)
  feedback = Column(Text, nullable=True)
  status = Column(Enum("Draft", "Submitted", "Reviewed", name="report_status_enum"), default="Submitted")
  file_path = Column(String(255), nullable=True)
  submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
  reviewed_at = Column(DateTime, nullable=True)

  student = relationship("User", back_populates="reports")


class Notification(Base):
  __tablename__ = "notifications"

  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
  message = Column(String(255), nullable=False)
  is_read = Column(Boolean, default=False)
  created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

  user = relationship("User", back_populates="notifications")


class ActivityLog(Base):
  __tablename__ = "activity_logs"

  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
  action = Column(String(255), nullable=False)
  timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

  user = relationship("User", back_populates="activity_logs")
