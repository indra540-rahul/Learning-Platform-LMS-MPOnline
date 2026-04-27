from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, SessionLocal, engine
from .routers import analytics, auth, dashboard, notifications, reports, tasks, users
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
