import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  CalendarDays,
  Clock3,
  Filter,
  FolderClosed,
  GraduationCap,
  MoreVertical,
  Plus,
  Search,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../../../hooks/useAuth";
import { useCourses } from "../../../hooks/useCourses";
import { api } from "../../../services/api";
import "./DashboardFeatures.css";

const STATUSES = ["To Do", "In Progress", "Review", "Done"];
const MotionDiv = motion.div;
const DASHBOARD_REFRESH_INTERVAL = 30000;
const ANALYTICS_RANGES = ["Week", "Month", "Year"];
const TASK_WINDOW_OPTIONS = [7, 30, 90];
const MY_COURSE_TABS = [
  { key: "all", label: "All Courses", matcher: () => true },
  { key: "active", label: "Active", matcher: (course) => course.progress < 100 },
  { key: "mastery", label: "Mastery Track", matcher: (course) => course.progress >= 80 },
  { key: "recent", label: "Recently Added", matcher: (course, index) => index < 3 },
];
const COURSE_PROGRESS_BY_STATUS = {
  "To Do": 18,
  "In Progress": 63,
  Review: 82,
  Done: 100,
};

export const LoadingState = () => <div className="feature-card">Loading backend data...</div>;

export const ErrorState = ({ message }) => <div className="feature-card error-card">{message}</div>;

const formatDueDate = (date) => {
  if (!date) return "No due date";
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatRecency = (date) => {
  if (!date) return "Recently";
  const now = new Date();
  const updated = new Date(date);
  const diffInHours = Math.max(1, Math.round((now - updated) / (1000 * 60 * 60)));
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  const diffInDays = Math.round(diffInHours / 24);
  return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
};

const shortDeadline = (date) => {
  if (!date) return "No deadline";
  const due = new Date(date);
  const now = new Date();
  const dayDiff = Math.floor((due.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Tomorrow";
  return due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const trimTitle = (title) => {
  if (!title) return "Untitled Course";
  return title.length > 32 ? `${title.slice(0, 32)}...` : title;
};

const toPercent = (value) => `${Math.max(0, Math.min(100, Math.round(value)))}%`;

const formatShortDateTime = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getTaskTopic = (task) => ((task?.tags || "").split(",")[0] || "General").trim();

const addDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const getTaskSourceDate = (task) => task?.updated_at || task?.due_date || task?.created_at || null;

const isBetweenDates = (value, start, end) => {
  if (!value) return false;
  const date = new Date(value);
  return date >= start && date <= end;
};

const getRangeBuckets = (range) => {
  const today = new Date();

  if (range === "Week") {
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const todayDay = (today.getDay() + 6) % 7;
    const weekStart = startOfDay(addDays(today, -todayDay));
    return labels.map((label, index) => {
      const start = addDays(weekStart, index);
      return {
        label,
        start,
        end: endOfDay(start),
      };
    });
  }

  if (range === "Month") {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const totalDays = monthEnd.getDate();
    const segments = [
      { label: "Week 1", startDay: 1, endDay: Math.min(7, totalDays) },
      { label: "Week 2", startDay: 8, endDay: Math.min(14, totalDays) },
      { label: "Week 3", startDay: 15, endDay: Math.min(21, totalDays) },
      { label: "Week 4", startDay: 22, endDay: totalDays },
    ];

    return segments.map((segment) => ({
      label: segment.label,
      start: startOfDay(new Date(today.getFullYear(), today.getMonth(), segment.startDay)),
      end: endOfDay(new Date(today.getFullYear(), today.getMonth(), segment.endDay)),
    }));
  }

  return Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
    const monthStart = startOfDay(monthDate);
    const monthEnd = endOfDay(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0));
    return {
      label: monthDate.toLocaleDateString(undefined, { month: "short" }),
      start: monthStart,
      end: monthEnd,
    };
  });
};

const filterItemsByRange = (items = [], range, accessor) => {
  const buckets = getRangeBuckets(range);
  const start = buckets[0]?.start;
  const end = buckets[buckets.length - 1]?.end;
  if (!start || !end) return [];
  return items.filter((item) => isBetweenDates(accessor(item), start, end));
};

const buildWeeklyProgress = (tasks = [], reports = [], range = "Month") => {
  const buckets = getRangeBuckets(range);

  return buckets.map((bucket) => {
    const bucketTasks = tasks.filter((task) => isBetweenDates(getTaskSourceDate(task), bucket.start, bucket.end));
    const bucketReports = reports.filter((report) => isBetweenDates(report.submitted_at, bucket.start, bucket.end));
    const completedCount = bucketTasks.filter((task) => task.status === "Done").length;
    const progress = bucketTasks.length ? Math.round((completedCount / bucketTasks.length) * 100) : 0;

    return {
      label: bucket.label,
      progress,
      completed: completedCount,
      reports: bucketReports.length,
      tasks: bucketTasks.length,
    };
  });
};

const buildCategoryPerformance = (tasks = []) => {
  const grouped = tasks.reduce((accumulator, task) => {
    const topic = getTaskTopic(task);
    if (!accumulator[topic]) {
      accumulator[topic] = { department: topic, performance: 0, total: 0 };
    }
    accumulator[topic].total += 1;
    if (task.status === "Done") {
      accumulator[topic].performance += 1;
    }
    return accumulator;
  }, {});

  const rows = Object.values(grouped)
    .map((row) => ({
      department: row.department,
      performance: Math.round((row.performance / Math.max(1, row.total)) * 100),
    }))
    .sort((left, right) => right.performance - left.performance || left.department.localeCompare(right.department))
    .slice(0, 5);

  return rows.length ? rows : [{ department: "No tasks", performance: 0 }];
};

const ChartTooltipContent = ({ active, label, payload }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <p key={item.dataKey}>
          <span>{item.name || item.dataKey}</span>
          <b>{item.value}</b>
        </p>
      ))}
    </div>
  );
};

export const OverviewPage = ({ role }) => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadOverview = async () => {
      try {
        const [dashboardData, overviewData] = await Promise.all([api.dashboard(role), api.analyticsOverview()]);
        if (active) {
          setDashboard(dashboardData);
          setOverview(overviewData);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      }
    };

    loadOverview();
    const intervalId = window.setInterval(loadOverview, DASHBOARD_REFRESH_INTERVAL);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [role]);

  if (error) return <ErrorState message={error} />;
  if (!dashboard || !overview) return <LoadingState />;

  if (role === "student") {
    const tasks = dashboard.tasks || [];
    const reports = dashboard.reports || [];
    const doneTasks = tasks.filter((task) => task.status === "Done").length;
    const inProgressTasks = tasks.filter((task) => task.status === "In Progress").length;
    const upcomingTasks = tasks.filter((task) => task.status === "To Do").length;
    const completion = tasks.length ? (doneTasks / tasks.length) * 100 : 0;
    const reportCompletion = tasks.length ? (reports.length / tasks.length) * 100 : reports.length ? 100 : 0;
    const studyStreak = Math.max(1, doneTasks + inProgressTasks);
    const recentTasks = [...tasks]
      .sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0))
      .slice(0, 4);
    const progressRings = [
      { label: "Course completion", value: completion, tone: "violet" },
      { label: "Report cadence", value: reportCompletion, tone: "gold" },
      { label: "Weekly focus", value: tasks.length ? ((inProgressTasks + doneTasks) / tasks.length) * 100 : 0, tone: "teal" },
    ];

    return (
      <MotionDiv className="feature-stack student-overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <section className="student-hero-card">
          <div>
            <p className="eyebrow">Student Workspace</p>
            <h3>Track your momentum, deadlines, and learning progress in one place.</h3>
          </div>
          <div className="student-hero-metrics">
            <div>
              <span>Study streak</span>
              <strong>{studyStreak} days</strong>
            </div>
            <div>
              <span>Next target</span>
              <strong>{upcomingTasks ? `${upcomingTasks} upcoming` : "All caught up"}</strong>
            </div>
          </div>
        </section>

        <div className="student-progress-layout">
          <section className="feature-card progress-spotlight">
            <div className="progress-spotlight-head">
              <div>
                <p className="eyebrow">Progress</p>
                <h4>Learning progress</h4>
              </div>
              <strong>{toPercent(completion)}</strong>
            </div>
            <div className="progress-track-shell">
              <div className="progress-track-fill" style={{ width: toPercent(completion) }} />
            </div>
            <div className="student-progress-stats">
              <article>
                <span>Completed</span>
                <strong>{doneTasks}</strong>
              </article>
              <article>
                <span>In progress</span>
                <strong>{inProgressTasks}</strong>
              </article>
              <article>
                <span>Reports sent</span>
                <strong>{reports.length}</strong>
              </article>
            </div>
          </section>

          <section className="feature-card progress-ring-panel">
            {progressRings.map((item) => (
              <article className="progress-ring-card" key={item.label}>
                <div
                  className={`progress-ring tone-${item.tone}`}
                  style={{ background: `conic-gradient(var(--ring-color) ${toPercent(item.value)}, rgba(203, 213, 225, 0.3) 0)` }}
                >
                  <div>
                    <strong>{toPercent(item.value)}</strong>
                  </div>
                </div>
                <span>{item.label}</span>
              </article>
            ))}
          </section>
        </div>

        <div className="student-overview-grid">
          <section className="feature-card">
            <div className="section-head">
              <h3>Upcoming Study Flow</h3>
              <span className="muted">{recentTasks.length} items</span>
            </div>
            {recentTasks.length ? recentTasks.map((task, index) => (
              <div className="planner-row planner-row-rich" key={task.id}>
                <span>{index + 1}</span>
                <div>
                  <p>{task.title}</p>
                  <small>{shortDeadline(task.due_date)} • {task.status}</small>
                </div>
                <strong>{task.priority}</strong>
              </div>
            )) : <p className="muted">No learning tasks yet.</p>}
          </section>

          <section className="feature-card student-insight-card">
            <p className="eyebrow">Snapshot</p>
            <h4>Your dashboard is now showing live progress.</h4>
            <div className="metric-list student-metric-list">
              <p>Total platform students <strong>{overview.total_students}</strong></p>
              <p>Your active tasks <strong>{tasks.length}</strong></p>
              <p>Unread notifications <strong>{dashboard.unread_notifications ?? 0}</strong></p>
              <p>Completion status <strong>{toPercent(completion)}</strong></p>
            </div>
            <button type="button" className="primary-btn student-catalog-btn" onClick={() => navigate("/courses")}>
              Explore Courses
            </button>
          </section>
        </div>
      </MotionDiv>
    );
  }

  return (
    <MotionDiv className="feature-stack" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="feature-grid stats-grid">
        {dashboard.stats.map((stat) => (
          <div className="feature-card stat-tile" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            {stat.note && <small>{stat.note}</small>}
          </div>
        ))}
      </div>

      <div className="feature-grid">
        <div className="feature-card">
          <h3>Platform Overview</h3>
          <div className="metric-list">
            <p>Total users <strong>{overview.total_users}</strong></p>
            <p>Total students <strong>{overview.total_students}</strong></p>
            <p>Submitted reports <strong>{overview.submitted_reports}</strong></p>
            <p>Unread notifications <strong>{overview.unread_notifications}</strong></p>
          </div>
        </div>
        <div className="feature-card">
          <h3>Smart Study Planner</h3>
          <p className="muted">Planner suggestions are generated from task priority, status, and due dates.</p>
          {(dashboard.tasks || []).slice(0, 4).map((task) => (
            <div className="planner-row" key={task.id}>
              <span>{task.priority}</span>
              <p>{task.title}</p>
            </div>
          ))}
        </div>
      </div>
    </MotionDiv>
  );
};

const TaskCard = ({ task }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "TASK",
    item: { id: task.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [task.id]);

  return (
    <div ref={drag} className="task-card" style={{ opacity: isDragging ? 0.45 : 1 }}>
      <div className="task-card-head">
        <strong>{task.title}</strong>
        <span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span>
      </div>
      <p>{task.description}</p>
      <div className="tag-row">
        {(task.tags || "").split(",").filter(Boolean).map((tag) => <span key={tag}>{tag.trim()}</span>)}
      </div>
      <small>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : "Not set"}</small>
    </div>
  );
};

const KanbanColumn = ({ status, tasks, onDropTask }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "TASK",
    drop: (item) => onDropTask(item.id, status),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }), [status, onDropTask]);

  return (
    <div ref={drop} className={`kanban-column ${isOver ? "is-over" : ""}`}>
      <h3>{status}</h3>
      {tasks.map((task) => <TaskCard task={task} key={task.id} />)}
    </div>
  );
};

export const TasksPage = ({ canCreate }) => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "Medium",
    tags: "study,lms",
    assigned_to: "",
    due_date: "",
  });

  const loadTasks = () => {
    Promise.all([api.tasks(), canCreate ? api.users() : Promise.resolve([])])
      .then(([taskData, userData]) => {
        setTasks(taskData);
        setUsers(userData);
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([api.tasks(), canCreate ? api.users() : Promise.resolve([])])
      .then(([taskData, userData]) => {
        if (mounted) {
          setTasks(taskData);
          setUsers(userData);
        }
      })
      .catch((err) => mounted && setError(err.message));
    return () => {
      mounted = false;
    };
  }, [canCreate]);

  const updateTaskStatus = async (id, status) => {
    const previous = tasks;
    setTasks((items) => items.map((task) => task.id === id ? { ...task, status } : task));
    try {
      await api.updateTask(id, { status });
    } catch (err) {
      setTasks(previous);
      setError(err.message);
    }
  };

  const submitTask = async (event) => {
    event.preventDefault();
    await api.createTask({
      ...form,
      assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
    });
    setForm({ title: "", description: "", priority: "Medium", tags: "study,lms", assigned_to: "", due_date: "" });
    loadTasks();
  };

  if (error) return <ErrorState message={error} />;

  return (
    <MotionDiv className="feature-stack" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {canCreate && (
        <form className="feature-card form-grid" onSubmit={submitTask}>
          <h3>Create Task</h3>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title" required />
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" required />
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Critical</option>
          </select>
          <select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
            <option value="">Assign later</option>
            {users.map((user) => <option value={user.id} key={user.id}>{user.name} ({user.role})</option>)}
          </select>
          <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="tags,comma,separated" />
          <button type="submit">Create Task</button>
        </form>
      )}

      <DndProvider backend={HTML5Backend}>
        <div className="kanban-board">
          {STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={tasks.filter((task) => task.status === status)}
              onDropTask={updateTaskStatus}
            />
          ))}
        </div>
      </DndProvider>
    </MotionDiv>
  );
};

export const ReportsPage = ({ canReview }) => {
  const [reports, setReports] = useState([]);
  const [content, setContent] = useState("# Weekly Study Report\n\nWhat I studied:\n\nChallenges:\n\nNext plan:");
  const [mode, setMode] = useState("split");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const loadReports = () => api.reports().then(setReports).catch((err) => setError(err.message));

  useEffect(() => {
    let mounted = true;
    api.reports()
      .then((data) => mounted && setReports(data))
      .catch((err) => mounted && setError(err.message));
    return () => {
      mounted = false;
    };
  }, []);

  const submitReport = async () => {
    await api.createReport({ content });
    loadReports();
  };

  const submitFeedback = async (id) => {
    if (!feedback.trim()) return;
    await api.feedback(id, { feedback });
    setFeedback("");
    loadReports();
  };

  const uploadFile = async (id, file) => {
    const formData = new FormData();
    formData.append("file", file);
    await api.uploadReport(id, formData);
    loadReports();
  };

  if (error) return <ErrorState message={error} />;

  return (
    <MotionDiv className="feature-stack" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="feature-card">
        <div className="section-head">
          <h3>Markdown Report</h3>
          <div className="pill-tabs">
            {["edit", "preview", "split"].map((item) => (
              <button className={mode === item ? "active" : ""} onClick={() => setMode(item)} key={item}>{item}</button>
            ))}
          </div>
        </div>
        <div className={`markdown-workspace ${mode}`}>
          {mode !== "preview" && <textarea value={content} onChange={(e) => setContent(e.target.value)} />}
          {mode !== "edit" && <div className="markdown-preview"><ReactMarkdown>{content}</ReactMarkdown></div>}
        </div>
        <button onClick={submitReport}>Submit Report</button>
      </div>

      <div className="feature-card">
        <h3>Submitted Reports</h3>
        {reports.map((report) => (
          <div className="report-row" key={report.id}>
            <ReactMarkdown>{report.content}</ReactMarkdown>
            <br></br>
            <small>Status: {report.status}</small>
            {report.feedback && <p className="feedback">Feedback: {report.feedback}</p>}
            <input type="file" onChange={(e) => e.target.files[0] && uploadFile(report.id, e.target.files[0])} />
            {canReview && (
              <div className="feedback-form">
                <input value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Write feedback" />
                <button onClick={() => submitFeedback(report.id)}>Send Feedback</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </MotionDiv>
  );
};

export const AnalyticsPage = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [selectedRange, setSelectedRange] = useState("Month");

  useEffect(() => {
    let active = true;

    const loadAnalytics = async () => {
      try {
        const [overviewData, dashboardData] = await Promise.all([
          api.analyticsOverview(),
          api.dashboard(user?.role || "student"),
        ]);
        if (active) {
          setOverview(overviewData);
          setDashboard(dashboardData);
          setLastUpdated(formatShortDateTime(new Date()));
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      }
    };

    loadAnalytics();
    const intervalId = window.setInterval(loadAnalytics, DASHBOARD_REFRESH_INTERVAL);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [user?.role]);

  if (error) return <ErrorState message={error} />;
  if (!overview || !dashboard) return <LoadingState />;

  const tasks = dashboard.tasks || [];
  const reports = dashboard.reports || [];
  const visibleTasks = filterItemsByRange(tasks, selectedRange, getTaskSourceDate);
  const visibleReports = filterItemsByRange(reports, selectedRange, (report) => report.submitted_at);
  const completedTasks = tasks.filter((task) => task.status === "Done").length;
  const completionRate = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const weeklyProgress = buildWeeklyProgress(visibleTasks, visibleReports, selectedRange);
  const categoryPerformance = buildCategoryPerformance(visibleTasks);
  const isStudent = user?.role === "student";
  const chartTitle = isStudent ? "Weekly Study Progress" : "Team Progress";
  const comparisonTitle = isStudent ? "Course Load by Subject" : "Performance by Topic";

  return (
    <MotionDiv className="feature-stack" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="feature-grid stats-grid">
        <div className="feature-card stat-tile"><span>{isStudent ? "Assigned Tasks" : "Total Tasks"}</span><strong>{isStudent ? tasks.length : overview.total_tasks}</strong></div>
        <div className="feature-card stat-tile"><span>{isStudent ? "Completed" : "Done Tasks"}</span><strong>{isStudent ? completedTasks : overview.done_tasks}</strong></div>
        <div className="feature-card stat-tile"><span>{isStudent ? "Reports Sent" : "Students"}</span><strong>{isStudent ? reports.length : overview.total_students}</strong></div>
        <div className="feature-card stat-tile"><span>{isStudent ? "Completion Rate" : "Reports"}</span><strong>{isStudent ? `${completionRate}%` : overview.submitted_reports}</strong></div>
      </div>
      <div className="feature-grid">
        <div className="feature-card chart-card">
          <div className="chart-head">
            <h3>{chartTitle}</h3>
            <div className="chart-head-actions">
              <div className="pill-tabs chart-range-tabs">
                {ANALYTICS_RANGES.map((range) => (
                  <button
                    key={range}
                    type="button"
                    className={selectedRange === range ? "active" : ""}
                    onClick={() => setSelectedRange(range)}
                  >
                    {range}
                  </button>
                ))}
              </div>
              <span className="live-badge">Auto refresh {lastUpdated ? `- ${lastUpdated}` : ""}</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={weeklyProgress}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="progress" name="Progress" stroke="#2563eb" strokeWidth={3} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="feature-card chart-card">
          <div className="chart-head">
            <h3>{comparisonTitle}</h3>
            <span className="muted">{selectedRange} view</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryPerformance}>
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip content={<ChartTooltipContent />} />
              <Bar dataKey="performance" name="Performance" fill="#16a34a" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </MotionDiv>
  );
};

export const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");

  const loadNotifications = () => api.notifications().then(setNotifications).catch((err) => setError(err.message));

  useEffect(() => {
    let active = true;

    const refreshNotifications = async () => {
      try {
        const data = await api.notifications();
        if (active) {
          setNotifications(data);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      }
    };

    refreshNotifications();
    const intervalId = window.setInterval(refreshNotifications, DASHBOARD_REFRESH_INTERVAL);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const markRead = async (id) => {
    await api.readNotification(id);
    loadNotifications();
  };

  if (error) return <ErrorState message={error} />;

  return (
    <div className="feature-card">
      <h3>Notifications</h3>
      {notifications.map((notification) => (
        <div className={`notification-row ${notification.is_read ? "read" : ""}`} key={notification.id}>
          <p>{notification.message}</p>
          <button onClick={() => markRead(notification.id)}>Mark Read</button>
        </div>
      ))}
    </div>
  );
};

export const MyCoursesPage = () => {
  const navigate = useNavigate();
  const { enrolledCourses } = useCourses();
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("active");

  useEffect(() => {
    let mounted = true;
    api.tasks()
      .then((data) => mounted && setTasks(data))
      .catch((err) => mounted && setError(err.message));
    return () => {
      mounted = false;
    };
  }, []);

  if (error) return <ErrorState message={error} />;

  const enrichedCourses = enrolledCourses.map((course, index) => {
    const linkedTask = tasks[index % Math.max(1, tasks.length)];
    const derivedProgress = linkedTask ? (COURSE_PROGRESS_BY_STATUS[linkedTask.status] ?? 35) : 24 + ((index * 17) % 60);
    return {
      ...course,
      progress: Math.min(100, derivedProgress),
      deadline: linkedTask?.due_date,
      updatedAt: linkedTask?.updated_at,
      priority: linkedTask?.priority || course.level,
    };
  });
  const activeTabDef = MY_COURSE_TABS.find((tab) => tab.key === activeTab) || MY_COURSE_TABS[0];
  const visibleCourses = enrichedCourses.filter((course, index) => activeTabDef.matcher(course, index));

  return (
    <MotionDiv className="feature-stack modern-courses" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="courses-head-card">
        <div className="courses-head-top">
          <div>
            <p className="eyebrow">Enrollment</p>
            <h3>My Courses</h3>
          </div>
          <div className="courses-head-actions">
            <button type="button" className="ghost-btn" onClick={() => navigate("/courses")}>
              <Filter size={15} />
              Explore Catalog
            </button>
            <button type="button" className="primary-btn" onClick={() => navigate("/courses")}>
              <Plus size={15} />
              Add New Course
            </button>
          </div>
        </div>

        <div className="tab-row">
          {MY_COURSE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? "active" : ""}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label} ({enrichedCourses.filter((course, index) => tab.matcher(course, index)).length})
            </button>
          ))}
        </div>
      </div>

      <div className="modern-courses-grid">
        {visibleCourses.map((course, index) => {
          return (
            <article className="course-tile" key={course.id}>
              <div className={`course-banner variant-${(index % 4) + 1}`}>
                <span>{course.category}</span>
              </div>
              <div className="course-body">
                <div className="course-title-row">
                  <h4>{trimTitle(course.title)}</h4>
                  <button type="button" className="icon-only-btn" aria-label="More options">
                    <MoreVertical size={16} />
                  </button>
                </div>
                <div className="progress-line">
                  <i style={{ width: `${course.progress}%` }} />
                  <strong>{course.progress}%</strong>
                </div>
                <div className="course-meta">
                  <small><CalendarDays size={14} /> Next Deadline: {formatDueDate(course.deadline)}</small>
                  <small><Clock3 size={14} /> Last Accessed: {formatRecency(course.updatedAt)}</small>
                </div>
                <button type="button" className="outline-btn" onClick={() => navigate("/courses")}>
                  Continue Learning
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {!visibleCourses.length && (
        <div className="feature-card empty-enrollment-card">
          <h4>{enrichedCourses.length ? "No courses in this filter yet." : "No purchased courses yet."}</h4>
          <p className="muted">Explore the public catalog, add a course to cart, and after payment it will appear here automatically.</p>
          <button type="button" className="primary-btn" onClick={() => navigate("/courses")}>Explore Courses</button>
        </div>
      )}
      <button type="button" className="floating-page-add" aria-label="Add" onClick={() => navigate("/courses")}>+</button>
    </MotionDiv>
  );
};

const TASK_MANAGER_COLUMNS = [
  { key: "To Do", label: "To-do" },
  { key: "In Progress", label: "In Progress" },
  { key: "Done", label: "Completed" },
];

const TaskManagerCard = ({ task, onMove }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "TASK_MANAGER_CARD",
    item: { id: task.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [task.id]);

  const isDone = task.status === "Done";
  const progress = COURSE_PROGRESS_BY_STATUS[task.status] ?? 24;

  return (
    <div ref={drag} className={`manager-card priority-${task.priority.toLowerCase()} ${isDone ? "is-done" : ""}`} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <div className="manager-card-top">
        <span className={`manager-priority ${isDone ? "done" : task.priority.toLowerCase()}`}>
          {isDone ? "Completed" : `${task.priority} Priority`}
        </span>
        <button type="button" className="icon-only-btn" aria-label="Move to next status" onClick={() => onMove(task.id)}>
          <MoreVertical size={15} />
        </button>
      </div>
      <h4>{task.title}</h4>
      <p>{task.description}</p>
      {!isDone && (
        <div className="manager-progress">
          <i style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="manager-card-meta">
        <span><GraduationCap size={12} /> {(task.tags || "").split(",")[0] || "General"}</span>
        <span><CalendarDays size={12} /> {shortDeadline(task.due_date)}</span>
      </div>
    </div>
  );
};

const TaskManagerColumn = ({ status, label, tasks, onDropTask, onMove }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "TASK_MANAGER_CARD",
    drop: (item) => onDropTask(item.id, status),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }), [status, onDropTask]);

  return (
    <section ref={drop} className={`manager-column ${isOver ? "is-over" : ""}`}>
      <div className="manager-column-head">
        <h3>{label} <span>{tasks.length}</span></h3>
      </div>
      <div className="manager-card-stack">
        {tasks.map((task) => <TaskManagerCard task={task} key={task.id} onMove={onMove} />)}
      </div>
    </section>
  );
};

export const TaskManagerPage = ({ canCreate }) => {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [quickForm, setQuickForm] = useState({ title: "", dueDate: "", priority: "Medium", tags: "CS-101" });
  const [taskWindow, setTaskWindow] = useState(30);

  useEffect(() => {
    let mounted = true;
    api.tasks()
      .then((data) => mounted && setTasks(data))
      .catch((err) => mounted && setError(err.message));
    return () => {
      mounted = false;
    };
  }, []);

  const updateTaskStatus = async (id, status) => {
    const previous = tasks;
    setTasks((items) => items.map((task) => (task.id === id ? { ...task, status } : task)));
    const movedTask = tasks.find((task) => task.id === id);
    if (typeof id === "string" && id.startsWith("local-")) return;
    try {
      await api.updateTask(id, { status });
    } catch (err) {
      setTasks(previous);
      setError(err.message);
      if (movedTask) {
        setMessage(`Could not move "${movedTask.title}".`);
      }
    }
  };

  const moveToNextStatus = (id) => {
    const statusOrder = ["To Do", "In Progress", "Done"];
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const currentIndex = statusOrder.indexOf(task.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    updateTaskStatus(id, nextStatus);
  };

  const submitQuickTask = async (event) => {
    event.preventDefault();
    if (!quickForm.title.trim()) return;
    const payload = {
      title: quickForm.title.trim(),
      description: quickForm.title.trim(),
      priority: quickForm.priority,
      status: "To Do",
      tags: quickForm.tags,
      due_date: quickForm.dueDate ? new Date(quickForm.dueDate).toISOString() : null,
    };

    try {
      const created = canCreate ? await api.createTask(payload) : null;
      if (created) {
        setTasks((items) => [created, ...items]);
        setMessage("Task added.");
      } else {
        const localTask = {
          ...payload,
          id: `local-${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setTasks((items) => [localTask, ...items]);
        setMessage("Task added locally for this session.");
      }
    } catch (err) {
      if (err.message.includes("Students cannot create tasks")) {
        const localTask = {
          ...payload,
          id: `local-${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setTasks((items) => [localTask, ...items]);
        setMessage("Task added locally for this session.");
      } else {
        setError(err.message);
      }
    }

    setQuickForm({ title: "", dueDate: "", priority: "Medium", tags: quickForm.tags });
  };

  if (error) return <ErrorState message={error} />;

  const now = new Date();
  const filteredTasks = tasks.filter((task) => {
    const sourceDate = getTaskSourceDate(task);
    if (!sourceDate) return true;
    const taskDate = new Date(sourceDate);
    const windowStart = startOfDay(addDays(now, -(taskWindow - 1)));
    return taskDate >= windowStart;
  });
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dailyWorkload = weekdayLabels.map((day, index) => {
    const count = filteredTasks.filter((task) => {
      const sourceDate = getTaskSourceDate(task);
      return sourceDate ? new Date(sourceDate).getDay() === index : false;
    }).length;
    return { day, count, active: index === new Date().getDay() };
  });
  const maxDailyCount = Math.max(1, ...dailyWorkload.map((item) => item.count));
  const barData = dailyWorkload.map((item) => ({
    ...item,
    value: item.count ? Math.max(18, Math.round((item.count / maxDailyCount) * 100)) : 10,
  }));

  const loadByTag = filteredTasks.reduce((accumulator, task) => {
    const key = ((task.tags || "").split(",")[0] || "General").trim();
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  const loadRows = Object.entries(loadByTag)
    .slice(0, 3)
    .map(([name, count], index) => ({
      name,
      percentage: Math.max(10, Math.min(85, Math.round((count / Math.max(1, filteredTasks.length)) * 100))),
      tone: index % 3,
    }));
  const openTasks = filteredTasks.filter((task) => task.status !== "Done");
  const nextMilestone = [...openTasks].sort((left, right) => new Date(left.due_date || 0) - new Date(right.due_date || 0))[0];
  const milestoneProgress = filteredTasks.length ? Math.round((filteredTasks.filter((task) => task.status === "Done").length / filteredTasks.length) * 100) : 0;
  const milestoneTitle = nextMilestone?.title || "No pending milestone";
  const milestoneDetail = nextMilestone ? `${getTaskTopic(nextMilestone)} - ${shortDeadline(nextMilestone.due_date)}` : "Add or receive a task to start tracking progress.";

  return (
    <MotionDiv className="feature-stack modern-task-manager" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <form className="feature-card manager-quick-add" onSubmit={submitQuickTask}>
        <label className="manager-search">
          <Search size={16} />
          <input
            value={quickForm.title}
            onChange={(event) => setQuickForm({ ...quickForm, title: event.target.value })}
            placeholder="Quickly add a task..."
          />
        </label>
        <label className="manager-pill-select">
          <CalendarDays size={14} />
          <input
            type="date"
            value={quickForm.dueDate}
            onChange={(event) => setQuickForm({ ...quickForm, dueDate: event.target.value })}
          />
        </label>
        <label className="manager-pill-select">
          <FolderClosed size={14} />
          <select value={quickForm.priority} onChange={(event) => setQuickForm({ ...quickForm, priority: event.target.value })}>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Critical</option>
          </select>
        </label>
        <input type="text" className="manager-hidden-tag" value={quickForm.tags} onChange={(event) => setQuickForm({ ...quickForm, tags: event.target.value })} />
        <button type="submit" className="primary-btn">Add Task</button>
      </form>
      {message && <p className="muted manager-msg">{message}</p>}

      <DndProvider backend={HTML5Backend}>
        <div className="manager-board">
          {TASK_MANAGER_COLUMNS.map((column) => (
            <TaskManagerColumn
              key={column.key}
              status={column.key}
              label={column.label}
              tasks={tasks.filter((task) => column.key === "Done" ? task.status === "Done" : task.status === column.key)}
              onDropTask={updateTaskStatus}
              onMove={moveToNextStatus}
            />
          ))}
        </div>
      </DndProvider>

      <div className="manager-insights-grid">
        <div className="feature-card velocity-card">
          <div className="velocity-head">
            <h4>Academic Performance Velocity</h4>
            <button
              type="button"
              onClick={() => {
                const currentIndex = TASK_WINDOW_OPTIONS.indexOf(taskWindow);
                const nextWindow = TASK_WINDOW_OPTIONS[(currentIndex + 1) % TASK_WINDOW_OPTIONS.length];
                setTaskWindow(nextWindow);
              }}
            >
              Last {taskWindow} Days <ChevronDown size={14} />
            </button>
          </div>
          <div className="velocity-bars">
            {barData.map((bar) => (
              <div key={bar.day} className="velocity-bar-item" title={`${bar.day}: ${bar.count} task${bar.count === 1 ? "" : "s"} in the last ${taskWindow} days`}>
                <div className={`velocity-bar ${bar.active ? "active" : ""}`} style={{ height: `${bar.value}%` }} />
                <span className={bar.active ? "active" : ""}>{bar.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="manager-side-stack">
          <div className="feature-card milestone-card">
            <small>Next Milestone</small>
            <h4>{milestoneTitle}</h4>
            <p><strong>{milestoneProgress}%</strong> Overall Progress</p>
            <button type="button">{milestoneDetail}</button>
          </div>

          <div className="feature-card load-card">
            <h5>Course Load Breakdown</h5>
            {loadRows.length ? loadRows.map((row) => (
              <div className="load-row" key={row.name}>
                <div className="load-row-top">
                  <span>{row.name}</span>
                  <strong>{row.percentage}%</strong>
                </div>
                <div className="load-track">
                  <i className={`tone-${row.tone}`} style={{ width: `${row.percentage}%` }} />
                </div>
              </div>
            )) : <p className="muted">No tagged tasks yet.</p>}
          </div>
        </div>
      </div>
    </MotionDiv>
  );
};

export const SettingsPage = ({ user, onUserUpdate }) => {
  const [form, setForm] = useState({
    name: user?.name || "",
    bio: user?.bio || "",
    notification_email: user?.notification_email ?? true,
    notification_push: user?.notification_push ?? true,
    avatar: user?.avatar || "",
  });
  const [message, setMessage] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    const updated = await api.updateProfile({
      name: form.name,
      bio: form.bio,
      notification_email: form.notification_email,
      notification_push: form.notification_push,
    });
    const merged = { ...updated, avatar: form.avatar };
    onUserUpdate?.(merged);
    localStorage.setItem("lumina_user", JSON.stringify(merged));
    setMessage("Settings saved successfully.");
  };

  const onUploadAvatar = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((prev) => ({ ...prev, avatar: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <form className="feature-card settings-form settings-modern" onSubmit={submit}>
      <h3>Profile Settings</h3>
      <div className="avatar-editor">
        <img src={form.avatar || "https://i.pravatar.cc/120?img=12"} alt="Profile" />
        <div className="avatar-actions">
          <label className="outline-btn file-btn">
            Upload Photo
            <input type="file" accept="image/*" onChange={onUploadAvatar} />
          </label>
          <button type="button" className="ghost-btn" onClick={() => setForm((prev) => ({ ...prev, avatar: "" }))}>
            Remove
          </button>
        </div>
      </div>

      <label>Full name</label>
      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <label>Bio</label>
      <textarea value={form.bio || ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
      <label className="checkbox-line"><input type="checkbox" checked={form.notification_email} onChange={(e) => setForm({ ...form, notification_email: e.target.checked })} /> Email notifications</label>
      <label className="checkbox-line"><input type="checkbox" checked={form.notification_push} onChange={(e) => setForm({ ...form, notification_push: e.target.checked })} /> Push notifications</label>
      <button type="submit" className="primary-btn">Save Settings</button>
      {message && <p className="success-message">{message}</p>}
    </form>
  );
};

export const UsersPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState(user?.role === "mentor" ? "student" : "all");

  useEffect(() => {
    let mounted = true;
    api.users()
      .then((data) => mounted && setUsers(data))
      .catch((err) => mounted && setError(err.message));
    return () => {
      mounted = false;
    };
  }, []);

  if (error) return <ErrorState message={error} />;
  const normalizedQuery = query.trim().toLowerCase();
  const isMentor = user?.role === "mentor";
  const title = isMentor ? "My Students" : "Users";
  const filteredUsers = users.filter((entry) => {
    if (isMentor && entry.role !== "student") return false;
    if (roleFilter !== "all" && entry.role !== roleFilter) return false;
    if (!normalizedQuery) return true;
    return [entry.name, entry.email, entry.role].join(" ").toLowerCase().includes(normalizedQuery);
  });

  return (
    <div className="feature-card">
      <div className="section-head">
        <div>
          <h3>{title}</h3>
          <small>{filteredUsers.length} result{filteredUsers.length === 1 ? "" : "s"}</small>
        </div>
        <div className="pill-tabs">
          {[
            { key: isMentor ? "student" : "all", label: isMentor ? "Students" : "All" },
            ...(isMentor ? [] : [
              { key: "student", label: "Students" },
              { key: "mentor", label: "Mentors" },
              { key: "admin", label: "Admins" },
            ]),
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              className={roleFilter === item.key ? "active" : ""}
              onClick={() => setRoleFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={isMentor ? "Search students..." : "Search users..."}
      />
      <table className="feature-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.name}</td>
              <td>{entry.email}</td>
              <td>{entry.role}</td>
              <td>{new Date(entry.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!filteredUsers.length && <p className="muted">No matching users found for the selected filter.</p>}
    </div>
  );
};

export const PlannerPage = () => {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    api.tasks()
      .then((data) => mounted && setTasks(data))
      .catch((err) => mounted && setError(err.message));
    return () => {
      mounted = false;
    };
  }, []);

  if (error) return <ErrorState message={error} />;

  return (
    <div className="feature-card">
      <h3>Smart Study Planner</h3>
      <p className="muted">Suggested order based on deadlines and priorities.</p>
      {[...tasks]
        .sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0))
        .map((task, index) => (
          <div className="planner-row" key={task.id}>
            <span>{index + 1}</span>
            <p>{task.title}</p>
            <small>{task.priority} - {task.status}</small>
          </div>
        ))}
    </div>
  );
};
