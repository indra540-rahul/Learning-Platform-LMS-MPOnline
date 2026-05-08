# Learning Platform With Smart Study Planner

Full-stack LMS project built with React, Vite, FastAPI, SQLAlchemy, JWT authentication, and MySQL. The platform now supports distinct `student`, `mentor`, and `admin` workspaces with backend-driven planning, mentor assignment, report review, scoped analytics, inquiry handling, notifications, and course enrollment flow.

## Project Overview

This project combines:

- role-based dashboards for `student`, `mentor`, and `admin`
- smart study planning with roadmap rebuild into real task records
- mentor request, assignment, unassignment, and feedback workflow
- task management with Kanban-style progress tracking
- weekly report submission, attachment upload, and mentor/admin feedback
- scoped notifications and analytics per role
- course catalog, checkout-oriented payment flow, and enrolled-course experience
- OTP password reset and OAuth-ready authentication
- admin inquiry desk with reply-by-email support

## Key Functional Areas

### Student

- view progress dashboard and live snapshot
- use Study Planner and rebuild roadmap into tasks
- update task progress and time spent
- request a mentor and see assigned mentor details
- submit mentor feedback
- submit reports and upload attachments
- view purchased courses and continue learning

### Mentor

- see assigned students only
- create tasks for assigned students
- review student reports and give feedback
- monitor assigned-student analytics only
- use a mentor-specific calendar / agenda view
- receive scoped notifications from assigned students

### Admin

- manage students, mentors, and admins
- add and remove staff
- assign or unassign mentors
- review reports and analytics
- handle contact inquiries and email replies
- review mentor feedback and staff performance context

## Tech Stack

### Frontend

- React 18
- Vite
- React Router
- Axios
- Lucide React
- Recharts
- Framer Motion

### Backend

- FastAPI
- SQLAlchemy
- MySQL
- PyMySQL
- Pydantic
- Python-Jose
- Passlib
- HTTPX

## Current Architecture Highlights

- `student` planner is backend-driven and persists roadmap tasks into the `tasks` table
- `mentor` data is scoped to currently assigned students
- `admin` overview, inquiries, mentor desk, staff directory, and filtered progress analytics are backend-driven
- notifications are now user-scoped and filtered by role relevance
- mentor feedback and contact replies are stored in the database

## Folder Structure

```text
Project_MPOnline/
|-- backend/
|   |-- app/
|   |   |-- routers/
|   |   |-- config.py
|   |   |-- database.py
|   |   |-- dependencies.py
|   |   |-- mailer.py
|   |   |-- main.py
|   |   |-- models.py
|   |   |-- schemas.py
|   |   |-- security.py
|   |   `-- seed.py
|   |-- .env.example
|   |-- API_DOCUMENTATION.md
|   |-- README.md
|   `-- requirements.txt
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- components/
|   |   |-- context/
|   |   |-- layouts/
|   |   |-- pages/
|   |   |-- routes/
|   |   `-- services/
|   |-- README.md
|   `-- package.json
|-- Documentation/
|   `-- Md/
|       |-- LMS_Block_Diagram.mmd
|       |-- LMS_DFD_Diagram.mmd
|       |-- LMS_ER_Diagram_Mermaid.mmd
|       |-- LMS_ER_Diagram.dbml
|       |-- LMS_Class_Diagram.puml
|       |-- LMS_Use_Case_Diagram.puml
|       |-- LMS_Task_Update_Sequence.puml
|       |-- SRS.md
|       |-- System_Design.md
|       `-- User_Guide.md
`-- .gitignore
```

## Setup

### 1. Backend

```powershell
cd backend
copy .env.example .env
python -m venv venv
venv\Scripts\activate
python -m pip install --upgrade pip setuptools wheel
pip install --only-binary=:all: -r requirements.txt
uvicorn app.main:app --reload
```

Create the database first:

```sql
CREATE DATABASE lms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Backend base URL:

```text
http://localhost:8000/api
```

Swagger UI:

```text
http://localhost:8000/docs
```

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend base URL:

```text
http://localhost:5173
```

Optional frontend env:

```env
VITE_API_URL=http://localhost:8000/api
```

## Demo Accounts

Seeded demo users include:

- `admin@example.com`
- `mentor@example.com`
- `student@example.com`

For demo convenience, the current backend allows the three main seeded emails above to log in with any password.

## Environment Variables

Important backend variables:

- `DATABASE_URL`
- `SECRET_KEY`
- `REFRESH_SECRET_KEY`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `REFRESH_TOKEN_EXPIRE_DAYS`
- `CORS_ORIGINS`
- `BACKEND_URL`
- `FRONTEND_URL`
- `UPLOAD_DIR`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`

## API Summary

Main backend groups:

- `/api/auth`
- `/api/users`
- `/api/tasks`
- `/api/reports`
- `/api/analytics`
- `/api/dashboard`
- `/api/notifications`
- `/api/mentors`
- `/api/planner`
- `/api/contact`
- `/api/payments`
- `/api/courses`

Detailed API reference: [backend/API_DOCUMENTATION.md](/d:/Project_MPOnline/backend/API_DOCUMENTATION.md)

## Documentation Files

- Project overview: [README.md](/d:/Project_MPOnline/README.md)
- Backend guide: [backend/README.md](/d:/Project_MPOnline/backend/README.md)
- Frontend guide: [frontend/README.md](/d:/Project_MPOnline/frontend/README.md)
- API reference: [backend/API_DOCUMENTATION.md](/d:/Project_MPOnline/backend/API_DOCUMENTATION.md)
- System design: [Documentation/Md/System_Design.md](/d:/Project_MPOnline/Documentation/Md/System_Design.md)
- SRS: [Documentation/Md/SRS.md](/d:/Project_MPOnline/Documentation/Md/SRS.md)
- User guide: [Documentation/Md/User_Guide.md](/d:/Project_MPOnline/Documentation/Md/User_Guide.md)
- Block diagram: [Documentation/Md/LMS_Block_Diagram.mmd](/d:/Project_MPOnline/Documentation/Md/LMS_Block_Diagram.mmd)
- DFD: [Documentation/Md/LMS_DFD_Diagram.mmd](/d:/Project_MPOnline/Documentation/Md/LMS_DFD_Diagram.mmd)
- ER diagram: [Documentation/Md/LMS_ER_Diagram_Mermaid.mmd](/d:/Project_MPOnline/Documentation/Md/LMS_ER_Diagram_Mermaid.mmd)
- Class diagram: [Documentation/Md/LMS_Class_Diagram.puml](/d:/Project_MPOnline/Documentation/Md/LMS_Class_Diagram.puml)
- Use case diagram: [Documentation/Md/LMS_Use_Case_Diagram.puml](/d:/Project_MPOnline/Documentation/Md/LMS_Use_Case_Diagram.puml)
- Sequence diagram: [Documentation/Md/LMS_Task_Update_Sequence.puml](/d:/Project_MPOnline/Documentation/Md/LMS_Task_Update_Sequence.puml)

## Academic Value

This project is strong for final-year evaluation because it demonstrates:

- modular frontend and backend separation
- role-based authorization
- real database modeling and ORM usage
- planner-to-task persistence
- notification workflows
- inquiry and feedback workflows
- dashboard analytics and scoped mentor operations

## Important Before Pushing

- keep `.env`, `venv`, `node_modules`, uploads, and secrets out of Git
- never commit real OAuth or SMTP credentials
- use placeholder values in `.env.example`

VIDEO LINK: https://drive.google.com/file/d/1koY3vx7uPsOwEzRsdkWqSzSOqzoVRDg_/view?usp=drive_link
