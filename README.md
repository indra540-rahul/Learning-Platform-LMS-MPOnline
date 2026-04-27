# Learning Platform With Smart Study Planner

Full-stack final year project built with React, Vite, FastAPI, SQLAlchemy, JWT authentication, and MySQL. The project combines LMS-style features with a smart study workflow, including role-based dashboards, task planning, report submission, notifications, analytics, and OAuth-ready authentication.

## Project Overview

This project is suitable for a final year submission because it demonstrates:

- full-stack development with a separate frontend and backend
- modular backend architecture using `models.py`, `schemas.py`, `database.py`, `routers/`, and shared dependencies
- authentication and authorization with JWT and role-based access
- database integration with MySQL and SQLAlchemy ORM
- REST API development and API documentation
- responsive frontend dashboards for `admin`, `mentor`, and `student`
- optional integrations such as Google OAuth, LinkedIn OAuth, file upload, and SMTP email

Keeping separate files like `backend/app/models.py`, `schemas.py`, and `database.py` is not only okay for a final year project, it is the better structure. It makes the codebase cleaner, easier to explain in viva/demo, and easier to maintain.

## Main Features

- User registration and login
- JWT-based authentication
- Role-based dashboards for admin, mentor, and student
- Task creation, assignment, update, and deletion
- Study planning and task tracking
- Weekly report submission and mentor feedback
- Notification center
- Analytics overview and performance tracking
- Password reset using OTP
- OAuth login flow for Google and LinkedIn
- Course catalog and checkout-oriented frontend flow

## Tech Stack

### Frontend

- React 18
- Vite
- React Router
- Axios
- Framer Motion
- Lucide React
- Recharts

### Backend

- FastAPI
- SQLAlchemy
- MySQL
- PyMySQL
- Pydantic
- Python-Jose
- Passlib
- HTTPX

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
|   |-- README.md
|   |-- API_DOCUMENTATION.md
|   `-- requirements.txt
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- components/
|   |   |-- context/
|   |   |-- data/
|   |   |-- hooks/
|   |   |-- layouts/
|   |   |-- pages/
|   |   |-- routes/
|   |   `-- services/
|   |-- README.md
|   `-- package.json
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

Create the database before starting:

```sql
CREATE DATABASE lms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Backend base URL:

```text
http://localhost:8000/api
```

FastAPI Swagger docs:

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

If needed, create `frontend/.env` and set:

```env
VITE_API_URL=http://localhost:8000/api
```

## Demo Accounts

These demo users are seeded automatically:

- `admin@example.com`
- `mentor@example.com`
- `student@example.com`

Note: in the current backend logic, these seeded demo emails can log in with any password for presentation/demo convenience.

## Environment Variables

Backend uses these environment variables:

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

Main API groups:

- `/api/auth`
- `/api/users`
- `/api/tasks`
- `/api/reports`
- `/api/analytics`
- `/api/notifications`
- `/api/dashboard`

Detailed endpoint documentation is available in [backend/API_DOCUMENTATION.md](/d:/Project_MPOnline/backend/API_DOCUMENTATION.md).

## Academic Value

This project is strong for a final year project because it includes:

- frontend and backend separation
- secure login flow
- database design and ORM usage
- role-based features
- API integration
- file handling and email flow
- modular code organization

## Important Before Pushing To GitHub

- Keep `.env`, `venv`, `node_modules`, uploads, and cache files out of Git.
- Never commit real client secrets, SMTP passwords, or private tokens.
- Use `backend/.env.example` only with placeholder values.

## Documentation Files

- Overall project: [README.md](/d:/Project_MPOnline/README.md)
- Backend setup: [backend/README.md](/d:/Project_MPOnline/backend/README.md)
- Backend API reference: [backend/API_DOCUMENTATION.md](/d:/Project_MPOnline/backend/API_DOCUMENTATION.md)
- Frontend setup: [frontend/README.md](/d:/Project_MPOnline/frontend/README.md)
