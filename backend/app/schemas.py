from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
  name: str
  email: EmailStr
  role: str = "student"


class UserCreate(UserBase):
  password: str = "password"
  mentor_speciality: Optional[str] = None


class UserUpdate(BaseModel):
  name: Optional[str] = None
  email: Optional[EmailStr] = None
  avatar: Optional[str] = None
  bio: Optional[str] = None
  contact_number: Optional[str] = None
  mentor_speciality: Optional[str] = None
  notification_email: Optional[bool] = None
  notification_push: Optional[bool] = None
  daily_study_minutes: Optional[int] = None
  burnout_limit_minutes: Optional[int] = None
  goal_title: Optional[str] = None
  goal_target_date: Optional[datetime] = None


class UserAdminUpdate(BaseModel):
  name: Optional[str] = None
  email: Optional[EmailStr] = None
  role: Optional[str] = None
  avatar: Optional[str] = None
  bio: Optional[str] = None
  contact_number: Optional[str] = None
  mentor_speciality: Optional[str] = None
  assigned_mentor_id: Optional[int] = None
  notification_email: Optional[bool] = None
  notification_push: Optional[bool] = None
  daily_study_minutes: Optional[int] = None
  burnout_limit_minutes: Optional[int] = None
  goal_title: Optional[str] = None
  goal_target_date: Optional[datetime] = None


class UserOut(UserBase):
  id: int
  oauth_provider: Optional[str] = None
  avatar: Optional[str] = None
  bio: Optional[str] = None
  contact_number: Optional[str] = None
  mentor_speciality: Optional[str] = None
  assigned_mentor_id: Optional[int] = None
  assigned_mentor_name: Optional[str] = None
  assigned_mentor_email: Optional[EmailStr] = None
  assigned_mentor_speciality: Optional[str] = None
  notification_email: bool
  notification_push: bool
  daily_study_minutes: int
  burnout_limit_minutes: int
  goal_title: Optional[str] = None
  goal_target_date: Optional[datetime] = None
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


class ContactMessageCreate(BaseModel):
  full_name: str
  email: EmailStr
  subject: str
  message: str


class ContactMessageOut(ContactMessageCreate):
  id: int
  admin_reply: Optional[str] = None
  replied_at: Optional[datetime] = None
  created_at: datetime

  class Config:
    from_attributes = True


class ContactReplyCreate(BaseModel):
  reply: str


class SupportFaqOut(BaseModel):
  id: str
  question: str
  answer: str
  category: str


class NewsletterSubscribeCreate(BaseModel):
  email: EmailStr


class TaskBase(BaseModel):
  title: str
  description: str
  status: str = "To Do"
  priority: str = "Medium"
  progress: int = 0
  difficulty: str = "Medium"
  estimated_minutes: int = 90
  time_spent_minutes: int = 0
  tags: str = ""
  assigned_to: Optional[int] = None
  due_date: Optional[datetime] = None
  source_type: str = "manual"


class TaskCreate(TaskBase):
  pass


class TaskUpdate(BaseModel):
  title: Optional[str] = None
  description: Optional[str] = None
  status: Optional[str] = None
  priority: Optional[str] = None
  progress: Optional[int] = None
  difficulty: Optional[str] = None
  estimated_minutes: Optional[int] = None
  time_spent_minutes: Optional[int] = None
  tags: Optional[str] = None
  assigned_to: Optional[int] = None
  due_date: Optional[datetime] = None
  source_type: Optional[str] = None


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


class PlannerSuggestion(BaseModel):
  title: str
  reason: str
  recommended_minutes: int
  priority_score: int
  due_label: str


class PlannerGoalMilestone(BaseModel):
  label: str
  focus: str
  target_minutes: int


class PlannerReminder(BaseModel):
  title: str
  detail: str
  severity: str


class PlannerSummary(BaseModel):
  available_minutes: int
  planned_minutes: int
  pending_today: int
  overdue_tasks: int
  productivity_score: int
  completion_rate: int
  remaining_workload_minutes: int
  burnout_risk: str
  adaptive_message: str
  daily_plan: list[PlannerSuggestion]
  ai_suggestions: list[str]
  reminders: list[PlannerReminder]
  goal_milestones: list[PlannerGoalMilestone]
  priority_queue: list[PlannerSuggestion]


class PlannerRebuildRequest(BaseModel):
  daily_study_minutes: int
  burnout_limit_minutes: int
  goal_title: Optional[str] = None
  goal_target_date: Optional[datetime] = None


class PlannerRebuildResponse(BaseModel):
  summary: PlannerSummary
  generated_tasks: int


class AdminOverviewCard(BaseModel):
  label: str
  value: str
  note: str
  badge: str
  tone: str
  progress: int | None = None


class AdminOverviewUser(BaseModel):
  id: int
  initials: str
  name: str
  email: EmailStr
  role: str
  course_access: str
  last_active: str
  status: str


class AdminOverviewLog(BaseModel):
  time: str
  level: str
  message: str


class AdminOverviewTrafficPoint(BaseModel):
  label: str
  inbound: int
  outbound: int


class AdminOverviewService(BaseModel):
  name: str
  version: str
  tone: str
  status: str


class AdminOverview(BaseModel):
  cards: list[AdminOverviewCard]
  users: list[AdminOverviewUser]
  logs: list[AdminOverviewLog]
  traffic: list[AdminOverviewTrafficPoint]
  services: list[AdminOverviewService]


class PaymentOrderCreate(BaseModel):
  course_ids: list[str]
  promo_code: Optional[str] = None


class RazorpayOrderResponse(BaseModel):
  key_id: str
  order_id: str
  amount: int
  currency: str
  name: str
  description: str
  prefill_name: str
  prefill_email: EmailStr


class PaymentVerifyRequest(BaseModel):
  razorpay_order_id: str
  razorpay_payment_id: str
  razorpay_signature: str


class CourseEnrollmentOut(BaseModel):
  id: int
  user_id: int
  course_id: str
  razorpay_payment_id: Optional[str] = None
  purchased_at: datetime

  class Config:
    from_attributes = True


class PaymentVerifyResponse(BaseModel):
  message: str
  enrolled_course_ids: list[str]


class CourseOut(BaseModel):
  id: str
  title: str
  category: str
  level: str
  duration: str
  lessons: int
  students: str
  price: int
  mentor: str
  badge: str
  accent: str
  image: str
  learningUrl: str
  summary: str
  outcomes: list[str]


class MentorCreate(BaseModel):
  name: str
  email: EmailStr
  password: str = "mentor123"
  role: str = "mentor"
  mentor_speciality: Optional[str] = None
  bio: Optional[str] = None


class MentorRequestCreate(BaseModel):
  requested_domain: str
  message: Optional[str] = None


class MentorAssignmentCreate(BaseModel):
  mentor_id: int


class MentorRequestOut(BaseModel):
  id: int
  user_id: int
  user_name: str
  user_email: EmailStr
  assigned_mentor_id: Optional[int] = None
  assigned_mentor_name: Optional[str] = None
  assigned_mentor_email: Optional[EmailStr] = None
  assigned_mentor_speciality: Optional[str] = None
  requested_domain: str
  message: Optional[str] = None
  status: str
  created_at: datetime
  resolved_at: Optional[datetime] = None

  class Config:
    from_attributes = True


class MentorFeedbackCreate(BaseModel):
  rating: int
  message: str


class MentorFeedbackOut(BaseModel):
  id: int
  student_id: int
  student_name: str
  mentor_id: int
  mentor_name: str
  rating: int
  message: str
  created_at: datetime

  class Config:
    from_attributes = True
