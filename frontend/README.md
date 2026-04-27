# Frontend Documentation

## Overview

This frontend is built with React and Vite. It provides the public pages, authentication page, course browsing flow, and separate dashboards for student, mentor, and admin users.

## Main Features

- landing page and marketing pages
- authentication UI
- OAuth redirect handling
- student dashboard
- mentor dashboard
- admin dashboard
- course catalog and checkout flow
- API integration through Axios
- route protection based on role

## Tech Stack

- React 18
- Vite
- React Router DOM
- Axios
- Framer Motion
- Recharts
- Lucide React

## Folder Structure

```text
frontend/
|-- public/
|-- src/
|   |-- assets/
|   |-- components/
|   |-- context/
|   |-- data/
|   |-- hooks/
|   |-- layouts/
|   |-- pages/
|   |   `-- dashboard/
|   |-- routes/
|   |-- services/
|   |-- App.jsx
|   `-- main.jsx
|-- package.json
`-- README.md
```

## Setup

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

## Environment Variable

Create `frontend/.env` if you want to override the API URL:

```env
VITE_API_URL=http://localhost:8000/api
```

If not provided, the frontend uses:

```text
http://localhost:8000/api
```

## Pages And Routes

### Public Routes

- `/` - Home page
- `/about` - About page
- `/contact` - Contact page
- `/courses` - Course catalog
- `/checkout` - Checkout page
- `/auth` - Login, signup, OTP reset, and OAuth redirect landing

### Protected Routes

- `/admin/*` - Admin dashboard
- `/mentor/*` - Mentor dashboard
- `/user/*` - Student dashboard

## Role-Based Dashboards

### Student

- overview dashboard
- study planner
- task manager
- my courses
- reports/resources
- analytics
- notifications
- settings

### Mentor

- overview
- students
- calendar
- analytics
- notifications/help
- tasks
- reports review
- settings

### Admin

- overview
- users
- tasks/planner
- reports
- analytics
- notifications
- settings
- security section

## API Integration

All API calls are centralized in:

[src/services/api.js](/d:/Project_MPOnline/frontend/src/services/api.js)

This service handles:

- backend base URL
- attaching JWT access token
- request helpers for auth, users, tasks, reports, analytics, notifications, and dashboards
- unified error handling

## Authentication Handling

- user data is stored in local storage as `lumina_user`
- access token is stored as `lms_access_token`
- refresh token is stored as `lms_refresh_token`
- `ProtectedRoute` prevents unauthorized role access
- OAuth callback tokens are read from the `/auth` page query string

## Important Components

- `routes/AppRoutes.jsx` defines public and protected routes
- `routes/ProtectedRoute.jsx` guards dashboard routes
- `context/AuthContext.jsx` manages auth state
- `services/api.js` manages backend communication

## Build For Production

```powershell
npm run build
```

Preview the production build:

```powershell
npm run preview
```

## Final Year Project Value

This frontend is strong for a final year project because it demonstrates:

- component-based UI development
- route-based application architecture
- protected navigation
- API integration with backend
- role-specific interface design
- dashboard-style data presentation
