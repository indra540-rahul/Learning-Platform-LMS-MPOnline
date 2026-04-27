import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart2,
  Bell,
  Calendar,
  FileText,
  HelpCircle,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MessageSquare,
  Settings,
  Star,
  User,
  Users,
} from "lucide-react";
import "./MentorDashboard.css";
import { useAuth } from "../../hooks/useAuth";
import {
  AnalyticsPage,
  NotificationsPage,
  PlannerPage,
  ReportsPage,
  SettingsPage,
  TasksPage,
  UsersPage,
} from "./components/DashboardFeatures";

const performanceBarsByRange = {
  Week: [
    { label: "Mon", value: 42 },
    { label: "Tue", value: 58 },
    { label: "Wed", value: 70 },
    { label: "Thu", value: 92 },
    { label: "Fri", value: 76 },
    { label: "Sat", value: 44 },
    { label: "Sun", value: 31 },
  ],
  Month: [
    { label: "W1", value: 56 },
    { label: "W2", value: 68 },
    { label: "W3", value: 88 },
    { label: "W4", value: 74 },
  ],
  Year: [
    { label: "Q1", value: 61 },
    { label: "Q2", value: 78 },
    { label: "Q3", value: 83 },
    { label: "Q4", value: 72 },
  ],
};

const activityRows = [
  { student: "Sarah Jenkins", avatar: "SJ", course: "UX Advanced Principles", status: "Completed", score: "98%", time: "2 mins ago" },
  { student: "David Miller", avatar: "DM", course: "Python for Data Science", status: "Pending Review", score: "--", time: "15 mins ago" },
  { student: "Elena Rodriguez", avatar: "ER", course: "Product Strategy 101", status: "In Progress", score: "64%", time: "1 hour ago" },
];

const sessions = [
  { day: "OCT", date: "24", title: "Mentorship Sync #14", meta: "Student: Marcus Aurelius", time: "14:00", active: true },
  { day: "OCT", date: "25", title: "UX Portfolio Review", meta: "Student: Jennifer Smith", time: "09:30" },
  { day: "OCT", date: "25", title: "Advanced Algorithms Q&A", meta: "Group Session (12 students)", time: "16:00" },
];

const MentorOverview = ({ onNavigate }) => {
  const [chartRange, setChartRange] = useState("Week");
  const visiblePerformanceBars = performanceBarsByRange[chartRange] || performanceBarsByRange.Week;
  const visibleSessions = chartRange === "Week"
    ? sessions
    : chartRange === "Month"
      ? [...sessions, { day: "NOV", date: "02", title: "Frontend Sprint Clinic", meta: "Group Session (8 students)", time: "11:00" }]
      : [...sessions, { day: "DEC", date: "09", title: "Year-End Masterclass", meta: "All enrolled students", time: "18:00" }];

  return (
    <div className="mentor-shot">
      <div className="mentor-shot-header">
        <div>
          <h1>Welcome back, Marcus</h1>
          <p>Here is what's happening with your students today.</p>
        </div>
        <button className="sync-pill" onClick={() => onNavigate("/mentor/notifications")}>
          <Bell size={16} />
          <span>SYNC<br /><strong>In 12 minutes</strong></span>
        </button>
      </div>

      <div className="mentor-stat-grid">
        <div className="mentor-stat bordered-blue">
          <div className="stat-top"><User size={18} /><span className="green-note">+12%</span></div>
          <small>Total Students</small>
          <strong>1,248</strong>
        </div>
        <div className="mentor-stat bordered-blue">
          <div className="stat-top"><Star size={18} /><span className="blue-note">Stable</span></div>
          <small>Avg Course Rating</small>
          <strong>4.9 / 5.0</strong>
        </div>
        <div className="mentor-stat">
          <div className="stat-top"><MessageSquare size={18} /><span className="orange-note">3 live</span></div>
          <small>Active Sessions</small>
          <strong>18</strong>
        </div>
        <div className="mentor-stat bordered-red">
          <div className="stat-top"><FileText size={18} /><span className="red-note">High Priority</span></div>
          <small>Pending Submissions</small>
          <strong>42</strong>
        </div>
      </div>

      <div className="mentor-main-grid">
        <section className="mentor-panel performance-panel">
          <div className="panel-head">
            <h3>Student Performance</h3>
            <div className="range-tabs">
              {["Week", "Month", "Year"].map((item) => (
                <button className={chartRange === item ? "active" : ""} onClick={() => setChartRange(item)} key={item}>{item}</button>
              ))}
            </div>
          </div>
          <div className="mentor-bars">
            {visiblePerformanceBars.map((bar, index) => (
              <div className="bar-slot" key={`${chartRange}-${bar.label}`} title={`${bar.label}: ${bar.value}% performance`}>
                <span style={{ height: `${bar.value}%` }} className={index === 2 ? "hot" : ""} />
                <small>{bar.label}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="mentor-panel sessions-panel">
          <div className="panel-head">
            <h3>Upcoming<br />Sessions</h3>
            <Calendar size={18} />
          </div>
          {visibleSessions.map((session) => (
            <div className={`session-card ${session.active ? "active" : ""}`} key={session.title}>
              <div className="date-box"><span>{session.day}</span><strong>{session.date}</strong></div>
              <div>
                <strong>{session.title}</strong>
                <p>{session.meta}</p>
                <div className="avatar-stack"><i /> <i /> <i /></div>
              </div>
              <time>{session.time}</time>
            </div>
          ))}
          <button className="outline-action" onClick={() => onNavigate("/mentor/calendar")}>Go to Calendar</button>
          <button className="float-add" onClick={() => onNavigate("/mentor/tasks")}>+</button>
        </section>

        <section className="mentor-panel activity-panel">
          <div className="panel-head">
            <h3>Recent Student Activity</h3>
            <button onClick={() => onNavigate("/mentor/students")}>View All</button>
          </div>
          <table className="mentor-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Course</th>
                <th>Status</th>
                <th>Score</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {activityRows.map((row) => (
                <tr key={row.student}>
                  <td><span className="mini-avatar">{row.avatar}</span>{row.student}</td>
                  <td>{row.course}</td>
                  <td><span className={`status-chip ${row.status.toLowerCase().replaceAll(" ", "-")}`}>{row.status}</span></td>
                  <td><strong>{row.score}</strong></td>
                  <td>{row.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mentor-alert">
          <small>Insight</small>
          <h3>Low Engagement Alert</h3>
          <p>4 students in "Python Basics" haven't logged in for 3+ days. Consider sending a nudge.</p>
          <button onClick={() => onNavigate("/mentor/notifications")}>Message All</button>
        </section>
      </div>
    </div>
  );
};

const MentorDashboard = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(user);
  const navigate = useNavigate();
  const location = useLocation();
  const section = location.pathname.split("/")[2] || "dashboard";

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  const renderContent = () => {
    if (section === "students") return <UsersPage />;
    if (section === "calendar" || section === "schedule") return <PlannerPage />;
    if (section === "tasks") return <TasksPage canCreate />;
    if (section === "reports") return <ReportsPage canReview />;
    if (section === "analytics") return <AnalyticsPage />;
    if (section === "notifications" || section === "help") return <NotificationsPage />;
    if (section === "settings") return <SettingsPage user={profile} onUserUpdate={setProfile} />;
    return <MentorOverview onNavigate={navigate} />;
  };

  return (
    <div className="mentor">
      <aside className="mentor-sidebar">
        <div className="mentor-profile">
          <div>
            <h2>Lumina LMS</h2>
            <strong>{profile.name}</strong>
          </div>
        </div>
        <div className="mentor-menu">
          <NavLink end to="/mentor" className="mentor-menu-item"><LayoutDashboard /> Overview</NavLink>
          <NavLink to="/mentor/students" className="mentor-menu-item"><Users /> My Students</NavLink>
          <NavLink to="/mentor/calendar" className="mentor-menu-item"><Calendar /> Calendar</NavLink>
          <NavLink to="/mentor/analytics" className="mentor-menu-item"><BarChart2 /> Analytics</NavLink>
          <NavLink to="/mentor/help" className="mentor-menu-item"><HelpCircle /> Help Center</NavLink>
        </div>

        <button className="mentor-schedule-btn" onClick={() => navigate("/mentor/tasks")}>+ Schedule Session</button>

        <button className="mentor-signout" onClick={handleLogout}>
          <LogOut size={16} /> Sign Out
        </button>
      </aside>

      <main className="mentor-main">{renderContent()}</main>
    </div>
  );
};

export default MentorDashboard;
