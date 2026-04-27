import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "./UserDashboard.css";
import {
  Bell,
  Calendar,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  LogOut,
  BookOpen,
  Search,
  Settings,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import {
  AnalyticsPage,
  NotificationsPage,
  OverviewPage,
  PlannerPage,
  ReportsPage,
  SettingsPage,
  MyCoursesPage,
  TaskManagerPage,
  TasksPage,
} from "./components/DashboardFeatures";

const UserDashboard = () => {
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
    if (section === "planner") return <PlannerPage />;
    if (section === "task-manager") return <TaskManagerPage canCreate={false} />;
    if (section === "tasks") return <TasksPage canCreate={false} />;
    if (section === "my-courses") return <MyCoursesPage />;
    if (section === "resources") return <ReportsPage canReview={false} />;
    if (section === "reports") return <ReportsPage canReview={false} />;
    if (section === "analytics") return <AnalyticsPage />;
    if (section === "notifications") return <NotificationsPage />;
    if (section === "settings") return <SettingsPage user={profile} onUserUpdate={setProfile} />;
    return <OverviewPage role="student" />;
  };

  const sectionTitles = {
    dashboard: "Learning Dashboard",
    planner: "Study Planner",
    "my-courses": "My Courses",
    "task-manager": "Task Manager",
    resources: "Resources",
    analytics: "Analytics",
    notifications: "Messages",
    settings: "Settings",
    tasks: "Tasks Kanban",
    reports: "Reports",
  };
  const searchPlaceholder = section === "my-courses" ? "Search courses..." : "Search tasks, courses, or deadlines...";

  return (
    <div className={`dashboard section-${section}`}>
      <aside className="sidebar">
        <div className="sidebar-scroll">
          <div className="brand">
            <span className="brand-mark"><GraduationCap size={18} /></span>
            <div>
              <h2>Lumina LMS</h2>
              <p>Student workspace</p>
            </div>
          </div>

          <div className="menu">
            <NavLink end to="/user" className="menu-item"><LayoutDashboard /> Dashboard</NavLink>
            <NavLink to="/user/planner" className="menu-item"><Calendar /> Study Planner</NavLink>
            <NavLink to="/user/my-courses" className="menu-item"><BookOpen /> My Courses</NavLink>
            <NavLink to="/user/task-manager" className="menu-item"><ListChecks /> Task Manager</NavLink>
            <NavLink to="/user/resources" className="menu-item"><FileText /> Resources</NavLink>
            <NavLink to="/user/settings" className="menu-item"><Settings /> Settings</NavLink>
          </div>
        </div>

        <div className="sidebar-actions">
          <button className="new-btn" onClick={() => navigate("/user/planner")}>+ New Study Session</button>
          <div className="sidebar-bottom">
            <button className="sidebar-btn support" onClick={() => navigate("/contact")}>Support</button>
            <button className="sidebar-btn logout" onClick={handleLogout}><LogOut size={16} /> Sign Out</button>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="topbar-copy">
            <p className="topbar-eyebrow">{profile?.name ? `${profile.name.split(" ")[0]}'s workspace` : "Student workspace"}</p>
            <h2 className={section === "my-courses" ? "title-learning" : ""}>{sectionTitles[section] || "Learning Dashboard"}</h2>
          </div>
          <div className="top-actions">
            <label className="search">
              <Search size={16} />
              <input placeholder={searchPlaceholder} />
            </label>
            <div className="top-shortcuts">
              <button className="top-link" onClick={() => navigate("/user/analytics")}>Analytics</button>
              <button className="top-link" onClick={() => navigate("/user/planner")}>Deadlines</button>
              <button className="top-link" onClick={() => navigate("/courses")}>Explore Courses</button>
            </div>
            <button className="top-icon-btn" type="button" aria-label="Open notifications" onClick={() => navigate("/user/notifications")}>
              <Bell size={18} />
            </button>
            <button className="upgrade" onClick={() => navigate("/user/planner")}>Upgrade Plan</button>
            <img src={profile?.avatar || "https://i.pravatar.cc/40"} className="avatar" alt="Student avatar" />
          </div>
        </div>

        {renderContent()}
      </main>
    </div>
  );
};

export default UserDashboard;
