import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()


class Settings:
  PROJECT_NAME = "Learning Platform with Smart Study Planner"
  API_PREFIX = "/api"
  SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret-key-in-production")
  REFRESH_SECRET_KEY = os.getenv("REFRESH_SECRET_KEY", "change-this-refresh-secret-in-production")
  ALLOW_DEMO_PASSWORDS = os.getenv("ALLOW_DEMO_PASSWORDS", "false").strip().lower() == "true"
  ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
  REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
  ALGORITHM = "HS256"
  DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:password@localhost:3306/lms_db",
  )
  CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
  ]
  BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
  FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
  UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
  GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
  GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
  FACEBOOK_CLIENT_ID = os.getenv("FACEBOOK_CLIENT_ID", "")
  FACEBOOK_CLIENT_SECRET = os.getenv("FACEBOOK_CLIENT_SECRET", "")
  SMTP_HOST = os.getenv("SMTP_HOST", "")
  SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
  SMTP_USER = os.getenv("SMTP_USER", "")
  SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
  SMTP_FROM = os.getenv("SMTP_FROM", "no-reply@lumina-lms.local")
  RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
  RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")

  @property
  def access_delta(self):
    return timedelta(minutes=self.ACCESS_TOKEN_EXPIRE_MINUTES)

  @property
  def refresh_delta(self):
    return timedelta(days=self.REFRESH_TOKEN_EXPIRE_DAYS)


settings = Settings()
