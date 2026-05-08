import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  BadgeCheck,
  BarChart2,
  Bell,
  Box,
  CheckCircle,
  FileText,
  GraduationCap,
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
import { api } from "../../services/api";
import {
  AnalyticsPage,
  MentorDeskPage,
  NotificationsPage,
  ReportsPage,
  SettingsPage,
  TasksPage,
  UsersPage,
} from "./components/DashboardFeatures";

const ADMIN_OVERVIEW_REFRESH_EVENT = "admin-overview-refresh";

const AdminOverview = ({ onNavigate }) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [userFilter, setUserFilter] = useState("all");
  const [showExtendedLogs, setShowExtendedLogs] = useState(false);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [hoveredTrafficLabel, setHoveredTrafficLabel] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadOverview = async () => {
      try {
        const data = await api.adminOverview();
        if (!mounted) return;
        setOverview(data);
        setError("");
      } catch (err) {
        if (mounted) setError(err.message);
      }
    };

    loadOverview();
    const timer = window.setInterval(loadOverview, 30000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [refreshTick]);

  useEffect(() => {
    const handleOverviewRefresh = () => setRefreshTick((current) => current + 1);
    window.addEventListener(ADMIN_OVERVIEW_REFRESH_EVENT, handleOverviewRefresh);
    return () => {
      window.removeEventListener(ADMIN_OVERVIEW_REFRESH_EVENT, handleOverviewRefresh);
    };
  }, []);

  const filteredUsers = useMemo(() => {
    if (!overview) return [];
    const normalized = search.toLowerCase();
    return (overview.users || []).filter((user) => {
      const matchesText = [user.name, user.email, user.role, user.course_access, user.status].join(" ").toLowerCase().includes(normalized);
      const matchesRole = userFilter === "all" || user.role.toLowerCase().includes(userFilter);
      return matchesText && matchesRole;
    });
  }, [overview, search, userFilter]);

  const normalized = search.toLowerCase();
  const filteredLogs = (overview?.logs || []).filter((log) => [log.level, log.message, log.time].join(" ").toLowerCase().includes(normalized));
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / 4));
  const currentPage = Math.min(page, totalPages);
  const visibleUsers = filteredUsers.slice((currentPage - 1) * 4, currentPage * 4);
  const maxTrafficValue = Math.max(1, ...(overview?.traffic || []).flatMap((item) => [item.inbound, item.outbound]));
  const hoveredTraffic = (overview?.traffic || []).find((item) => item.label === hoveredTrafficLabel) || overview?.traffic?.[overview.traffic.length - 1] || null;
  const peakTrafficPoint = (overview?.traffic || []).reduce((peak, point) => {
    if (!peak) return point;
    return (point.inbound + point.outbound) > (peak.inbound + peak.outbound) ? point : peak;
  }, null);

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

  if (error) {
    return <div className="admin-panel admin-overview-state">{error}</div>;
  }

  if (!overview) {
    return <div className="admin-panel admin-overview-state">Loading live admin dashboard...</div>;
  }

  return (
    <div className="admin-shot">
      <header className="admin-shot-top">
        <div className="top-title">
          <span><BarChart2 size={16} /></span>
          <strong>System Health & Growth</strong>
        </div>
        <div className="admin-search">
          <Search size={15} />
          <input value={search} onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }} placeholder="Global system search..." />
        </div>
        <Bell size={17} className="admin-bell" onClick={() => onNavigate("/admin/notifications")} />
        <button className="admin-start" onClick={() => onNavigate("/admin/tasks")}>Get Started</button>
      </header>

      <section className="admin-stat-grid">
        {overview.cards.map((card) => (
          <div className="admin-stat" key={card.label}>
            <div className={`stat-icon ${card.tone}`}>
              {card.tone === "green" && <CheckCircle size={16} />}
              {card.tone === "blue" && <Activity size={16} />}
              {card.tone === "orange" && <Box size={16} />}
              {card.tone === "purple" && <BarChart2 size={16} />}
            </div>
            <span className={`badge ${card.tone}`}>{card.badge}</span>
            <small>{card.label}</small>
            <strong>{card.value}</strong>
            <p>{card.note}</p>
            {typeof card.progress === "number" && (
              <i className={`health-line ${card.tone}-line`} style={{ width: `${card.progress}%` }} />
            )}
          </div>
        ))}
      </section>

      <section className="admin-shot-grid">
        <div className="admin-panel user-management">
          <div className="admin-panel-head">
            <h3>User Management</h3>
            <div>
              <button onClick={() => setUserFilter((current) => {
                const next = { all: "student", student: "mentor", mentor: "admin", admin: "all" };
                setPage(1);
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
                <tr key={user.id}>
                  <td>
                    <span className="admin-avatar">{user.initials}</span>
                    <div><strong>{user.name}</strong><small>{user.email}</small></div>
                  </td>
                  <td>{user.role}</td>
                  <td><span className="course-pills">{user.course_access}</span></td>
                  <td>{user.last_active}</td>
                  <td><span className={`admin-status ${user.status.toLowerCase()}`}>{user.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="admin-table-foot">
            <span>Showing {visibleUsers.length} of {filteredUsers.length} users</span>
            <div>
              <button onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>Previous</button>
              <button className="active" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>Next</button>
            </div>
          </div>
        </div>

        <div className="admin-panel logs-panel">
          <div className="admin-panel-head">
            <h3>Activity Feed</h3>
            <button onClick={() => setRefreshTick((current) => current + 1)}><RefreshCw size={16} /></button>
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
            <div>
              <h3>Real-time Activity</h3>
              <p className="traffic-panel-copy">Hourly backend activity. `Actions` means activity log events, and `Reports` means report submissions recorded in the same hour.</p>
            </div>
            <div className="traffic-side">
              <div className="legend">
                <span /> Activity Logs
                <i /> Report Submissions
              </div>
              {peakTrafficPoint && (
                <div className="traffic-peak-badge">
                  Peak: {peakTrafficPoint.label}
                </div>
              )}
            </div>
          </div>
          {hoveredTraffic && (
            <div className="traffic-hover-card">
              <strong>{hoveredTraffic.label}</strong>
              <p>{hoveredTraffic.inbound} activity log event{hoveredTraffic.inbound === 1 ? "" : "s"}</p>
              <p>{hoveredTraffic.outbound} report submission{hoveredTraffic.outbound === 1 ? "" : "s"}</p>
            </div>
          )}
          <div className="traffic-bars">
            {(overview.traffic || []).map((point) => (
              <div
                key={point.label}
                className={hoveredTrafficLabel === point.label ? "is-active" : ""}
                title={`${point.label}: ${point.inbound} activity logs, ${point.outbound} report submissions`}
                onMouseEnter={() => setHoveredTrafficLabel(point.label)}
                onFocus={() => setHoveredTrafficLabel(point.label)}
              >
                <span style={{ height: `${(point.inbound / maxTrafficValue) * 100}%` }} />
                <i style={{ height: `${(point.outbound / maxTrafficValue) * 100}%` }} />
                <small>{point.label}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-panel deployments-panel">
          <h3>Live Service Modules</h3>
          {(overview.services || []).map((item) => (
            <div className="deployment-card" key={item.name}>
              <span className={item.tone}><Box size={18} /></span>
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

const InquiriesPage = ({ searchTerm = "" }) => {
  const [messages, setMessages] = useState([]);
  const [mentorFeedback, setMentorFeedback] = useState([]);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState(null);

  const loadInquiryData = async () => {
    try {
      const [contactData, feedbackData] = await Promise.all([api.contactMessages(), api.mentorFeedbacks()]);
      setMessages(contactData);
      setMentorFeedback(feedbackData);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        await loadInquiryData();
      } catch (err) {
        if (mounted) setError(err.message);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return <div className="admin-panel admin-overview-state">{error}</div>;
  }

  const normalizedQuery = searchTerm.trim().toLowerCase();
  const visibleMessages = messages.filter((entry) => {
    if (!normalizedQuery) return true;
    return [entry.full_name, entry.email, entry.subject, entry.message]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
  const todayMessages = visibleMessages.filter((entry) => {
    const created = new Date(entry.created_at);
    const today = new Date();
    return created.toDateString() === today.toDateString();
  }).length;
  const uniqueSenders = new Set(visibleMessages.map((entry) => entry.email)).size;
  const submitReply = async (entryId) => {
    const reply = (replyDrafts[entryId] || "").trim();
    if (!reply) {
      setError("Write a reply before sending the email.");
      return;
    }
    setBusyId(entryId);
    try {
      await api.replyContactMessage(entryId, { reply });
      setReplyDrafts((current) => ({ ...current, [entryId]: "" }));
      setMessage("Reply saved and email sent to the user address.");
      await loadInquiryData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="admin-shot admin-inquiries-page">
      <section className="admin-panel inquiries-hero-panel">
        <div className="inquiries-hero-copy">
          <p className="admin-kicker">Contact Desk</p>
          <h3>Incoming Inquiries</h3>
          <p>These entries are loaded directly from the backend contact form table so the admin team can triage requests faster.</p>
        </div>
        <div className="inquiries-hero-stats">
          <div>
            <span>Total Visible</span>
            <strong>{visibleMessages.length}</strong>
          </div>
          <div>
            <span>Today</span>
            <strong>{todayMessages}</strong>
          </div>
          <div>
            <span>Unique Senders</span>
            <strong>{uniqueSenders}</strong>
          </div>
        </div>
      </section>

      <section className="admin-panel inquiries-panel">
        <div className="admin-panel-head">
          <div>
            <h3>Contact Inquiries</h3>
            <small>{visibleMessages.length} message{visibleMessages.length === 1 ? "" : "s"} from the contact form</small>
          </div>
        </div>
        {message && <p className="admin-inline-success">{message}</p>}

        {!visibleMessages.length && <div className="admin-overview-state">No contact inquiries found right now.</div>}

        <div className="inquiry-list">
          {visibleMessages.map((entry) => (
            <article className="inquiry-card" key={entry.id}>
              <div className="inquiry-card-head">
                <div>
                  <h4>{entry.subject}</h4>
                  <p>{entry.full_name} {"·"} {entry.email}</p>
                </div>
                <time>{new Date(entry.created_at).toLocaleString()}</time>
              </div>
              <div className="inquiry-pill-row">
                <span className="inquiry-pill">Sender</span>
                <span className="inquiry-pill">{entry.email.split("@")[1] || "mail"}</span>
              </div>
              <div className="inquiry-message">{entry.message}</div>
              {entry.admin_reply && (
                <div className="inquiry-reply-preview">
                  <strong>Admin reply sent</strong>
                  <p>{entry.admin_reply}</p>
                  <small>{entry.replied_at ? new Date(entry.replied_at).toLocaleString() : "Reply saved"}</small>
                </div>
              )}
              <div className="inquiry-reply-form">
                <textarea
                  value={replyDrafts[entry.id] || ""}
                  onChange={(event) => setReplyDrafts((current) => ({ ...current, [entry.id]: event.target.value }))}
                  placeholder="Write a reply that should be emailed to this user..."
                />
                <button type="button" onClick={() => submitReply(entry.id)} disabled={busyId === entry.id}>
                  {busyId === entry.id ? "Sending..." : "Reply by Email"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-panel inquiries-panel">
        <div className="admin-panel-head">
          <div>
            <h3>Mentor Feedback</h3>
            <small>Feedback submitted by students about their assigned mentors</small>
          </div>
        </div>
        {!mentorFeedback.length && <div className="admin-overview-state">No mentor feedback found right now.</div>}
        <div className="inquiry-list">
          {mentorFeedback.map((entry) => (
            <article className="inquiry-card" key={`feedback-${entry.id}`}>
              <div className="inquiry-card-head">
                <div>
                  <h4>{entry.student_name} on {entry.mentor_name}</h4>
                  <p>Student mentor feedback - {entry.rating}/5 rating</p>
                </div>
                <time>{new Date(entry.created_at).toLocaleString()}</time>
              </div>
              <div className="inquiry-pill-row">
                <span className="inquiry-pill">Mentor Feedback</span>
                <span className="inquiry-pill">{entry.rating}/5</span>
              </div>
              <div className="inquiry-message">{entry.message}</div>
            </article>
          ))}
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
    if (section === "inquiries") return <InquiriesPage />;
    if (section === "mentors") return <MentorDeskPage />;
    if (section === "tasks") return <TasksPage canCreate />;
    if (section === "reports") return <ReportsPage canReview />;
    if (section === "analytics") return <AnalyticsPage />;
    if (section === "notifications" || section === "security") return <NotificationsPage />;
    if (section === "settings") return <SettingsPage user={profile} onUserUpdate={setProfile} />;
    return <AdminOverview onNavigate={navigate} />;
  };

  return (
    <div className="admin">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-scroll">
          <div className="admin-brand">
            <div className="admin-brand-mark">
              <BadgeCheck size={18} />
            </div>
            <div className="admin-brand-copy">
              <h2>Lumina LMS</h2>
              <p><BadgeCheck size={13} /> Admin Control Center</p>
            </div>
          </div>

          <div className="admin-menu">
            <NavLink end to="/admin" className="admin-menu-item"><LayoutDashboard /> Dashboard</NavLink>
            <NavLink to="/admin/users" className="admin-menu-item"><Box /> Users</NavLink>
            <NavLink to="/admin/inquiries" className="admin-menu-item"><FileText /> Inquiries</NavLink>
            <NavLink to="/admin/mentors" className="admin-menu-item"><GraduationCap /> Mentors</NavLink>
            <NavLink to="/admin/tasks" className="admin-menu-item"><ListChecks /> Planner</NavLink>
            <NavLink to="/admin/reports" className="admin-menu-item"><CheckCircle /> Reports</NavLink>

            <p>System</p>
            <NavLink to="/admin/settings" className="admin-menu-item"><Settings /> Account Settings</NavLink>
            <NavLink to="/admin/notifications" className="admin-menu-item"><Shield /> Notifications</NavLink>
          </div>
        </div>

        <div className="admin-profile">
          <div>
            <img src={profile?.avatar || "https://i.pravatar.cc/40?img=12"} alt="Admin avatar" />
            <div><strong>{profile?.name || "Admin"}</strong><span>{(profile?.role || "admin").toUpperCase()}</span></div>
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
