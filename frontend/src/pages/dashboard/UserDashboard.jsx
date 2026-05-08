import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "./UserDashboard.css";
import {
  Bell,
  Calendar,
  CalendarClock,
  FileText,
  User,
  Handshake,
  LayoutDashboard,
  ListChecks,
  LogOut,
  BookOpen,
  Search,
  Settings,
  X,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useUnreadNotifications } from "../../hooks/useUnreadNotifications";
import { api } from "../../services/api";
import {
  AnalyticsPage,
  NotificationsPage,
  OverviewPage,
  PlannerPage,
  ReportsPage,
  SettingsPage,
  MyCoursesPage,
  TaskManagerPage,
  StudentMentorPage,
  TasksPage,
} from "./components/DashboardFeatures";

const SEARCH_CONFIG = {
  planner: "Search planner tasks or deadlines...",
  "task-manager": "Search task cards...",
  tasks: "Search tasks...",
  "my-courses": "Search courses...",
  mentor: "Search mentor requests...",
  resources: "Search reports or feedback...",
  reports: "Search reports or feedback...",
  notifications: "Search notifications...",
};

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(user);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeadlinesModal, setShowDeadlinesModal] = useState(false);
  const [deadlineItems, setDeadlineItems] = useState([]);
  const [deadlinesLoading, setDeadlinesLoading] = useState(false);
  const [deadlinesError, setDeadlinesError] = useState("");
  const { unreadCount } = useUnreadNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const section = location.pathname.split("/")[2] || "dashboard";

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  const openDeadlinesModal = async () => {
    setShowDeadlinesModal(true);
    setDeadlinesLoading(true);
    setDeadlinesError("");
    try {
      const tasks = await api.tasks();
      const liveDeadlines = tasks
        .filter((task) => task.status !== "Done" && task.due_date)
        .sort((left, right) => new Date(left.due_date) - new Date(right.due_date));
      setDeadlineItems(liveDeadlines);
    } catch (err) {
      setDeadlinesError(err.message);
    } finally {
      setDeadlinesLoading(false);
    }
  };

  const renderContent = () => {
    if (section === "planner") return <PlannerPage searchTerm={searchTerm} />;
    if (section === "task-manager") return <TaskManagerPage canCreate={false} searchTerm={searchTerm} />;
    if (section === "tasks") return <TasksPage canCreate={false} searchTerm={searchTerm} />;
    if (section === "my-courses") return <MyCoursesPage searchTerm={searchTerm} />;
    if (section === "mentor") return <StudentMentorPage />;
    if (section === "resources") return <ReportsPage canReview={false} searchTerm={searchTerm} defaultShowSubmitted={false} />;
    if (section === "reports") return <ReportsPage canReview={false} searchTerm={searchTerm} />;
    if (section === "analytics") return <AnalyticsPage />;
    if (section === "notifications") return <NotificationsPage searchTerm={searchTerm} />;
    if (section === "settings") return <SettingsPage user={profile} onUserUpdate={setProfile} />;
    return <OverviewPage role="student" />;
  };

  const sectionTitles = {
    dashboard: "Learning Dashboard",
    planner: "Study Planner",
    "my-courses": "My Courses",
    mentor: "Mentor Desk",
    "task-manager": "Task Manager",
    resources: "Resources",
    analytics: "Analytics",
    notifications: "Messages",
    settings: "Settings",
    tasks: "Tasks Kanban",
    reports: "Reports",
  };
  const showTopbar = section !== "dashboard";
  const searchPlaceholder = SEARCH_CONFIG[section] || "";
  const showSearch = Boolean(SEARCH_CONFIG[section]);

  return (
    <div className={`dashboard section-${section}`}>
      <aside className="sidebar">
        <div className="sidebar-scroll">
          <div className="brand">
            <span className="brand-mark"><User size={24} strokeWidth={2.2} /></span>
            <div>
              <h2>Lumina LMS</h2>
              <p>Student workspace</p>
            </div>
          </div>

          <div className="menu">
            <NavLink end to="/user" className="menu-item"><LayoutDashboard /> Dashboard</NavLink>
            <NavLink to="/user/planner" className="menu-item"><Calendar /> Study Planner</NavLink>
            <NavLink to="/user/my-courses" className="menu-item"><BookOpen /> My Courses</NavLink>
            <NavLink to="/user/mentor" className="menu-item"><Handshake /> Mentor Desk</NavLink>
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
        {showTopbar && (
          <div className="topbar">
            <div className="topbar-copy">
              <p className="topbar-eyebrow">{profile?.name ? `${profile.name.split(" ")[0]}'s workspace` : "Student workspace"}</p>
              <h2 className={section === "my-courses" ? "title-learning" : ""}>{sectionTitles[section] || "Learning Dashboard"}</h2>
            </div>
            <div className="top-actions">
              {showSearch && (
                <label className="search">
                  <Search size={16} />
                  <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={searchPlaceholder} />
                </label>
              )}
              <div className="top-shortcuts">
                <button className="top-link" onClick={() => navigate("/user/analytics")}>Analytics</button>
                <button className="top-link" onClick={openDeadlinesModal}>Deadlines</button>
                <button className="top-link" onClick={() => navigate("/courses")}>Explore Courses</button>
              </div>
              <button className="top-icon-btn notification-btn" type="button" aria-label="Open notifications" onClick={() => navigate("/user/notifications")}>
                <Bell size={18} />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
              </button>
              <button type="button" className="avatar-btn" aria-label="Open settings" onClick={() => navigate("/user/settings")}>
                <img src={profile?.avatar || "https://i.pravatar.cc/40"} className="avatar" alt="Student avatar" />
              </button>
            </div>
          </div>
        )}

        {renderContent()}
      </main>

      {showDeadlinesModal && (
        <div className="deadlines-modal-overlay" onClick={() => setShowDeadlinesModal(false)}>
          <div className="deadlines-modal" onClick={(event) => event.stopPropagation()}>
            <div className="deadlines-modal-head">
              <div>
                <p className="topbar-eyebrow">Realtime Deadlines</p>
                <h3>Upcoming Deadline Queue</h3>
                <p>Live task deadlines with current priority and due dates.</p>
              </div>
              <button type="button" className="deadlines-close-btn" onClick={() => setShowDeadlinesModal(false)}>
                <X size={18} />
              </button>
            </div>

            {deadlinesLoading ? (
              <p className="deadlines-state">Loading live deadlines...</p>
            ) : deadlinesError ? (
              <p className="deadlines-state deadlines-state-error">{deadlinesError}</p>
            ) : deadlineItems.length ? (
              <div className="deadlines-list">
                {deadlineItems.map((task, index) => (
                  <article className="deadline-item" key={`deadline-${task.id}`}>
                    <span className="deadline-rank">{index + 1}</span>
                    <div className="deadline-copy">
                      <h4>{task.title}</h4>
                      <p>{task.priority} priority</p>
                    </div>
                    <div className="deadline-meta">
                      <span className={`deadline-priority deadline-priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
                      <small><CalendarClock size={14} /> {new Date(task.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="deadlines-state">No active deadline-based tasks are pending right now.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
