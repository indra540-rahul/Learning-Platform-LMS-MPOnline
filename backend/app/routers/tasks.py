from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models import ActivityLog, Notification, Task, User
from ..schemas import TaskCreate, TaskOut, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["Tasks"])
STATUS_PROGRESS_DEFAULTS = {
  "To Do": 0,
  "In Progress": 60,
  "Review": 85,
  "Done": 100,
}


def clamp_progress(value: int | None) -> int:
  if value is None:
    return 0
  return max(0, min(100, int(value)))


def status_from_progress(progress: int) -> str:
  if progress >= 100:
    return "Done"
  if progress >= 80:
    return "Review"
  if progress > 0:
    return "In Progress"
  return "To Do"


def sync_task_state(task: Task, incoming: dict, *, is_create: bool = False):
  has_progress = "progress" in incoming
  has_status = "status" in incoming

  if has_status and not has_progress:
    task.status = incoming["status"]
    task.progress = STATUS_PROGRESS_DEFAULTS.get(task.status, task.progress or 0)
    return

  if has_progress and not has_status:
    task.progress = clamp_progress(incoming["progress"])
    task.status = status_from_progress(task.progress)
    return

  if has_progress and has_status:
    task.progress = clamp_progress(incoming["progress"])
    task.status = incoming["status"]
    if task.progress == 100 or task.status == "Done":
      task.progress = 100
      task.status = "Done"
    elif task.progress == 0 and task.status != "To Do":
      task.status = status_from_progress(task.progress)
    return

  if is_create:
    task.progress = STATUS_PROGRESS_DEFAULTS.get(task.status, 0)


@router.get("", response_model=list[TaskOut])
def list_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
  query = db.query(Task)
  if current_user.role == "student":
    query = query.filter(Task.assigned_to == current_user.id)
  elif current_user.role == "mentor":
    assigned_student_ids = [
      student.id
      for student in db.query(User).filter(User.role == "student", User.assigned_mentor_id == current_user.id).all()
    ]
    query = query.filter(Task.assigned_to.in_(assigned_student_ids)) if assigned_student_ids else query.filter(Task.id == -1)
  return query.order_by(Task.created_at.desc()).all()


@router.post("", response_model=TaskOut)
def create_task(payload: TaskCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
  if current_user.role == "student":
    raise HTTPException(status_code=403, detail="Students cannot create tasks")

  if current_user.role == "mentor":
    if not payload.assigned_to:
      raise HTTPException(status_code=400, detail="Mentors must assign a task to one of their students")
    student = db.get(User, payload.assigned_to)
    if not student or student.role != "student" or student.assigned_mentor_id != current_user.id:
      raise HTTPException(status_code=403, detail="You can only assign tasks to students currently assigned to you")

  values = payload.model_dump()
  task = Task(**values, created_by=current_user.id)
  sync_task_state(task, values, is_create=True)
  db.add(task)
  db.flush()
  if task.assigned_to:
    db.add(Notification(user_id=task.assigned_to, message=f"New task assigned: {task.title}"))
  db.add(ActivityLog(user_id=current_user.id, action=f"Created task {task.title}"))
  db.commit()
  db.refresh(task)
  return task


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(
  task_id: int,
  payload: TaskUpdate,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_user),
):
  task = db.get(Task, task_id)
  if not task:
    raise HTTPException(status_code=404, detail="Task not found")
  if current_user.role == "student" and task.assigned_to != current_user.id:
    raise HTTPException(status_code=403, detail="Cannot update another student's task")
  if current_user.role == "mentor":
    student = db.get(User, task.assigned_to) if task.assigned_to else None
    if not student or student.assigned_mentor_id != current_user.id:
      raise HTTPException(status_code=403, detail="Cannot update tasks outside your assigned students")

  incoming = payload.model_dump(exclude_unset=True)
  previous_assignee = task.assigned_to
  previous_status = task.status
  previous_progress = task.progress

  for key, value in incoming.items():
    setattr(task, key, value)
  sync_task_state(task, incoming)

  if "assigned_to" in incoming and task.assigned_to and task.assigned_to != previous_assignee:
    db.add(Notification(user_id=task.assigned_to, message=f"You have been assigned task: {task.title}"))

  if (("status" in incoming) or ("progress" in incoming)) and task.assigned_to and current_user.id != task.assigned_to:
    db.add(
      Notification(
        user_id=task.assigned_to,
        message=f'Task "{task.title}" updated to {task.progress}% ({task.status}).',
      )
    )

  if current_user.role == "student" and task.created_by and (task.status != previous_status or task.progress != previous_progress):
    recipient_ids = {task.created_by}
    student = db.get(User, current_user.id)
    if student and student.assigned_mentor_id:
      recipient_ids.add(student.assigned_mentor_id)
    for recipient_id in recipient_ids:
      if recipient_id and recipient_id != current_user.id:
        db.add(
          Notification(
            user_id=recipient_id,
            message=f'{current_user.name} updated "{task.title}" to {task.progress}% ({task.status}).',
          )
        )

  db.add(ActivityLog(user_id=current_user.id, action=f"Updated task {task.title}"))
  db.commit()
  db.refresh(task)
  return task


@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
  if current_user.role == "student":
    raise HTTPException(status_code=403, detail="Students cannot delete tasks")

  task = db.get(Task, task_id)
  if not task:
    raise HTTPException(status_code=404, detail="Task not found")
  if current_user.role == "mentor":
    student = db.get(User, task.assigned_to) if task.assigned_to else None
    if not student or student.assigned_mentor_id != current_user.id:
      raise HTTPException(status_code=403, detail="Cannot delete tasks outside your assigned students")
  db.delete(task)
  db.add(ActivityLog(user_id=current_user.id, action=f"Deleted task {task.title}"))
  db.commit()
  return {"deleted": True}
