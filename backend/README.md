# Backend Documentation

## Overview

This backend is built with FastAPI and follows a modular structure that is fully acceptable for a final year project. Splitting logic into files such as `models.py`, `schemas.py`, `database.py`, `security.py`, and router modules is a good software engineering practice because it improves readability, testing, and maintenance.

## Backend Responsibilities

- authentication and authorization
- user management
- task management
- report submission and feedback
- notifications
- analytics
- role-based dashboard data
- password reset with OTP
- OAuth integration
- file upload handling
- email sending

## Tech Stack

- FastAPI
- SQLAlchemy
- MySQL
- PyMySQL
- Pydantic
- Python-Jose
- Passlib
- HTTPX
- Python Multipart

## Project Structure

```text
backend/
|-- app/
|   |-- routers/
|   |   |-- analytics.py
|   |   |-- auth.py
|   |   |-- dashboard.py
|   |   |-- notifications.py
|   |   |-- reports.py
|   |   |-- tasks.py
|   |   `-- users.py
|   |-- config.py
|   |-- database.py
|   |-- dependencies.py
|   |-- mailer.py
|   |-- main.py
|   |-- models.py
|   |-- schemas.py
|   |-- security.py
|   `-- seed.py
|-- .env.example
|-- README.md
|-- API_DOCUMENTATION.md
`-- requirements.txt
```

## Why This Structure Is Good

- `main.py` starts the FastAPI app and registers routers
- `config.py` stores environment-based settings
- `database.py` manages SQLAlchemy engine, session, and base
- `models.py` defines database tables
- `schemas.py` defines request and response models
- `security.py` handles hashing and token creation
- `dependencies.py` centralizes auth and role checks
- `routers/` keeps endpoint groups separated by feature
- `seed.py` provides demo data for presentation/testing
- `mailer.py` isolates email logic

This separation makes the project easier to explain in report writing, SRS/design documentation, and viva.

## Setup

### 1. Create the MySQL database

```sql
CREATE DATABASE lms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Configure environment variables

```powershell
copy .env.example .env
```

Then update values in `.env` if needed.

### 3. Install dependencies

```powershell
python -m venv venv
venv\Scripts\activate
python -m pip install --upgrade pip setuptools wheel
pip install --only-binary=:all: -r requirements.txt
```

### 4. Run the backend

```powershell
uvicorn app.main:app --reload
```

Backend API base URL:

```text
http://localhost:8000/api
```

Swagger UI:

```text
http://localhost:8000/docs
```

ReDoc:

```text
http://localhost:8000/redoc
```

## Environment Variables

Example variables used by the backend:

```env
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/lms_db
SECRET_KEY=replace-with-a-long-random-secret
REFRESH_SECRET_KEY=replace-with-a-different-long-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
UPLOAD_DIR=uploads
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-email-password
SMTP_FROM=no-reply@lms.com
```

## Authentication Flow

- Registration returns access and refresh tokens
- Login returns access and refresh tokens
- Protected routes require `Authorization: Bearer <token>`
- Roles used in the project are `admin`, `mentor`, and `student`

## Seeded Demo Users

The backend seeds demo users on startup when the database is empty:

- `admin@example.com`
- `mentor@example.com`
- `student@example.com`
- `ananya@example.com`
- `rahul@example.com`

For presentation convenience, the current security logic allows the three main demo emails to log in with any password.

## Main Database Models

- `User`
- `PasswordResetOTP`
- `Task`
- `Report`
- `Notification`
- `ActivityLog`

## Main API Modules

- `auth.py` for auth, OTP reset, and OAuth
- `users.py` for profile and user listing
- `tasks.py` for task CRUD
- `reports.py` for report submission, feedback, and upload
- `notifications.py` for notifications
- `analytics.py` for overview and performance
- `dashboard.py` for role-specific dashboard data

## Notes For Final Year Submission

This backend design is appropriate because it demonstrates:

- layered architecture
- REST API design
- role-based security
- database modeling
- third-party integration readiness
- production-style project organization

## API Reference

Complete API documentation is available in [API_DOCUMENTATION.md](/d:/Project_MPOnline/backend/API_DOCUMENTATION.md).
