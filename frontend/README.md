# Frontend Documentation

## Overview

The frontend is built with React and Vite. It includes the public website, compact auth experience, course browsing, and role-based workspaces for `student`, `mentor`, and `admin`.

## Main Features

- public landing and marketing pages
- compact auth page with login, signup, and OTP reset
- role-aware protected routing
- student dashboard with planner, task manager, mentor desk, reports, and courses
- mentor dashboard with overview, students, calendar, analytics, notifications, reports, and settings
- admin dashboard with users, mentors, planner/task board, reports, inquiries, analytics, notifications, and settings
- centralized API communication through Axios

## Tech Stack

- React 18
- Vite
- React Router DOM
- Axios
- Recharts
- Lucide React
- Framer Motion

## Folder Structure

```text
frontend/
|-- public/
|-- src/
|   |-- assets/
|   |-- components/
|   |-- context/
|   |-- hooks/
|   |-- layouts/
|   |-- pages/
|   |   |-- dashboard/
|   |   `-- Auth.*
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

Optional frontend env:

```env
VITE_API_URL=http://localhost:8000/api
```

Default fallback:

```text
http://localhost:8000/api
```

## Pages And Routes

### Public Routes

- `/` - home
- `/about` - about page
- `/contact` - contact page
- `/courses` - course catalog
- `/checkout` - cart / checkout flow
- `/auth` - sign in, sign up, OTP reset, and OAuth callback handling

### Protected Routes

- `/admin/*` - admin dashboard
- `/mentor/*` - mentor dashboard
- `/user/*` - student dashboard

## Role-Based Dashboards

### Student

- overview
- study planner
- task manager
- mentor desk
- my courses
- reports
- analytics
- notifications
- account settings

### Mentor

- overview summary
- my students
- calendar / agenda
- analytics for assigned students
- notifications
- task board support through student actions
- reports review
- profile settings

### Admin

- overview
- users
- mentors and staff directory
- task board / planner
- reports studio
- progress analytics
- notifications
- inquiries
- account settings

## API Integration

All API calls are centralized in:

[src/services/api.js](/d:/Project_MPOnline/frontend/src/services/api.js)

This layer handles:

- base URL configuration
- bearer token attachment
- auth methods
- task / report / planner / mentor / inquiry requests
- analytics and dashboard data loading
- consistent error propagation

## Authentication Handling

- current user is stored as `lumina_user`
- access token is stored as `lms_access_token`
- refresh token is stored as `lms_refresh_token`
- `ProtectedRoute` enforces role access
- OAuth callback data is read on `/auth`

## Important Components

- `routes/AppRoutes.jsx`
- `routes/ProtectedRoute.jsx`
- `context/AuthContext.jsx`
- `services/api.js`
- `pages/dashboard/components/DashboardFeatures.jsx`

## Build For Production

```powershell
npm run build
```

Preview the build:

```powershell
npm run preview
```

## Final Year Project Value

This frontend demonstrates:

- route-based SPA architecture
- role-specific dashboard UX
- reusable component patterns
- secure protected navigation
- live backend integration
- analytics-oriented UI design
