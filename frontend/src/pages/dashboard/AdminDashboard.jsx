import React, { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart2,
  Bell,
  Box,
  CheckCircle,
  FileText,
  LayoutDashboard,
  ListChecks,
  LogOut,
  RefreshCw,
  Search,
  Settings,
  Shield,
} from "lucide-react";
import "./AdminDashboard.css";
import { useAuth } from "../../hooks/useAuth";
import {
  AnalyticsPage,
  NotificationsPage,
  ReportsPage,
  SettingsPage,
  TasksPage,
  UsersPage,
} from "./components/DashboardFeatures";

const adminUsers = [
  { initials: "EJ", name: "Elena Jenkins", email: "e.jenkins@lumina.edu", role: "Instructor", course: "UX CS", last: "2 mins ago", status: "Online" },
  { initials: "MB", name: "Marcus Bell", email: "m.bell@enterprise.com", role: "Learner", course: "AI", last: "1 hour ago", status: "Offline" },
  { initials: "SK", name: "Sarah Kaine", email: "s.kaine@lumina.edu", role: "Content Admin", course: "QY SE", last: "Just now", status: "Online" },
  { initials: "DT", name: "David Thorne", email: "d.thorne@gmail.com", role: "Learner", course: "MK", last: "12 mins ago", status: "Online" },
];

const logs = [
  { time: "14:02:11", level: "INFO", message: "CDN cache purged for region 'us-east-1'." },
  { time: "14:00:04", level: "AUTH", message: "User Sarah Kaine authenticated via OAuth2." },
  { time: "13:58:30", level: "WARN", message: "High latency detected on DB cluster-B. Initiating load rebalance." },
  { time: "13:55:01", level: "INFO", message: "Course 'Advanced Neural Networks' metadata updated by instructor." },
  { time: "13:52:19", level: "ERR", message: "Socket timeout on /api/v2/user/billing. Retrying in 500ms." },
  { time: "13:50:44", level: "INFO", message: "Automated backup completed successfully." },
];

const trafficBars = [38, 50, 68, 55, 82, 96, 78, 44, 62, 86];

const deployments = [
  { name: "Frontend-Main", version: "v2.4.12 - stable", color: "blue", status: "live" },
  { name: "API-Gateway", version: "v2.4.10 - stable", color: "purple", status: "live" },
  { name: "Media-Transcoder", version: "v1.9.0 - syncing", color: "orange", status: "sync" },
];

const AdminOverview = ({ onNavigate }) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [logVersion, setLogVersion] = useState(1);
  const [userFilter, setUserFilter] = useState("all");
  const [showExtendedLogs, setShowExtendedLogs] = useState(false);

  const normalized = search.toLowerCase();
  const filteredUsers = adminUsers.filter((user) => {
    const matchesText = [user.name, user.email, user.role, user.course, user.status].join(" ").toLowerCase().includes(normalized);
    const matchesRole = userFilter === "all" || user.role.toLowerCase().includes(userFilter);
    return matchesText && matchesRole;
  });
  const filteredLogs = logs
    .filter((log) => [log.level, log.message, log.time].join(" ").toLowerCase().includes(normalized))
    .map((log, index) => ({
      ...log,
      time: logVersion > 1 && index === 0 ? "14:04:18" : log.time,
    }));
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / 4));
  const visibleUsers = filteredUsers.slice((page - 1) * 4, page * 4);

  useEffect(() => {
    setPage(1);
  }, [search, userFilter]);

  const downloadReport = () => {
    const report = filteredLogs.map((log) => `${log.time} [${log.level}] ${log.message}`).join("\n");
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "system-log-report.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-shot">
      <header className="admin-shot-top">
        <div className="top-title">
          <span><BarChart2 size={16} /></span>
          <strong>System Health & Growth</strong>
        </div>
        <div className="admin-search">
          <Search size={15} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Global system search..." />
        </div>
        <Bell size={17} className="admin-bell" onClick={() => onNavigate("/admin/notifications")} />
        <button className="admin-start" onClick={() => onNavigate("/admin/tasks")}>Get Started</button>
      </header>

      <section className="admin-stat-grid">
        <div className="admin-stat">
          <div className="stat-icon green"><CheckCircle size={16} /></div>
          <span className="badge green">Active</span>
          <small>System Health</small>
          <strong>99.98%</strong>
          <i className="health-line green-line" />
        </div>
        <div className="admin-stat">
          <div className="stat-icon blue"><Activity size={16} /></div>
          <span className="badge blue">+2.4%</span>
          <small>User Growth</small>
          <strong>42,851</strong>
          <p>Total registered accounts</p>
        </div>
        <div className="admin-stat">
          <div className="stat-icon orange"><Box size={16} /></div>
          <span className="badge orange">Moderate</span>
          <small>Server Load</small>
          <strong>64%</strong>
          <i className="health-line orange-line" />
        </div>
        <div className="admin-stat">
          <div className="stat-icon purple"><BarChart2 size={16} /></div>
          <span className="badge purple">Up 5.2%</span>
          <small>Active Courses</small>
          <strong>1,204</strong>
          <p>Live learning sessions</p>
        </div>
      </section>

      <section className="admin-shot-grid">
        <div className="admin-panel user-management">
          <div className="admin-panel-head">
            <h3>User Management</h3>
            <div>
              <button onClick={() => setUserFilter((current) => {
                const next = { all: "learner", learner: "instructor", instructor: "content admin", "content admin": "all" };
                return next[current] || "all";
              })}>
                Filter: {userFilter === "all" ? "All" : userFilter}
              </button>
              <button onClick={() => setShowExtendedLogs((current) => !current)}>{showExtendedLogs ? "Less" : "More"}</button>
            </div>
          </div>
          <table className="admin-user-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Role</th>
                <th>Course Access</th>
                <th>Last Active</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((user) => (
                <tr key={user.email}>
                  <td>
                    <span className="admin-avatar">{user.initials}</span>
                    <div><strong>{user.name}</strong><small>{user.email}</small></div>
                  </td>
                  <td>{user.role}</td>
                  <td><span className="course-pills">{user.course}</span></td>
                  <td>{user.last}</td>
                  <td><span className={`admin-status ${user.status.toLowerCase()}`}>{user.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="admin-table-foot">
            <span>Showing {visibleUsers.length} of {filteredUsers.length} users</span>
            <div>
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Previous</button>
              <button className="active" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>Next</button>
            </div>
          </div>
        </div>

        <div className="admin-panel logs-panel">
          <div className="admin-panel-head">
            <h3>System Logs</h3>
            <button onClick={() => setLogVersion(logVersion + 1)}><RefreshCw size={16} /></button>
          </div>
          <div className="logs-list">
            {(showExtendedLogs ? filteredLogs : filteredLogs.slice(0, 4)).map((log) => (
              <p key={`${log.time}-${log.level}`}>
                <time>{log.time}</time>
                <strong className={log.level.toLowerCase()}>[{log.level}]</strong>
                {log.message}
              </p>
            ))}
          </div>
          <button className="download-log" onClick={downloadReport}>Download Full Log Report</button>
        </div>

        <div className="admin-panel traffic-panel">
          <div className="admin-panel-head">
            <h3>Real-time Traffic (Packets/s)</h3>
            <div className="legend"><span /> Inbound <i /> Outbound</div>
          </div>
          <div className="traffic-bars">
            {trafficBars.map((height, index) => (
              <div key={height + index} title={`Traffic slot ${index + 1}: inbound ${height}%, outbound ${Math.max(20, height - 14)}%`}>
                <span style={{ height: `${height}%` }} />
                <i style={{ height: `${Math.max(20, height - 14)}%` }} />
              </div>
            ))}
          </div>
        </div>

        <div className="admin-panel deployments-panel">
          <h3>Active Deployments</h3>
          {deployments.map((item) => (
            <div className="deployment-card" key={item.name}>
              <span className={item.color}><Box size={18} /></span>
              <div><strong>{item.name}</strong><small>{item.version}</small></div>
              <i className={item.status} />
            </div>
          ))}
          <button onClick={() => onNavigate("/admin/analytics")}>Manage All Services</button>
        </div>
      </section>
    </div>
  );
};

const AdminDashboard = () => {
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
    if (section === "users") return <UsersPage />;
    if (section === "tasks") return <TasksPage canCreate />;
    if (section === "reports") return <ReportsPage canReview />;
    if (section === "analytics") return <AnalyticsPage />;
    if (section === "notifications") return <NotificationsPage />;
    if (section === "settings" || section === "security") return <SettingsPage user={profile} onUserUpdate={setProfile} />;
    return <AdminOverview onNavigate={navigate} />;
  };

  return (
    <div className="admin">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <h2>Lumina LMS</h2>
          <p>Admin Control Center</p>
        </div>

        <div className="admin-menu">
          <NavLink end to="/admin" className="admin-menu-item"><LayoutDashboard /> Dashboard</NavLink>
          <NavLink to="/admin/users" className="admin-menu-item"><Box /> Users</NavLink>
          <NavLink to="/admin/tasks" className="admin-menu-item"><ListChecks /> Planner</NavLink>
          <NavLink to="/admin/reports" className="admin-menu-item"><CheckCircle /> Reports</NavLink>

          <p>System</p>
          <NavLink to="/admin/settings" className="admin-menu-item"><Settings /> Global Config</NavLink>
          <NavLink to="/admin/security" className="admin-menu-item"><Shield /> Security Logs</NavLink>
        </div>

        <div className="admin-profile">
          <div>
            <img src="https://i.pravatar.cc/40?img=12" alt="Admin avatar" />
            <div><strong>{profile?.name || "Alex Sterling"}</strong><span>SUPER ADMIN</span></div>
          </div>
          <button onClick={() => navigate("/admin/analytics")}>View Progress</button>
          <button className="admin-logout" onClick={handleLogout}><LogOut size={15} /> Logout</button>
        </div>
      </aside>

      <main className="admin-main">{renderContent()}</main>
    </div>
  );
};

export default AdminDashboard;
