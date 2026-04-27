# API Documentation

## Base Information

- Base URL: `http://localhost:8000/api`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Authentication: Bearer token in `Authorization` header

Example header:

```http
Authorization: Bearer <access_token>
```

## Authentication Endpoints

### `POST /auth/register`

Registers a new user.

Request body:

```json
{
  "name": "Rahul Kumar",
  "email": "rahul@example.com",
  "password": "secure123",
  "role": "student"
}
```

Response:

```json
{
  "access_token": "string",
  "refresh_token": "string",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "name": "Rahul Kumar",
    "email": "rahul@example.com",
    "role": "student",
    "bio": null,
    "notification_email": true,
    "notification_push": true,
    "created_at": "2026-04-27T10:00:00"
  }
}
```

### `POST /auth/login`

Logs in an existing user.

Request body:

```json
{
  "email": "student@example.com",
  "password": "any-password-for-demo"
}
```

### `GET /auth/me`

Returns the current authenticated user.

Auth required: `Yes`

### `GET /auth/oauth/{provider}`

Starts OAuth login flow.

Supported providers:

- `google`
- `linkedin`

### `GET /auth/oauth/{provider}/callback`

OAuth callback endpoint used by providers after login.

### `POST /auth/forgot-password`

Sends OTP to the user email if the account exists.

Request body:

```json
{
  "email": "student@example.com"
}
```

Response:

```json
{
  "message": "If the email exists, an OTP has been sent."
}
```

### `POST /auth/resend-otp`

Resends password reset OTP.

### `POST /auth/reset-password`

Resets password using email and OTP.

Request body:

```json
{
  "email": "student@example.com",
  "otp": "123456",
  "new_password": "newpass123"
}
```

## User Endpoints

### `GET /users`

Returns all users.

Auth required: `Yes`

Allowed roles:

- `admin`
- `mentor`

### `GET /users/{user_id}`

Returns a single user by ID.

Rules:

- students can only view their own profile
- admin and mentor can view other users

### `PATCH /users/me`

Updates the current user profile.

Request body example:

```json
{
  "name": "Updated Name",
  "bio": "Final year student working on LMS project",
  "notification_email": true,
  "notification_push": false
}
```

## Task Endpoints

### `GET /tasks`

Returns tasks.

Rules:

- students only see tasks assigned to them
- admin and mentor can see all tasks

### `POST /tasks`

Creates a task.

Auth required: `Yes`

Allowed roles:

- `admin`
- `mentor`

Request body:

```json
{
  "title": "Complete API testing",
  "description": "Test all endpoints using Postman",
  "status": "To Do",
  "priority": "High",
  "tags": "api,testing",
  "assigned_to": 3,
  "due_date": "2026-05-05T12:00:00"
}
```

### `PATCH /tasks/{task_id}`

Updates a task.

Rules:

- students can update only tasks assigned to them
- admin and mentor can update tasks

### `DELETE /tasks/{task_id}`

Deletes a task.

Allowed roles:

- `admin`
- `mentor`

Response:

```json
{
  "deleted": true
}
```

## Report Endpoints

### `GET /reports`

Returns reports.

Rules:

- students only see their own reports
- admin and mentor can see all reports

### `POST /reports`

Submits a report for the logged-in student.

Request body:

```json
{
  "content": "# Weekly Report\n\nCompleted React dashboard and API integration."
}
```

### `POST /reports/{report_id}/feedback`

Adds mentor/admin feedback to a report.

Allowed roles:

- `admin`
- `mentor`

Request body:

```json
{
  "feedback": "Good work. Add more testing evidence."
}
```

### `POST /reports/{report_id}/upload`

Uploads a file for a report using `multipart/form-data`.

Field:

- `file`

Rules:

- students can upload only to their own reports
- admin and mentor can upload

## Analytics Endpoints

### `GET /analytics/overview`

Returns summary numbers:

- total users
- total students
- total mentors
- total tasks
- done tasks
- submitted reports
- unread notifications

Allowed roles:

- `admin`
- `mentor`
- `student`

### `GET /analytics/performance`

Returns performance chart data.

Allowed roles:

- `admin`
- `mentor`
- `student`

## Notification Endpoints

### `GET /notifications`

Returns notifications.

Rules:

- admin can see all notifications
- mentor and student only see their own notifications

### `PATCH /notifications/{notification_id}/read`

Marks a notification as read.

Rules:

- admin can update any notification
- other users can update only their own notification

## Dashboard Endpoints

### `GET /dashboard/{role}`

Returns dashboard data for the requested role.

Typical role values:

- `admin`
- `mentor`
- `student`

Response includes role-specific stats plus task/report data used by the frontend dashboards.

## Health Endpoint

### `GET /health`

Checks whether the API is running.

Response:

```json
{
  "status": "ok",
  "service": "Learning Platform with Smart Study Planner"
}
```

## Status Codes

Common status codes used by the API:

- `200` success
- `400` bad request
- `401` unauthorized
- `403` forbidden
- `404` not found
- `503` provider not configured

## Roles Summary

- `admin` has maximum access
- `mentor` can manage students, tasks, reports, and analytics
- `student` can manage their own profile, tasks, reports, and dashboard data

## Notes

- demo seeded accounts are available for project presentation
- FastAPI automatically generates live API docs from the route definitions
- uploaded report files are stored in the folder configured by `UPLOAD_DIR`
