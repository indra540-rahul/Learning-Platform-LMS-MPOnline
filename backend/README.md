# Backend Documentation

## Overview

The backend is built with FastAPI and uses a modular router-based structure. It powers authentication, role-based dashboards, tasks, planner logic, mentor assignment, reports, scoped notifications, contact inquiries, and course enrollment records.

## Backend Responsibilities

- authentication and authorization
- OTP reset and OAuth-ready login
- user and role management
- student mentor request and mentor assignment workflow
- mentor feedback storage
- task creation, progress sync, and notifications
- report submission, upload, and mentor/admin feedback
- role-scoped notifications
- dashboard and analytics aggregation
- contact inquiry storage and admin email reply
- payment-order and course-enrollment persistence

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
|   |   |-- contact.py
|   |   |-- courses.py
|   |   |-- dashboard.py
|   |   |-- mentors.py
|   |   |-- notifications.py
|   |   |-- payments.py
|   |   |-- planner.py
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
|-- API_DOCUMENTATION.md
|-- README.md
`-- requirements.txt
```

## Why This Structure Is Good

- `main.py` boots FastAPI, applies startup table/column checks, and registers routers
- `models.py` holds relational entities for auth, mentoring, tasks, reports, notifications, contact, and payments
- `schemas.py` keeps request/response contracts explicit
- `dependencies.py` centralizes auth and role checks
- `routers/` separate business areas cleanly for viva explanation and maintenance
- `mailer.py` isolates SMTP reply logic
- `seed.py` prepares demo accounts for project presentation

## Setup

### 1. Create the MySQL database

```sql
CREATE DATABASE lms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Configure environment variables

```powershell
copy .env.example .env
```

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

## Seeded Demo Users

The backend seeds demo data automatically on startup when needed:

- `admin@example.com`
- `mentor@example.com`
- `student@example.com`
- additional sample student accounts for testing

The three main seeded emails can currently log in with any password for demo convenience.

## Main Database Models

- `User`
- `PasswordResetOTP`
- `Task`
- `Report`
- `Notification`
- `MentorRequest`
- `MentorFeedback`
- `ActivityLog`
- `ContactMessage`
- `PaymentOrder`
- `CourseEnrollment`

## Main API Modules

- `auth.py` for register, login, OTP reset, and OAuth
- `users.py` for profile and user update operations
- `tasks.py` for role-scoped task CRUD and progress updates
- `reports.py` for report submission, review, and upload
- `analytics.py` for overview and performance metrics
- `dashboard.py` for admin, mentor, and student dashboard payloads
- `notifications.py` for scoped inbox read/clear operations
- `mentors.py` for mentor staff, requests, direct assignment, and feedback
- `planner.py` for student planner summary and roadmap rebuild
- `contact.py` for inquiry intake and admin reply
- `payments.py` for payment-order and enrollment persistence
- `courses.py` for backend course catalog data

## Current Role Rules

- `student`
  - cannot create tasks
  - can update only own assigned tasks
  - can use planner endpoints
  - can submit reports and mentor requests

- `mentor`
  - sees only currently assigned students
  - can create tasks only for assigned students
  - can review reports only for assigned students
  - cannot use student planner endpoints

- `admin`
  - manages staff and students
  - can assign and unassign mentors
  - can filter progress analytics by student
  - can review and reply to contact inquiries

## Notes For Final Year Submission

This backend is appropriate for academic evaluation because it demonstrates:

- layered API architecture
- role-based access control
- relational database modeling
- email and OAuth integration readiness
- planner logic integrated with operational task data
- maintainable separation of concerns

## API Reference

Complete API documentation is available in [API_DOCUMENTATION.md](/d:/Project_MPOnline/backend/API_DOCUMENTATION.md).
