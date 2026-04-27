from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
  name: str
  email: EmailStr
  role: str = "student"


class UserCreate(UserBase):
  password: str = "password"


class UserUpdate(BaseModel):
  name: Optional[str] = None
  bio: Optional[str] = None
  notification_email: Optional[bool] = None
  notification_push: Optional[bool] = None


class UserOut(UserBase):
  id: int
  bio: Optional[str] = None
  notification_email: bool
  notification_push: bool
  created_at: datetime

  class Config:
    from_attributes = True


class LoginRequest(BaseModel):
  email: EmailStr
  password: str


class ForgotPasswordRequest(BaseModel):
  email: EmailStr


class ResetPasswordRequest(BaseModel):
  email: EmailStr
  otp: str
  new_password: str


class MessageResponse(BaseModel):
  message: str


class TokenResponse(BaseModel):
  access_token: str
  refresh_token: str
  token_type: str = "bearer"
  user: UserOut


class TaskBase(BaseModel):
  title: str
  description: str
  status: str = "To Do"
  priority: str = "Medium"
  tags: str = ""
  assigned_to: Optional[int] = None
  due_date: Optional[datetime] = None


class TaskCreate(TaskBase):
  pass


class TaskUpdate(BaseModel):
  title: Optional[str] = None
  description: Optional[str] = None
  status: Optional[str] = None
  priority: Optional[str] = None
  tags: Optional[str] = None
  assigned_to: Optional[int] = None
  due_date: Optional[datetime] = None


class TaskOut(TaskBase):
  id: int
  created_by: Optional[int] = None
  created_at: datetime
  updated_at: datetime

  class Config:
    from_attributes = True


class ReportCreate(BaseModel):
  content: str


class FeedbackCreate(BaseModel):
  feedback: str


class ReportOut(BaseModel):
  id: int
  student_id: int
  content: str
  feedback: Optional[str] = None
  status: str
  file_path: Optional[str] = None
  submitted_at: datetime
  reviewed_at: Optional[datetime] = None

  class Config:
    from_attributes = True


class NotificationOut(BaseModel):
  id: int
  user_id: int
  message: str
  is_read: bool
  created_at: datetime

  class Config:
    from_attributes = True


class AnalyticsOverview(BaseModel):
  total_users: int
  total_students: int
  total_mentors: int
  total_tasks: int
  done_tasks: int
  submitted_reports: int
  unread_notifications: int


class PerformancePoint(BaseModel):
  label: str
  progress: int
  department: str
  performance: int
