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
  oauth_provider = Column(String(32), nullable=True)
  avatar = Column(Text, nullable=True)
  bio = Column(Text, nullable=True)
  contact_number = Column(String(32), nullable=True)
  mentor_speciality = Column(String(180), nullable=True)
  assigned_mentor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
  notification_email = Column(Boolean, default=True)
  notification_push = Column(Boolean, default=True)
  daily_study_minutes = Column(Integer, default=120, nullable=False)
  burnout_limit_minutes = Column(Integer, default=240, nullable=False)
  goal_title = Column(String(180), nullable=True)
  goal_target_date = Column(DateTime, nullable=True)
  created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

  assigned_tasks = relationship("Task", foreign_keys="Task.assigned_to", back_populates="assignee")
  created_tasks = relationship("Task", foreign_keys="Task.created_by", back_populates="creator")
  assigned_mentor = relationship("User", remote_side=[id], back_populates="assigned_students")
  assigned_students = relationship("User", back_populates="assigned_mentor")
  reports = relationship("Report", back_populates="student")
  notifications = relationship("Notification", back_populates="user")
  activity_logs = relationship("ActivityLog", back_populates="user")
  course_enrollments = relationship("CourseEnrollment", back_populates="user")
  payment_orders = relationship("PaymentOrder", back_populates="user")
  mentor_requests = relationship("MentorRequest", foreign_keys="MentorRequest.user_id", back_populates="user")
  handled_mentor_requests = relationship("MentorRequest", foreign_keys="MentorRequest.assigned_mentor_id", back_populates="mentor")


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
  progress = Column(Integer, default=0, nullable=False)
  difficulty = Column(Enum("Easy", "Medium", "Hard", name="difficulty_enum"), default="Medium")
  estimated_minutes = Column(Integer, default=90, nullable=False)
  time_spent_minutes = Column(Integer, default=0, nullable=False)
  tags = Column(String(255), default="")
  source_type = Column(String(24), default="manual", nullable=False)
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


class MentorRequest(Base):
  __tablename__ = "mentor_requests"

  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
  assigned_mentor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
  requested_domain = Column(String(180), nullable=False)
  message = Column(Text, nullable=True)
  status = Column(Enum("Pending", "Assigned", "Closed", name="mentor_request_status_enum"), default="Pending", nullable=False)
  created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
  resolved_at = Column(DateTime, nullable=True)

  user = relationship("User", foreign_keys=[user_id], back_populates="mentor_requests")
  mentor = relationship("User", foreign_keys=[assigned_mentor_id], back_populates="handled_mentor_requests")


class ActivityLog(Base):
  __tablename__ = "activity_logs"

  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
  action = Column(String(255), nullable=False)
  timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

  user = relationship("User", back_populates="activity_logs")


class ContactMessage(Base):
  __tablename__ = "contact_messages"

  id = Column(Integer, primary_key=True, index=True)
  full_name = Column(String(160), nullable=False)
  email = Column(String(180), nullable=False, index=True)
  subject = Column(String(160), nullable=False)
  message = Column(Text, nullable=False)
  admin_reply = Column(Text, nullable=True)
  replied_at = Column(DateTime, nullable=True)
  created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class NewsletterSubscriber(Base):
  __tablename__ = "newsletter_subscribers"

  id = Column(Integer, primary_key=True, index=True)
  email = Column(String(180), unique=True, index=True, nullable=False)
  is_active = Column(Boolean, default=True, nullable=False)
  created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class MentorFeedback(Base):
  __tablename__ = "mentor_feedback"

  id = Column(Integer, primary_key=True, index=True)
  student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
  mentor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
  rating = Column(Integer, nullable=False, default=5)
  message = Column(Text, nullable=False)
  created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

  student = relationship("User", foreign_keys=[student_id])
  mentor = relationship("User", foreign_keys=[mentor_id])


class PaymentOrder(Base):
  __tablename__ = "payment_orders"

  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
  provider = Column(String(32), nullable=False, default="razorpay")
  provider_order_id = Column(String(120), nullable=False, unique=True, index=True)
  provider_payment_id = Column(String(120), nullable=True, unique=True)
  provider_signature = Column(String(255), nullable=True)
  course_ids = Column(Text, nullable=False)
  subtotal_amount = Column(Integer, nullable=False)
  discount_amount = Column(Integer, nullable=False, default=0)
  tax_amount = Column(Integer, nullable=False, default=0)
  total_amount = Column(Integer, nullable=False)
  currency = Column(String(8), nullable=False, default="INR")
  promo_code = Column(String(64), nullable=True)
  status = Column(String(24), nullable=False, default="created")
  created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
  paid_at = Column(DateTime, nullable=True)

  user = relationship("User", back_populates="payment_orders")


class CourseEnrollment(Base):
  __tablename__ = "course_enrollments"

  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
  course_id = Column(String(120), nullable=False, index=True)
  payment_order_id = Column(Integer, ForeignKey("payment_orders.id"), nullable=True)
  razorpay_payment_id = Column(String(120), nullable=True)
  purchased_at = Column(DateTime, default=datetime.utcnow, nullable=False)

  user = relationship("User", back_populates="course_enrollments")
