from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models import ActivityLog, Notification, Task, User
from ..schemas import TaskCreate, TaskOut, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("", response_model=list[TaskOut])
def list_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
  query = db.query(Task)
  if current_user.role == "student":
    query = query.filter(Task.assigned_to == current_user.id)
  return query.order_by(Task.created_at.desc()).all()


@router.post("", response_model=TaskOut)
def create_task(payload: TaskCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
  if current_user.role == "student":
    raise HTTPException(status_code=403, detail="Students cannot create tasks")

  task = Task(**payload.model_dump(), created_by=current_user.id)
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

  for key, value in payload.model_dump(exclude_unset=True).items():
    setattr(task, key, value)
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
  db.delete(task)
  db.add(ActivityLog(user_id=current_user.id, action=f"Deleted task {task.title}"))
  db.commit()
  return {"deleted": True}
