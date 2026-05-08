import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart2,
  Calendar,
  FileCheck2,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import "./MentorDashboard.css";
import { useAuth } from "../../hooks/useAuth";
import {
  AnalyticsPage,
  MentorPlannerPage,
  NotificationsPage,
  OverviewPage,
  ReportsPage,
  SettingsPage,
  TasksPage,
  UsersPage,
} from "./components/DashboardFeatures";

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
    if (section === "calendar" || section === "schedule") return <MentorPlannerPage />;
    if (section === "tasks") return <TasksPage canCreate />;
    if (section === "reports") return <ReportsPage canReview defaultShowSubmitted={false} />;
    if (section === "analytics") return <AnalyticsPage />;
    if (section === "notifications" || section === "help") return <NotificationsPage />;
    if (section === "settings") return <SettingsPage user={profile} onUserUpdate={setProfile} />;
    return <OverviewPage role="mentor" />;
  };

  return (
    <div className="mentor">
      <aside className="mentor-sidebar">
        <div className="mentor-sidebar-scroll">
          <div className="mentor-brand">
            <div className="mentor-brand-mark">
              <GraduationCap size={22} />
            </div>
            <div className="mentor-brand-copy">
              <h2>Lumina LMS</h2>
              <p>Mentor Workspace</p>
            </div>
          </div>

          <div className="mentor-menu">
            <NavLink end to="/mentor" className="mentor-menu-item"><LayoutDashboard /> Overview</NavLink>
            <NavLink to="/mentor/students" className="mentor-menu-item"><Users /> My Students</NavLink>
            <NavLink to="/mentor/calendar" className="mentor-menu-item"><Calendar /> Calendar</NavLink>
            <NavLink to="/mentor/reports" className="mentor-menu-item"><FileCheck2 /> Reports</NavLink>
            <NavLink to="/mentor/analytics" className="mentor-menu-item"><BarChart2 /> Analytics</NavLink>
            <NavLink to="/mentor/notifications" className="mentor-menu-item"><HelpCircle /> Notifications</NavLink>
          </div>
        </div>

        <div className="mentor-profile">
          <hr></hr>
          <br></br><br></br>
          <button
            type="button"
            className="mentor-profile-card"
            onClick={() => navigate("/mentor/settings")}
          >
            {profile?.avatar ? (
              <img src={profile.avatar} alt={profile?.name || "Mentor"} />
            ) : (
              <span className="mentor-profile-avatar">
                {(profile?.name || "Mentor User").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
              </span>
            )}
            <div className="mentor-profile-copy">
              <strong>{profile?.name || "Mentor User"}</strong>
              <span>{(profile?.role || "mentor").toUpperCase()}</span>
            </div>
          </button>

          <button className="mentor-schedule-btn" onClick={() => navigate("/mentor/tasks")}>
            View Task Board
          </button>

          <button
            type="button"
            className="mentor-settings-link"
            onClick={() => navigate("/mentor/settings")}
          >
            <Settings size={16} /> Profile Settings
          </button>

          <button className="mentor-signout" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <main className="mentor-main">{renderContent()}</main>
    </div>
  );
};

export default MentorDashboard;
