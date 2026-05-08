from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models import Notification, Task, User
from ..schemas import (
  PlannerGoalMilestone,
  PlannerRebuildRequest,
  PlannerRebuildResponse,
  PlannerReminder,
  PlannerSuggestion,
  PlannerSummary,
)

router = APIRouter(prefix="/planner", tags=["Planner"])

PRIORITY_WEIGHTS = {"Low": 1, "Medium": 2, "High": 4, "Critical": 5}
DIFFICULTY_WEIGHTS = {"Easy": 1, "Medium": 2, "Hard": 3}
PLANNER_PHASES = [
  ("Foundation", "Cover the core concepts and first-pass notes for this goal."),
  ("Focused Practice", "Apply the concepts with guided practice and active recall."),
  ("Implementation", "Convert the plan into working answers, exercises, or project output."),
  ("Revision", "Review weak spots, revise mistakes, and finish the final pass before deadline."),
]


def due_in_days(task: Task) -> int:
  if not task.due_date:
    return 14
  return (task.due_date.date() - datetime.utcnow().date()).days


def remaining_minutes(task: Task) -> int:
  progress_left = max(0, 100 - (task.progress or 0)) / 100
  estimate_left = int((task.estimated_minutes or 0) * progress_left)
  time_gap = max(0, (task.estimated_minutes or 0) - (task.time_spent_minutes or 0))
  return max(15, estimate_left, time_gap) if task.status != "Done" else 0


def priority_score(task: Task) -> int:
  urgency_days = due_in_days(task)
  urgency_score = 6 if urgency_days <= 0 else 5 if urgency_days <= 1 else 4 if urgency_days <= 3 else 3 if urgency_days <= 7 else 1
  missed_penalty = 2 if urgency_days < 0 or (task.progress or 0) == 0 and urgency_days <= 1 else 0
  return (
    PRIORITY_WEIGHTS.get(task.priority, 2) * 18
    + DIFFICULTY_WEIGHTS.get(task.difficulty, 2) * 10
    + urgency_score * 14
    + min(20, max(0, 100 - (task.progress or 0)) // 5)
    + missed_penalty * 8
  )


def due_label(task: Task) -> str:
  days = due_in_days(task)
  if days < 0:
    return "Overdue"
  if days == 0:
    return "Due today"
  if days == 1:
    return "Due tomorrow"
  return f"Due in {days} days"


def build_goal_milestones(user: User, tasks: list[Task]) -> list[PlannerGoalMilestone]:
  if not user.goal_title or not user.goal_target_date:
    return []

  planner_tasks = [
    task for task in tasks
    if task.source_type == "planner" and task.status != "Done"
  ]
  if planner_tasks:
    return [
      PlannerGoalMilestone(
        label=f"Phase {index}",
        focus=task.title,
        target_minutes=max(30, remaining_minutes(task)),
      )
      for index, task in enumerate(planner_tasks, start=1)
    ]

  remaining_days = max(1, (user.goal_target_date.date() - datetime.utcnow().date()).days + 1)
  remaining_work = sum(remaining_minutes(task) for task in tasks if task.status != "Done")
  daily_target = max(30, round(remaining_work / remaining_days)) if remaining_work else max(30, round(user.daily_study_minutes / 2))

  milestones = []
  topics = [((task.tags or "").split(",")[0] or task.title).strip() for task in tasks if task.status != "Done"]
  focus_topics = topics[:3] or [user.goal_title]
  for index, focus in enumerate(focus_topics, start=1):
    milestones.append(
      PlannerGoalMilestone(
        label=f"Phase {index}",
        focus=focus,
        target_minutes=daily_target,
      )
    )
  return milestones


def normalize_goal_tag(goal_title: str | None) -> str:
  if not goal_title:
    return "planner"
  cleaned = "".join(character.lower() if character.isalnum() else "-" for character in goal_title).strip("-")
  while "--" in cleaned:
    cleaned = cleaned.replace("--", "-")
  return cleaned[:48] or "planner"


def build_planner_task_blueprint(user: User) -> list[dict]:
  if not user.goal_title or not user.goal_target_date:
    return []

  today = datetime.utcnow().date()
  target_date = user.goal_target_date.date()
  if target_date < today:
    target_date = today

  total_days = max(1, (target_date - today).days + 1)
  phase_count = 4 if total_days >= 21 else 3 if total_days >= 10 else 2
  daily_minutes = max(30, user.daily_study_minutes or 120)
  focus_tag = normalize_goal_tag(user.goal_title)
  total_focus_minutes = max(daily_minutes * phase_count, min(daily_minutes * total_days, daily_minutes * 8))
  minutes_per_phase = max(30, round((total_focus_minutes / phase_count) / 15) * 15)

  blueprints = []
  for index in range(phase_count):
    phase_name, phase_copy = PLANNER_PHASES[index]
    due_offset = round(((index + 1) / phase_count) * (total_days - 1)) if total_days > 1 else 0
    due_date = datetime.combine(today + timedelta(days=due_offset), datetime.min.time()) + timedelta(hours=18)
    priority = "Critical" if index == phase_count - 1 else "High" if index == phase_count - 2 else "Medium"
    difficulty = "Hard" if index >= phase_count - 2 else "Medium"
    blueprints.append(
      {
        "title": f"{user.goal_title} - {phase_name}",
        "description": (
          f"Planner-generated roadmap task for {user.goal_title}. {phase_copy} "
          f"Target completion before {target_date.isoformat()}."
        ),
        "status": "To Do",
        "priority": priority,
        "difficulty": difficulty,
        "progress": 0,
        "estimated_minutes": minutes_per_phase,
        "time_spent_minutes": 0,
        "tags": f"{focus_tag},planner",
        "assigned_to": user.id,
        "created_by": user.id,
        "due_date": due_date,
        "source_type": "planner",
      }
    )
  return blueprints


def build_goal_priority_pool(user: User, ranked_tasks: list[Task]) -> list[Task]:
  if not user.goal_title:
    return ranked_tasks

  goal_tag = normalize_goal_tag(user.goal_title)
  goal_terms = [term for term in goal_tag.split("-") if term]

  focused_tasks = []
  for task in ranked_tasks:
    tag_text = (task.tags or "").lower()
    title_text = (task.title or "").lower()
    if task.source_type == "planner":
      focused_tasks.append(task)
      continue
    if goal_tag and goal_tag in tag_text:
      focused_tasks.append(task)
      continue
    if goal_terms and all(term in f"{title_text} {tag_text}" for term in goal_terms):
      focused_tasks.append(task)

  return focused_tasks or ranked_tasks


def create_or_refresh_reminder(db: Session, user: User, pending_today: int):
  if pending_today <= 0:
    return
  today = datetime.utcnow().date()
  existing = (
    db.query(Notification)
    .filter(
      Notification.user_id == user.id,
      Notification.created_at >= datetime(today.year, today.month, today.day),
      Notification.message.like("Planner reminder:%"),
    )
    .first()
  )
  message = f"Planner reminder: You have {pending_today} pending task{'s' if pending_today != 1 else ''} scheduled for today."
  if existing:
    existing.message = message
    return
  db.add(Notification(user_id=user.id, message=message))


def fetch_planner_tasks(db: Session, current_user: User) -> list[Task]:
  task_query = db.query(Task)
  if current_user.role == "student":
    task_query = task_query.filter(Task.assigned_to == current_user.id)
  elif current_user.role == "mentor":
    task_query = task_query.filter((Task.assigned_to == current_user.id) | (Task.created_by == current_user.id))

  return task_query.order_by(
    case((Task.due_date.is_(None), 1), else_=0),
    Task.due_date.asc(),
    Task.updated_at.desc(),
  ).all()


def build_planner_summary(db: Session, current_user: User) -> PlannerSummary:
  tasks = fetch_planner_tasks(db, current_user)
  active_tasks = [task for task in tasks if task.status != "Done"]
  ranked_tasks = sorted(active_tasks, key=lambda task: priority_score(task), reverse=True)
  focus_queue = build_goal_priority_pool(current_user, ranked_tasks)
  available_minutes = max(30, current_user.daily_study_minutes or 120)

  planned_minutes = 0
  daily_plan = []
  for task in focus_queue:
    if planned_minutes >= available_minutes:
      break
    recommendation = min(remaining_minutes(task), max(30, available_minutes - planned_minutes))
    planned_minutes += recommendation
    daily_plan.append(
      PlannerSuggestion(
        title=task.title,
        reason=f"{task.priority} priority - {task.difficulty} difficulty - {due_label(task)}",
        recommended_minutes=recommendation,
        priority_score=priority_score(task),
        due_label=due_label(task),
      )
    )

  overdue_tasks = len([task for task in active_tasks if due_in_days(task) < 0])
  pending_today = len([task for task in active_tasks if due_in_days(task) <= 0 or priority_score(task) >= 120])
  completion_rate = round(sum(task.progress for task in tasks) / max(1, len(tasks))) if tasks else 0
  remaining_workload_minutes = sum(remaining_minutes(task) for task in active_tasks)

  completed_recent = len([task for task in tasks if task.status == "Done" and task.updated_at and task.updated_at >= datetime.utcnow() - timedelta(days=7)])
  active_days = {
    (task.updated_at or task.created_at).date().isoformat()
    for task in tasks
    if (task.updated_at or task.created_at) >= datetime.utcnow() - timedelta(days=7)
  }
  consistency = min(100, len(active_days) * 14)
  productivity_score = min(100, round(completed_recent * 12 + completion_rate * 0.45 + consistency * 0.28))

  burnout_limit = max(90, current_user.burnout_limit_minutes or 240)
  if planned_minutes >= burnout_limit or len(daily_plan) >= 5:
    burnout_risk = "High"
    adaptive_message = "Schedule has been softened. Focus on the top priorities and take a recovery break between sessions."
  elif planned_minutes >= round(burnout_limit * 0.75):
    burnout_risk = "Medium"
    adaptive_message = "Your plan is dense today. Keep one light revision block or short break after the hardest task."
  else:
    burnout_risk = "Low"
    adaptive_message = "Planner is balanced. You can keep momentum without overloading the day."

  ai_suggestions = [
    f"Study {item.title} for {item.recommended_minutes} minutes today." for item in daily_plan[:2]
  ]
  if len(daily_plan) >= 3:
    ai_suggestions.append(f"Revise {daily_plan[2].title} tomorrow if you finish today's high-priority work.")
  if burnout_risk != "Low":
    ai_suggestions.append("Take a 15-minute break after your first deep-work block to avoid burnout.")

  reminders = [
    PlannerReminder(
      title=f"You have {pending_today} pending task{'s' if pending_today != 1 else ''} today",
      detail="Focus on the top recommended tasks first.",
      severity="high" if pending_today >= 3 else "medium",
    )
  ] if pending_today else []
  if overdue_tasks:
    reminders.append(
      PlannerReminder(
        title=f"{overdue_tasks} task{'s are' if overdue_tasks != 1 else ' is'} overdue",
        detail="The scheduler moved overdue work to the top of today's plan.",
        severity="high",
      )
    )
  if burnout_risk != "Low":
    reminders.append(
      PlannerReminder(
        title="Burnout risk detected",
        detail="Reduce workload or split the longest task into smaller sessions.",
        severity="medium" if burnout_risk == "Medium" else "high",
      )
    )

  create_or_refresh_reminder(db, current_user, pending_today)

  return PlannerSummary(
    available_minutes=available_minutes,
    planned_minutes=planned_minutes,
    pending_today=pending_today,
    overdue_tasks=overdue_tasks,
    productivity_score=productivity_score,
    completion_rate=completion_rate,
    remaining_workload_minutes=remaining_workload_minutes,
    burnout_risk=burnout_risk,
    adaptive_message=adaptive_message,
    daily_plan=daily_plan,
    ai_suggestions=ai_suggestions,
    reminders=reminders,
    goal_milestones=build_goal_milestones(current_user, ranked_tasks),
    priority_queue=[
      PlannerSuggestion(
        title=task.title,
        reason=f"{task.priority} priority - {task.difficulty} difficulty - {due_label(task)}",
        recommended_minutes=max(30, remaining_minutes(task)),
        priority_score=priority_score(task),
        due_label=due_label(task),
      )
      for task in focus_queue[:6]
    ],
  )


@router.get("/summary", response_model=PlannerSummary)
def planner_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
  if current_user.role != "student":
    raise HTTPException(status_code=403, detail="Planner summary is available for students only")
  summary = build_planner_summary(db, current_user)
  db.commit()
  return summary


@router.post("/rebuild", response_model=PlannerRebuildResponse)
def rebuild_planner(
  payload: PlannerRebuildRequest,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_user),
):
  if current_user.role != "student":
    raise HTTPException(status_code=403, detail="Planner rebuild is available for students only")

  current_user.daily_study_minutes = max(30, payload.daily_study_minutes)
  current_user.burnout_limit_minutes = max(60, payload.burnout_limit_minutes)
  current_user.goal_title = payload.goal_title.strip() if payload.goal_title else None
  current_user.goal_target_date = payload.goal_target_date

  stale_planner_tasks = (
    db.query(Task)
    .filter(
      Task.assigned_to == current_user.id,
      Task.source_type == "planner",
      Task.status == "To Do",
      Task.progress == 0,
    )
    .all()
  )
  for task in stale_planner_tasks:
    db.delete(task)
  db.flush()

  generated_tasks = 0
  for values in build_planner_task_blueprint(current_user):
    db.add(Task(**values))
    generated_tasks += 1

  summary = build_planner_summary(db, current_user)
  db.commit()
  return PlannerRebuildResponse(summary=summary, generated_tasks=generated_tasks)
