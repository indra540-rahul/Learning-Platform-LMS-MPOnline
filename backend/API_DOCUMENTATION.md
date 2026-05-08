# API Documentation

## Base Information

- Base URL: `http://localhost:8000/api`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Authentication: `Authorization: Bearer <access_token>`

## Authentication

### `POST /auth/register`

Register a new user and receive tokens.

### `POST /auth/login`

Login with email and password.

### `GET /auth/me`

Return current authenticated user.

### `GET /auth/oauth/{provider}`

Start OAuth flow.

Supported providers:

- `google`
- `linkedin`

### `GET /auth/oauth/{provider}/callback`

OAuth callback.

### `POST /auth/forgot-password`

Request OTP reset email.

### `POST /auth/resend-otp`

Resend OTP.

### `POST /auth/reset-password`

Reset password with email, OTP, and new password.

## Users

### `GET /users`

Role behavior:

- `admin`: all users
- `mentor`: assigned students only
- `student`: forbidden

### `GET /users/{user_id}`

Return a user profile according to role rules.

### `PATCH /users/me`

Update current profile and account settings.

### `PATCH /users/{user_id}`

Admin-only update of another user.

## Tasks

### `GET /tasks`

Role behavior:

- `student`: own assigned tasks
- `mentor`: tasks belonging to currently assigned students
- `admin`: all tasks

### `POST /tasks`

Create a task.

Role behavior:

- `admin`: can assign broadly
- `mentor`: only for currently assigned students
- `student`: forbidden

### `PATCH /tasks/{task_id}`

Update task status, progress, time spent, and metadata.

Role behavior:

- `student`: own assigned tasks only
- `mentor`: scoped student tasks
- `admin`: any task

### `DELETE /tasks/{task_id}`

Delete a task.

Allowed roles:

- `admin`
- `mentor`

## Reports

### `GET /reports`

Role behavior:

- `student`: own reports
- `mentor`: assigned-student reports only
- `admin`: all reports

### `POST /reports`

Student submits a report.

### `POST /reports/{report_id}/feedback`

Mentor or admin adds review feedback.

### `POST /reports/{report_id}/upload`

Upload attachment to a report.

## Analytics

### `GET /analytics/overview`

Returns summary metrics.

Supports optional admin / mentor scoped filtering logic used by dashboards.

### `GET /analytics/performance`

Returns chart-ready grouped performance data.

## Dashboard

### `GET /dashboard/admin/overview`

Admin-specific overview payload.

Supports student filtering for the progress workspace.

### `GET /dashboard/{role}`

Return role-specific dashboard payload for:

- `admin`
- `mentor`
- `student`

## Notifications

### `GET /notifications`

Returns user-scoped notifications.

Important behavior:

- admin sees admin-targeted records for own account
- mentor sees only relevant current assigned-student alerts
- student sees own planner, task, report, and mentor-related alerts

### `PATCH /notifications/{notification_id}/read`

Mark a notification as read.

### `DELETE /notifications/{notification_id}`

Clear a notification.

## Mentors

### `GET /mentors`

Admin directory of mentors and admins.

### `POST /mentors`

Admin creates mentor or admin staff.

### `GET /mentors/requests`

Returns mentor requests for admin management.

### `POST /mentors/requests`

Student sends mentor request.

### `POST /mentors/requests/{request_id}/assign`

Admin assigns mentor to request.

### `DELETE /mentors/requests/{request_id}/assign`

Admin unassigns mentor from request and resets request state.

### `GET /mentors/me/assigned`

Student gets currently assigned mentor.

### `GET /mentors/feedback`

Admin reads submitted mentor feedback.

### `POST /mentors/feedback`

Student submits mentor feedback.

### `DELETE /mentors/{user_id}`

Admin deletes mentor or admin staff user.

## Planner

### `GET /planner/summary`

Student-only endpoint returning:

- planner cards
- reminders
- AI suggestions
- roadmap
- priority queue

### `POST /planner/rebuild`

Student-only endpoint that rebuilds roadmap and persists planner tasks into the main task table.

## Contact

### `GET /contact`

Admin-only inquiry listing.

### `POST /contact`

Public or authenticated inquiry submission.

### `POST /contact/{message_id}/reply`

Admin reply to inquiry, stored in database and emailed through SMTP if configured.

## Payments

### `GET /payments/enrollments`

Return current user course enrollments.

### `POST /payments/razorpay/order`

Create payment-order record for checkout.

### `POST /payments/razorpay/verify`

Verify payment and persist enrollment data.

## Courses

### `GET /courses`

Return backend course catalog list.

## Health

### `GET /health`

Basic API health check.

## Roles Summary

- `admin`: staff management, analytics, inquiries, reports, mentor assignment
- `mentor`: assigned-student tasks, analytics, notifications, reports
- `student`: planner, progress, reports, mentor desk, courses

## Notes

- seeded demo users are available for presentation
- Swagger remains the best source for exact live request/response schema
- uploaded report files are stored in the directory configured by `UPLOAD_DIR`
