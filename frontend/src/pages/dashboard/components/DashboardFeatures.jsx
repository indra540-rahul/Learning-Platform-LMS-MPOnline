import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  BellRing,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  CalendarDays,
  CalendarClock,
  ClipboardPenLine,
  Clock3,
  FileCheck2,
  Filter,
  FolderClosed,
  GraduationCap,
  History,
  ListTodo,
  MessagesSquare,
  MoreVertical,
  Mail,
  Phone,
  Plus,
  Route,
  Search,
  Sparkles,
  Target,
  Trash2,
  UserCog,
  Users,
  WandSparkles,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
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
const ADMIN_OVERVIEW_REFRESH_EVENT = "admin-overview-refresh";
const ANALYTICS_RANGES = ["Week", "Month", "Year"];
const TASK_WINDOW_OPTIONS = [7, 30, 90];
const MY_COURSE_TABS = [
  { key: "all", label: "All Courses", matcher: () => true },
  { key: "active", label: "Active", matcher: (course) => course.progress < 100 },
  { key: "mastery", label: "Mastery Track", matcher: (course) => course.progress >= 80 },
  { key: "recent", label: "Recently Added", matcher: (course, index) => index < 3 },
];
const COURSE_PROGRESS_BY_STATUS = {
  "To Do": 0,
  "In Progress": 60,
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

const getDeadlineLabel = (date) => {
  if (!date) return "Flexible";
  const due = new Date(date);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const dayDiff = Math.floor((due - now) / (1000 * 60 * 60 * 24));
  if (dayDiff < 0) return "Overdue";
  if (dayDiff === 0) return "Due today";
  if (dayDiff === 1) return "Due tomorrow";
  return shortDeadline(date);
};

const trimTitle = (title) => {
  if (!title) return "Untitled Course";
  return title.length > 32 ? `${title.slice(0, 32)}...` : title;
};

const toPercent = (value) => `${Math.max(0, Math.min(100, Math.round(value)))}%`;
const clampProgress = (value) => Math.max(0, Math.min(100, Number(value) || 0));
const getTaskProgress = (task) => clampProgress(task?.progress ?? COURSE_PROGRESS_BY_STATUS[task?.status] ?? 0);

const formatShortDateTime = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatMinutes = (value) => {
  const total = Math.max(0, Number(value) || 0);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
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
    const progress = bucketTasks.length ? Math.round(bucketTasks.reduce((sum, task) => sum + getTaskProgress(task), 0) / bucketTasks.length) : 0;

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
    accumulator[topic].performance += getTaskProgress(task);
    return accumulator;
  }, {});

  const rows = Object.values(grouped)
    .map((row) => ({
      department: row.department,
      performance: Math.round(row.performance / Math.max(1, row.total)),
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
  const [performance, setPerformance] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadOverview = async () => {
      try {
        const [dashboardData, overviewData, performanceData] = await Promise.all([
          api.dashboard(role),
          api.analyticsOverview(),
          api.analyticsPerformance(),
        ]);
        if (active) {
          setDashboard(dashboardData);
          setOverview(overviewData);
          setPerformance(performanceData);
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
    const activeTasks = tasks.filter((task) => task.status !== "Done");
    const doneTasks = tasks.filter((task) => task.status === "Done").length;
    const inProgressTasks = tasks.filter((task) => ["In Progress", "Review"].includes(task.status)).length;
    const reviewTasks = tasks.filter((task) => task.status === "Review").length;
    const upcomingTasks = tasks.filter((task) => task.status === "To Do").length;
    const overdueTasks = activeTasks.filter((task) => task.due_date && new Date(task.due_date) < startOfDay(new Date())).length;
    const completion = tasks.length ? tasks.reduce((sum, task) => sum + getTaskProgress(task), 0) / tasks.length : 0;
    const reportCompletion = tasks.length ? (reports.length / tasks.length) * 100 : reports.length ? 100 : 0;
    const studyStreak = Math.max(1, doneTasks + inProgressTasks);
    const recentTasks = [...activeTasks]
      .sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0))
      .slice(0, 4);
    const nextDeadlineTask = [...activeTasks]
      .filter((task) => task.due_date)
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];
    const progressRings = [
      { label: "Course completion", value: completion, tone: "violet" },
      { label: "Report cadence", value: reportCompletion, tone: "gold" },
      { label: "Weekly focus", value: tasks.length ? ((inProgressTasks + doneTasks) / tasks.length) * 100 : 0, tone: "teal" },
    ];
    const snapshotItems = [
      { label: "Open workload", value: activeTasks.length, icon: Target },
      { label: "In review", value: reviewTasks, icon: CheckCircle2 },
      { label: "Unread alerts", value: dashboard.unread_notifications ?? overview.unread_notifications ?? 0, icon: BellRing },
      { label: "Overdue", value: overdueTasks, icon: Clock3 },
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
                  <small>{shortDeadline(task.due_date)} - {task.status}</small>
                </div>
                <strong>{task.priority}</strong>
              </div>
            )) : <p className="muted">No active study tasks right now.</p>}
          </section>

          <section className="feature-card student-insight-card">
            <p className="eyebrow">Snapshot</p>
            <h4>Your dashboard is now showing live progress.</h4>
            <div className="student-insight-grid">
              {snapshotItems.map((item) => {
                const Icon = item.icon;
                return (
                  <article className="student-insight-tile" key={item.label}>
                    <span className="student-insight-icon">
                      <Icon size={16} />
                    </span>
                    <div>
                      <small>{item.label}</small>
                      <strong>{item.value}</strong>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="student-deadline-card">
              <div className="student-deadline-head">
                <span className="student-insight-icon">
                  <CalendarClock size={16} />
                </span>
                <div>
                  <small>Next live deadline</small>
                  <strong>{nextDeadlineTask?.title || "No urgent deadline queued"}</strong>
                </div>
              </div>
              <p>
                {nextDeadlineTask
                  ? `${getDeadlineLabel(nextDeadlineTask.due_date)} · ${nextDeadlineTask.priority} priority`
                  : "Your active roadmap is clear right now. New tasks will appear here when assigned or rebuilt."}
              </p>
            </div>
            <div className="student-metric-list">
              <p>Tasks completed <strong>{overview.done_tasks}</strong></p>
              <p>Reports submitted <strong>{overview.submitted_reports}</strong></p>
              <p>Completion status <strong>{toPercent(completion)}</strong></p>
            </div>
            <div className="student-mentor-compact">
              <span>Assigned mentor</span>
              <strong>{dashboard.assigned_mentor?.name || "Waiting for admin assignment"}</strong>
              <small>{dashboard.assigned_mentor?.mentor_speciality || "Request a mentor from the Mentor Desk when you need domain guidance."}</small>
            </div>
            <button type="button" className="primary-btn student-catalog-btn" onClick={() => navigate("/courses")}>
              Explore Courses
            </button>
          </section>
        </div>
      </MotionDiv>
    );
  }

  if (role === "mentor") {
    const students = dashboard.students || [];
    const tasks = dashboard.tasks || [];
    const reports = dashboard.reports || [];
    const activeTasks = tasks.filter((task) => task.status !== "Done");
    const reviewTasks = tasks.filter((task) => task.status === "Review");
    const pendingReports = reports.filter((report) => report.status === "Submitted");
    const overdueTasks = activeTasks.filter((task) => task.due_date && new Date(task.due_date) < startOfDay(new Date()));
    const completion = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + getTaskProgress(task), 0) / tasks.length) : 0;
    const studentTaskCounts = students.map((student) => {
      const studentTasks = tasks.filter((task) => task.assigned_to === student.id);
      const studentReports = reports.filter((report) => report.student_id === student.id);
      return {
        id: student.id,
        name: student.name,
        tasks: studentTasks.length,
        reports: studentReports.length,
        pending: studentTasks.filter((task) => task.status !== "Done").length,
      };
    }).sort((left, right) => right.pending - left.pending || right.tasks - left.tasks);
    const focusStudents = studentTaskCounts.slice(0, 4);
    const nextDeadlineTask = [...activeTasks]
      .filter((task) => task.due_date)
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];
    const mentorPulse = [
      { label: "Assigned students", value: students.length, icon: Users, tone: "violet" },
      { label: "Pending reviews", value: pendingReports.length, icon: FileCheck2, tone: "gold" },
      { label: "Active tasks", value: activeTasks.length, icon: ListTodo, tone: "teal" },
      { label: "Unread alerts", value: dashboard.unread_notifications ?? overview.unread_notifications ?? 0, icon: BellRing, tone: "violet" },
    ];
    const taskStatusData = STATUSES.map((status, index) => ({
      name: status,
      value: tasks.filter((task) => task.status === status).length,
      color: ["#4f46e5", "#0f9ca8", "#f59e0b", "#16a34a"][index],
    })).filter((item) => item.value > 0);
    const reportStatusData = [
      { name: "Submitted", value: pendingReports.length, color: "#ef4444" },
      { name: "Reviewed", value: reports.filter((report) => report.status === "Reviewed").length, color: "#16a34a" },
    ].filter((item) => item.value > 0);
    const upcomingMentorFlow = [...activeTasks]
      .sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0))
      .slice(0, 5);

    return (
      <MotionDiv className="feature-stack mentor-overview-shell" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mentor-overview-topbar">
          <div>
            <strong>Mentor Workspace</strong>
          </div>
          <div className="mentor-overview-topbar-note">
            <h4>Overview Summary</h4>
          </div>
        </div>
        <section className="mentor-overview-hero">
          <div className="mentor-overview-copy">
            <p className="eyebrow">Mentor Command Center</p>
            <h3>Monitor learner momentum, unblock report reviews, and guide your assigned students from one live dashboard.</h3>
            <p className="muted">
              This overview is fully backend-driven. It pulls assigned students, their task flow, submitted reports, unread mentor alerts, and topic performance so you can decide where to mentor next.
            </p>
          </div>
          <div className="mentor-overview-hero-stats">
            <article>
              <span><Users size={18} /></span>
              <small>Coverage</small>
              <strong>{students.length ? `${students.length} active learners` : "No assigned students"}</strong>
            </article>
            <article>
              <span><Target size={18} /></span>
              <small>Completion</small>
              <strong>{completion}% mentoring progress</strong>
            </article>
            <article>
              <span><CalendarClock size={18} /></span>
              <small>Next deadline</small>
              <strong>{nextDeadlineTask ? getDeadlineLabel(nextDeadlineTask.due_date) : "No live deadline"}</strong>
            </article>
          </div>
        </section>

        <div className="mentor-overview-metric-grid">
          {mentorPulse.map((item) => {
            const Icon = item.icon;
            return (
              <article className="mentor-overview-metric-card" key={item.label}>
                <span className={`mentor-overview-metric-icon tone-${item.tone}`}><Icon size={18} /></span>
                <small>{item.label}</small>
                <strong>{item.value}</strong>
              </article>
            );
          })}
        </div>

        <div className="mentor-overview-grid">
          <section className="feature-card mentor-overview-panel mentor-overview-line-panel">
            <div className="section-head">
              <div>
                <h3>Topic Performance</h3>
                <small>Live backend performance by subject tags across your assigned students.</small>
              </div>
              <span className="report-meta-pill">{performance.length} topics</span>
            </div>
            <div className="mentor-overview-chart">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={performance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbe7f5" />
                  <XAxis dataKey="department" tick={{ fill: "#55627c", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#55627c", fontSize: 12 }} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="progress" name="Avg progress" fill="#4f46e5" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="performance" name="Completion score" fill="#0f9ca8" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="feature-card mentor-overview-panel mentor-overview-pie-panel">
            <div className="section-head">
              <div>
                <h3>Live Work Mix</h3>
                <small>See how task stages and report review states are split right now.</small>
              </div>
            </div>
            <div className="mentor-overview-pies">
              <div className="mentor-overview-pie-card">
                <small>Task stages</small>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={taskStatusData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={3}>
                      {taskStatusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mentor-overview-pie-card">
                <small>Report review status</small>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={reportStatusData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={3}>
                      {reportStatusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </div>

        <div className="mentor-overview-grid">
          <section className="feature-card mentor-overview-panel">
            <div className="section-head">
              <div>
                <h3>Student Focus Queue</h3>
                <small>The students carrying the highest current mentoring workload.</small>
              </div>
            </div>
            <div className="mentor-focus-list">
              {focusStudents.length ? focusStudents.map((student, index) => (
                <article className="mentor-focus-item" key={student.id}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{student.name}</strong>
                    <small>{student.pending} active task{student.pending === 1 ? "" : "s"} · {student.reports} report{student.reports === 1 ? "" : "s"}</small>
                  </div>
                  <b>{student.tasks} total</b>
                </article>
              )) : (
                <p className="muted">No students are assigned to this mentor yet.</p>
              )}
            </div>
          </section>

          <section className="feature-card mentor-overview-panel">
            <div className="section-head">
              <div>
                <h3>Upcoming Student Flow</h3>
                <small>The next backend deadlines you may want to discuss with learners.</small>
              </div>
              <span className="report-meta-pill">{upcomingMentorFlow.length} tracked</span>
            </div>
            <div className="mentor-focus-list">
              {upcomingMentorFlow.length ? upcomingMentorFlow.map((task, index) => {
                const student = students.find((entry) => entry.id === task.assigned_to);
                return (
                  <article className="mentor-focus-item" key={task.id}>
                    <span>{index + 1}</span>
                    <div>
                      <strong>{task.title}</strong>
                      <small>{student?.name || "Assigned student"} · {getDeadlineLabel(task.due_date)} · {getTaskProgress(task)}% progress</small>
                    </div>
                    <b>{task.priority}</b>
                  </article>
                );
              }) : (
                <p className="muted">No active student deadlines are queued right now.</p>
              )}
            </div>
          </section>
        </div>

        <section className="feature-card mentor-overview-summary-panel">
          <div className="mentor-summary-ribbon">
            <div>
              <small>Backend summary</small>
              <strong>{overview.total_tasks} tracked tasks · {overview.submitted_reports} submitted reports · {overview.done_tasks} completed outcomes</strong>
            </div>
            <button type="button" className="primary-btn" onClick={() => navigate("/mentor/reports")}>
              Review Reports
            </button>
          </div>
          <div className="mentor-summary-grid">
            <article>
              <span>Students needing attention</span>
              <strong>{Math.max(pendingReports.length, overdueTasks.length)}</strong>
              <small>Based on submitted reports and overdue active tasks.</small>
            </article>
            <article>
              <span>Review lane</span>
              <strong>{reviewTasks.length}</strong>
              <small>Tasks already nearing completion and ready for mentor inspection.</small>
            </article>
            <article>
              <span>Unread mentor alerts</span>
              <strong>{dashboard.unread_notifications ?? overview.unread_notifications ?? 0}</strong>
              <small>Notifications scoped to this mentor account only.</small>
            </article>
          </div>
        </section>
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

const TaskCard = ({ task, assigneeName }) => {
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
      {task.source_type === "planner" && <div className="task-assignee-chip">Planner roadmap task</div>}
      {assigneeName && <div className="task-assignee-chip">Assigned to: {assigneeName}</div>}
      <div className="tag-row">
        {(task.tags || "").split(",").filter(Boolean).map((tag) => <span key={tag}>{tag.trim()}</span>)}
      </div>
      <small>Progress: {getTaskProgress(task)}%</small>
      <small>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : "Not set"}</small>
    </div>
  );
};

const KanbanColumn = ({ status, tasks, onDropTask, userLookup }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "TASK",
    drop: (item) => onDropTask(item.id, status),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }), [status, onDropTask]);

  return (
    <div ref={drop} className={`kanban-column ${isOver ? "is-over" : ""}`}>
      <h3>{status}</h3>
      {tasks.map((task) => <TaskCard task={task} assigneeName={userLookup[task.assigned_to]} key={task.id} />)}
    </div>
  );
};

export const TasksPage = ({ canCreate, searchTerm = "" }) => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "",
    difficulty: "",
    estimated_minutes: "",
    tags: "",
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
      const updated = await api.updateTask(id, { status });
      setTasks((items) => items.map((task) => task.id === id ? updated : task));
    } catch (err) {
      setTasks(previous);
      setError(err.message);
    }
  };

  const submitTask = async (event) => {
    event.preventDefault();
    try {
      await api.createTask({
        ...form,
        estimated_minutes: Number(form.estimated_minutes) || 90,
        assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      });
      setForm({ title: "", description: "", priority: "", difficulty: "", estimated_minutes: "", tags: "", assigned_to: "", due_date: "" });
      setMessage("Task created and added to the assignment board.");
      loadTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  if (error) return <ErrorState message={error} />;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const studentUsers = users.filter((user) => user.role === "student");
  const userLookup = studentUsers.reduce((lookup, user) => {
    lookup[user.id] = user.name;
    return lookup;
  }, {});
  const visibleTasks = tasks.filter((task) => {
    if (!normalizedSearch) return true;
    return [task.title, task.description, task.priority, task.status, task.tags]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  });

  return (
    <MotionDiv className="feature-stack" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {canCreate && (
        <section className="feature-card page-hero-card">
          <div className="page-hero-copy">
            <p className="eyebrow">Task Operations</p>
            <h3>Plan workload, assign students, and control the live task pipeline.</h3>
            <p className="muted">
              Use this page when you need to create new work, assign it to students, and move it across `To Do`, `In Progress`, `Review`, and `Done` without leaving the admin workspace.
            </p>
          </div>
          <div className="page-hero-stats">
            <article>
              <span><ListTodo size={18} /></span>
              <small>Use case</small>
              <strong>Task assignment</strong>
            </article>
            <article>
              <span><Route size={18} /></span>
              <small>Workflow</small>
              <strong>Kanban tracking</strong>
            </article>
            <article>
              <span><Target size={18} /></span>
              <small>Outcome</small>
              <strong>Student execution</strong>
            </article>
          </div>
        </section>
      )}
      {canCreate && (
        <form className="feature-card form-grid assignment-board-form" onSubmit={submitTask}>
          <div className="assignment-board-head">
            <div>
              <h3>Create Task</h3>
              <p className="muted">Use this board to assign work to students and move it across status lanes. Students should update detailed progress from their task manager workspace.</p>
            </div>
          </div>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title" required />
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" required />
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} required>
            <option value="" disabled>Select priority</option>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Critical</option>
          </select>
          <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} required>
            <option value="" disabled>Select difficulty</option>
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
          <select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} required>
            <option value="" disabled>Assign student</option>
            {studentUsers.map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}
          </select>
          <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          <input type="number" min="15" step="15" value={form.estimated_minutes} onChange={(e) => setForm({ ...form, estimated_minutes: e.target.value })} placeholder="Estimated minutes" />
          <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="tags,comma,separated" />
          <button type="submit">Create Task</button>
          {message && <p className="success-message assignment-board-message">{message}</p>}
        </form>
      )}

      {!canCreate && (
        <div className="feature-card assignment-board-note">
          <h3>Assignment Board</h3>
          <p className="muted">This Kanban board is mainly for admins and mentors to watch task flow by status. Students should use Task Manager to update progress and time spent, and those updates feed the wider dashboard.</p>
        </div>
      )}

      <DndProvider backend={HTML5Backend}>
        <div className="kanban-board">
          {STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={visibleTasks.filter((task) => task.status === status)}
              onDropTask={updateTaskStatus}
              userLookup={userLookup}
            />
          ))}
        </div>
      </DndProvider>
    </MotionDiv>
  );
};

export const ReportsPage = ({ canReview, searchTerm = "", defaultShowSubmitted = true }) => {
  const [reports, setReports] = useState([]);
  const [reportStudents, setReportStudents] = useState([]);
  const [content, setContent] = useState("# Weekly Study Report\n\nWhat I studied:\n\nChallenges:\n\nNext plan:");
  const [mode, setMode] = useState("split");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [feedbackDrafts, setFeedbackDrafts] = useState({});
  const [showSubmitted, setShowSubmitted] = useState(defaultShowSubmitted);

  const loadReports = async () => {
    try {
      const [reportData, userData] = await Promise.all([
        api.reports(),
        canReview ? api.users() : Promise.resolve([]),
      ]);
      setReports(reportData);
      setReportStudents(canReview ? userData : []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.reports(),
      canReview ? api.users() : Promise.resolve([]),
    ])
      .then(([reportData, userData]) => {
        if (!mounted) return;
        setReports(reportData);
        setReportStudents(canReview ? userData : []);
      })
      .catch((err) => mounted && setError(err.message));
    return () => {
      mounted = false;
    };
  }, [canReview]);

  const submitReport = async () => {
    await api.createReport({ content });
    setMessage("Report submitted successfully.");
    loadReports();
  };

  const submitFeedback = async (id) => {
    const feedback = feedbackDrafts[id] || "";
    if (!feedback.trim()) return;
    await api.feedback(id, { feedback });
    setFeedbackDrafts((current) => ({ ...current, [id]: "" }));
    setMessage("Feedback sent.");
    loadReports();
  };

  const uploadFile = async (id, file) => {
    const formData = new FormData();
    formData.append("file", file);
    await api.uploadReport(id, formData);
    setMessage("Attachment uploaded.");
    loadReports();
  };

  const deleteReport = async (id) => {
    await api.deleteReport(id);
    setMessage("Report deleted successfully.");
    loadReports();
  };

  if (error) return <ErrorState message={error} />;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const studentLookup = reportStudents.reduce((lookup, student) => {
    lookup[student.id] = student;
    return lookup;
  }, {});
  const visibleReports = reports.filter((report) => {
    const submitter = studentLookup[report.student_id];
    if (!normalizedSearch) return true;
    return [
      report.content,
      report.feedback,
      report.status,
      submitter?.name,
      submitter?.email,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  });
  const reviewedReports = reports.filter((report) => report.status === "Reviewed").length;
  const attachedReports = reports.filter((report) => report.file_path).length;
  const latestReport = reports[0];
  const draftWords = content.trim() ? content.trim().split(/\s+/).length : 0;
  const guidanceCards = [
    {
      title: "Status tracking",
      copy: "Instantly see which reports are still pending review and which ones are already closed with feedback.",
      icon: BadgeCheck,
      tone: "blue",
    },
    {
      title: "Attachment history",
      copy: "Every report card keeps the uploaded proof file visible, so mentors can verify supporting work quickly.",
      icon: FileCheck2,
      tone: "gold",
    },
    {
      title: "Feedback loop",
      copy: "Replies from mentors or admins stay attached to the same report card, making the review conversation easy to follow.",
      icon: MessagesSquare,
      tone: "teal",
    },
  ];

  return (
    <MotionDiv className="feature-stack" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <section className="feature-card page-hero-card">
        <div className="page-hero-copy">
          <p className="eyebrow">{canReview ? "Review Workspace" : "Report Workspace"}</p>
          <h3>{canReview ? "Inspect submissions, review content, and respond with structured feedback." : "Draft, preview, and submit progress reports from one guided workspace."}</h3>
          <p className="muted">
            {canReview
              ? "This page is used by admins or mentors to validate submitted work, track attachments, and send feedback that stays attached to the same report thread."
              : "This page is used to write your weekly study summary, preview the final markdown layout, and submit updates that mentors can review later."}
          </p>
        </div>
        <div className="page-hero-stats">
          <article>
            <span><ClipboardPenLine size={18} /></span>
            <small>Mode</small>
            <strong>{canReview ? "Review flow" : "Draft flow"}</strong>
          </article>
          <article>
            <span><FileCheck2 size={18} /></span>
            <small>Tracks</small>
            <strong>Reports and files</strong>
          </article>
          <article>
            <span><MessagesSquare size={18} /></span>
            <small>Outcome</small>
            <strong>Feedback loop</strong>
          </article>
        </div>
      </section>
      <div className="reports-hero">
        <div className="feature-card reports-composer-card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Report Studio</p>
              <h3>{canReview ? "Review & Respond" : "Write Weekly Report"}</h3>
              <p className="muted reports-composer-copy">
                {canReview ? "Open the draft, inspect the live preview, and respond with precise feedback." : "Draft your weekly learning update with a guided split view and submit it once the summary looks right."}
              </p>
            </div>
            <div className="pill-tabs">
              {["edit", "preview", "split"].map((item) => (
                <button className={mode === item ? "active" : ""} onClick={() => setMode(item)} key={item}>{item}</button>
              ))}
            </div>
          </div>
          <div className="reports-editor-ribbon">
            <div className="reports-ribbon-chip">
              <ClipboardPenLine size={16} />
              <span>Draft panel</span>
            </div>
            <div className="reports-ribbon-chip">
              <Sparkles size={16} />
              <span>Live markdown preview</span>
            </div>
          </div>
          <div className={`markdown-workspace ${mode}`}>
            {mode !== "preview" && <textarea value={content} onChange={(e) => setContent(e.target.value)} />}
            {mode !== "edit" && <div className="markdown-preview"><ReactMarkdown>{content}</ReactMarkdown></div>}
          </div>
          <div className="reports-composer-foot">
            <div className="reports-draft-meta">
              <span>{draftWords} words</span>
              <span>{latestReport ? `Last submitted ${formatRecency(latestReport.submitted_at)}` : "No previous submission yet"}</span>
            </div>
            <button onClick={submitReport} className="primary-btn">Submit Report</button>
          </div>
          {message && <p className="success-message">{message}</p>}
        </div>

        <div className="reports-side-stack">
          <div className="feature-card reports-stat-card">
            <small>Live Report Summary</small>
            <div className="reports-stat-grid">
              <div>
                <span>Total Reports</span>
                <strong>{reports.length}</strong>
              </div>
              <div>
                <span>Reviewed</span>
                <strong>{reviewedReports}</strong>
              </div>
              <div>
                <span>Attachments</span>
                <strong>{attachedReports}</strong>
              </div>
              <div>
                <span>Pending</span>
                <strong>{Math.max(0, reports.length - reviewedReports)}</strong>
              </div>
            </div>
          </div>

          <div className="feature-card reports-guidance-card">
            <div className="reports-guidance-head">
              <div className="reports-guidance-icon">
                <GraduationCap size={20} />
              </div>
              <div>
                <h4>What This Area Means</h4>
                <p className="muted">This panel explains what updates refresh automatically from the backend once a report is submitted or reviewed.</p>
              </div>
            </div>
            <div className="reports-guidance-list">
              {guidanceCards.map((item) => {
                const Icon = item.icon;
                return (
                  <div className={`reports-guidance-item tone-${item.tone}`} key={item.title}>
                    <span className="reports-guidance-item-icon"><Icon size={18} /></span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.copy}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="feature-card">
        <div className="section-head">
          <div>
            <h3>Submitted Reports</h3>
            <small>{visibleReports.length} visible item{visibleReports.length === 1 ? "" : "s"}</small>
          </div>
          <button type="button" className="outline-btn" onClick={() => setShowSubmitted((current) => !current)}>
            {showSubmitted ? "Hide Submitted Reports" : "Show Submitted Reports"}
          </button>
        </div>
        {showSubmitted ? (
          <div className="reports-list">
            {visibleReports.map((report) => {
              const submitter = studentLookup[report.student_id];
              return (
                <article className="report-card" key={report.id}>
                  {canReview && (
                    <div className="report-submitter-chip">
                      <span>Submitted by</span>
                      <strong>{submitter?.name || "Student"}</strong>
                      <small>{submitter?.email || `User ID ${report.student_id}`}</small>
                    </div>
                  )}
                  <div className="report-card-head">
                    <div>
                      <span className={`report-status report-status-${report.status.toLowerCase()}`}>{report.status}</span>
                      <h4>Report #{report.id}</h4>
                      <p className="muted">Submitted {formatShortDateTime(report.submitted_at)}{report.reviewed_at ? ` - Reviewed ${formatShortDateTime(report.reviewed_at)}` : ""}</p>
                    </div>
                    <div className="report-card-side">
                      <div className="report-meta-pill">
                        {report.file_path ? "Attachment added" : "No attachment yet"}
                      </div>
                      {!canReview && (
                        <button
                          type="button"
                          className="report-delete-btn"
                          onClick={() => deleteReport(report.id)}
                          aria-label={`Delete report ${report.id}`}
                          title="Delete report"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="report-markdown-shell">
                    <ReactMarkdown>{report.content}</ReactMarkdown>
                  </div>

                  {report.feedback && <p className="feedback">Feedback: {report.feedback}</p>}

                  <div className="report-actions-row">
                    <label className="outline-btn file-btn">
                      Upload Attachment
                      <input type="file" onChange={(e) => e.target.files[0] && uploadFile(report.id, e.target.files[0])} />
                    </label>
                    {report.file_path && <small className="muted">Saved file: {report.file_path.split(/[\\/]/).pop()}</small>}
                  </div>

                  {canReview && (
                    <div className="feedback-form report-feedback-form">
                      <input
                        value={feedbackDrafts[report.id] || ""}
                        onChange={(e) => setFeedbackDrafts((current) => ({ ...current, [report.id]: e.target.value }))}
                        placeholder="Write feedback"
                      />
                      <button onClick={() => submitFeedback(report.id)}>Send Feedback</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="reports-collapsed-state">
            <p className="muted">Submitted reports are hidden here until you choose to open them.</p>
          </div>
        )}
      </div>
    </MotionDiv>
  );
};

export const AnalyticsPage = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [selectedRange, setSelectedRange] = useState("Month");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  useEffect(() => {
    let active = true;

    const loadAnalytics = async () => {
      try {
        const filterParams = selectedStudentId ? { student_id: Number(selectedStudentId) } : {};
        const requests = [
          api.analyticsOverview(filterParams),
          api.dashboard(user?.role || "student", filterParams),
        ];
        if (user?.role === "admin" || user?.role === "mentor") {
          requests.push(api.users());
        }
        const [overviewData, dashboardData, userData = []] = await Promise.all(requests);
        if (active) {
          setOverview(overviewData);
          setDashboard(dashboardData);
          setStudents((userData || []).filter((entry) => entry.role === "student"));
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
  }, [selectedStudentId, user?.role]);

  if (error) return <ErrorState message={error} />;
  if (!overview || !dashboard) return <LoadingState />;

  const tasks = dashboard.tasks || [];
  const reports = dashboard.reports || [];
  const visibleTasks = filterItemsByRange(tasks, selectedRange, getTaskSourceDate);
  const visibleReports = filterItemsByRange(reports, selectedRange, (report) => report.submitted_at);
  const completedTasks = tasks.filter((task) => task.status === "Done").length;
  const completionRate = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + getTaskProgress(task), 0) / tasks.length) : 0;
  const weeklyProgress = buildWeeklyProgress(visibleTasks, visibleReports, selectedRange);
  const categoryPerformance = buildCategoryPerformance(visibleTasks);
  const isAdmin = user?.role === "admin";
  const isMentor = user?.role === "mentor";
  const isStudent = user?.role === "student";
  const selectedStudent = students.find((entry) => String(entry.id) === String(selectedStudentId));
  const chartTitle = isAdmin
    ? selectedStudent ? "Selected Student Progress" : "Team Progress"
    : isStudent ? "Weekly Study Progress" : "Team Progress";
  const comparisonTitle = isAdmin
    ? selectedStudent ? "Selected Student Topics" : "Performance by Topic"
    : isStudent ? "Course Load by Subject" : "Performance by Topic";
  const pageTitle = isAdmin
    ? selectedStudent ? `${selectedStudent.name}'s Progress Workspace` : "Track platform progress or focus on one student at a time."
    : isMentor
      ? selectedStudent ? `${selectedStudent.name}'s Learning Analytics` : "Review progress across your assigned students from one mentor view."
    : isStudent ? "Your live progress, reports, and subject performance in one place." : "Review live learning progress across your assigned student workload.";
  const pageDescription = isAdmin
    ? selectedStudent
      ? "This filtered view is backend-scoped to the selected student, so tasks, reports, and progress charts all refresh from that student's real records."
      : "Use this page to review overall performance, then switch the student filter to inspect one learner's backend progress without changing the default team view."
    : isMentor
      ? selectedStudent
        ? "This filtered mentor view is driven by the selected assigned student's backend tasks and reports, so the charts reflect that learner only."
        : "Use this page to compare the progress of your assigned students, then switch the learner filter to inspect one student in detail."
    : isStudent
      ? "This page shows your real task completion, report activity, and topic performance based on your current backend records."
      : "This page summarizes task flow and subject performance for the work visible to your mentor account.";
  const statThreeLabel = isAdmin
    ? (selectedStudent ? "Student View" : "Students")
    : isMentor
      ? (selectedStudent ? "Focused Student" : "Assigned Students")
      : (isStudent ? "Reports Sent" : "Students");
  const statThreeValue = isAdmin
    ? (selectedStudent ? selectedStudent.name : overview.total_students)
    : isMentor
      ? (selectedStudent ? selectedStudent.name : overview.total_students)
      : (isStudent ? reports.length : overview.total_students);
  const statFourLabel = isAdmin
    ? (selectedStudent ? "Student Reports" : "Reports")
    : isMentor
      ? (selectedStudent ? "Student Reports" : "Team Reports")
      : (isStudent ? "Completion Rate" : "Reports");
  const statFourValue = isAdmin || isMentor ? overview.submitted_reports : (isStudent ? `${completionRate}%` : overview.submitted_reports);

  return (
    <MotionDiv className="feature-stack" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <section className="feature-card page-hero-card analytics-hero-card">
        <div className="page-hero-copy">
          <p className="eyebrow">Progress Intelligence</p>
          <h3>{pageTitle}</h3>
          <p className="muted">{pageDescription}</p>
        </div>
        <div className="page-hero-stats analytics-hero-actions">
          {isAdmin || isMentor ? (
            <>
              <article className="analytics-filter-card analytics-filter-card-wide">
                <span><Filter size={18} /></span>
                <small>{isAdmin ? "Student Filter" : "Assigned Student"}</small>
                <strong>{selectedStudent ? selectedStudent.name : isAdmin ? "All Students" : "All Assigned Students"}</strong>
                <select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
                  <option value="">{isAdmin ? "All students" : "All assigned students"}</option>
                  {students.map((entry) => (
                    <option key={entry.id} value={entry.id}>{entry.name}</option>
                  ))}
                </select>
              </article>
              <article>
                <span><Target size={18} /></span>
                <small>Data Scope</small>
                <strong>{selectedStudent ? "One learner" : isAdmin ? "Full platform" : "Assigned cohort"}</strong>
              </article>
              <article>
                <span><BadgeCheck size={18} /></span>
                <small>Refresh</small>
                <strong>{lastUpdated || "Live"}</strong>
              </article>
            </>
          ) : (
            <>
              <article>
                <span><Target size={18} /></span>
                <small>Scope</small>
                <strong>{isStudent ? "My workspace" : "Assigned learners"}</strong>
              </article>
              <article>
                <span><BadgeCheck size={18} /></span>
                <small>Refresh</small>
                <strong>{lastUpdated || "Live"}</strong>
              </article>
              <article>
                <span><GraduationCap size={18} /></span>
                <small>Use case</small>
                <strong>{isStudent ? "Progress tracking" : "Progress oversight"}</strong>
              </article>
            </>
          )}
        </div>
      </section>
      <div className="feature-grid stats-grid">
        <div className="feature-card stat-tile"><span>{isStudent ? "Assigned Tasks" : "Total Tasks"}</span><strong>{isStudent ? tasks.length : overview.total_tasks}</strong></div>
        <div className="feature-card stat-tile"><span>{isStudent ? "Completed" : "Done Tasks"}</span><strong>{isStudent ? completedTasks : overview.done_tasks}</strong></div>
        <div className="feature-card stat-tile"><span>{statThreeLabel}</span><strong>{statThreeValue}</strong></div>
        <div className="feature-card stat-tile"><span>{statFourLabel}</span><strong>{statFourValue}</strong></div>
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

export const NotificationsPage = ({ searchTerm = "" }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

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
    setBusyId(id);
    try {
      await api.readNotification(id);
      loadNotifications();
    } finally {
      setBusyId(null);
    }
  };

  const clearNotification = async (id) => {
    setBusyId(id);
    try {
      await api.deleteNotification(id);
      loadNotifications();
    } finally {
      setBusyId(null);
    }
  };

  if (error) return <ErrorState message={error} />;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleNotifications = notifications.filter((notification) => {
    if (!normalizedSearch) return true;
    return notification.message.toLowerCase().includes(normalizedSearch);
  });
  const unreadCount = visibleNotifications.filter((notification) => !notification.is_read).length;
  const readCount = visibleNotifications.length - unreadCount;
  const latestNotification = visibleNotifications[0];
  const notificationStats = [
    { label: "Unread", value: unreadCount, icon: BellRing },
    { label: "Read", value: readCount, icon: BadgeCheck },
    { label: "Latest", value: latestNotification ? formatRecency(latestNotification.created_at) : "Quiet", icon: Clock3 },
  ];

  return (
    <MotionDiv className="feature-stack notifications-shell" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <section className="feature-card notifications-hero">
        <div className="notifications-hero-copy">
          <p className="eyebrow">Notification Center</p>
          <h3>{user?.role === "admin" ? "Admin inbox for your own actions and alerts." : "Your live workspace alerts and updates."}</h3>
          <p className="muted">
            This inbox is now user-scoped, so you only see notifications generated for your own account.
          </p>
        </div>
        <div className="notifications-stat-grid">
          {notificationStats.map((item) => {
            const Icon = item.icon;
            return (
              <article className="notifications-stat-tile" key={item.label}>
                <span className="notifications-stat-icon"><Icon size={18} /></span>
                <small>{item.label}</small>
                <strong>{item.value}</strong>
              </article>
            );
          })}
        </div>
      </section>

      <section className="feature-card notifications-panel">
        <div className="section-head notifications-panel-head">
          <div>
            <h3>Notifications</h3>
            <small>{visibleNotifications.length} message{visibleNotifications.length === 1 ? "" : "s"} in this inbox</small>
          </div>
        </div>

        {!visibleNotifications.length && <p className="muted">No notifications found right now.</p>}
        <div className="notifications-list">
          {visibleNotifications.map((notification) => (
            <article className={`notification-row notification-row-modern ${notification.is_read ? "read" : ""}`} key={notification.id}>
              <div className="notification-main">
                <span className={`notification-icon-badge ${notification.is_read ? "is-read" : "is-unread"}`}>
                  {notification.is_read ? <BadgeCheck size={18} /> : <BellRing size={18} />}
                </span>
                <div className="notification-copy">
                  <div className="notification-copy-head">
                    <p>{notification.message}</p>
                    <span className={`notification-state-pill ${notification.is_read ? "read" : "unread"}`}>
                      {notification.is_read ? "Read" : "Unread"}
                    </span>
                  </div>
                  <small>{formatShortDateTime(notification.created_at)}</small>
                </div>
              </div>
              <div className="notification-actions">
                <button onClick={() => markRead(notification.id)} disabled={notification.is_read || busyId === notification.id}>
                  {notification.is_read ? "Read" : "Mark Read"}
                </button>
                <button
                  type="button"
                  className="notification-clear-btn"
                  onClick={() => clearNotification(notification.id)}
                  disabled={busyId === notification.id}
                >
                  Clear
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </MotionDiv>
  );
};

export const MyCoursesPage = ({ searchTerm = "" }) => {
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
    const derivedProgress = linkedTask ? getTaskProgress(linkedTask) : 24 + ((index * 17) % 60);
    return {
      ...course,
      progress: Math.min(100, derivedProgress),
      deadline: linkedTask?.due_date,
      updatedAt: linkedTask?.updated_at,
      priority: linkedTask?.priority || course.level,
    };
  });
  const completedCourses = enrichedCourses.filter((course) => course.progress >= 100).length;
  const activeCourses = enrichedCourses.filter((course) => course.progress < 100).length;
  const averageProgress = enrichedCourses.length
    ? Math.round(enrichedCourses.reduce((sum, course) => sum + course.progress, 0) / enrichedCourses.length)
    : 0;
  const activeTabDef = MY_COURSE_TABS.find((tab) => tab.key === activeTab) || MY_COURSE_TABS[0];
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleCourses = enrichedCourses.filter((course, index) => {
    const matchesTab = activeTabDef.matcher(course, index);
    if (!matchesTab) return false;
    if (!normalizedSearch) return true;
    return [course.title, course.category, course.summary, course.mentor, course.level]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  });

  const continueLearning = (course) => {
    if (!course?.learningUrl) {
      navigate("/courses");
      return;
    }

    if (/^https?:\/\//i.test(course.learningUrl)) {
      window.location.assign(course.learningUrl);
      return;
    }

    navigate(course.learningUrl);
  };

  return (
    <MotionDiv className="feature-stack modern-courses" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="courses-head-card">
        <div className="courses-head-top">
          <div>
            <p className="eyebrow">Enrollment</p>
            <h3>My Courses</h3>
            <p className="muted">Track purchased learning tracks with their real cover art, progress, mentor, and latest linked deadline.</p>
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

        <div className="courses-head-stats">
          <article>
            <span>Purchased</span>
            <strong>{enrichedCourses.length}</strong>
          </article>
          <article>
            <span>Active</span>
            <strong>{activeCourses}</strong>
          </article>
          <article>
            <span>Completed</span>
            <strong>{completedCourses}</strong>
          </article>
          <article>
            <span>Avg progress</span>
            <strong>{averageProgress}%</strong>
          </article>
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
              <div className={`course-banner variant-${(index % 4) + 1}`} style={{ backgroundImage: `linear-gradient(180deg, rgba(10, 15, 35, 0.08) 0%, rgba(10, 15, 35, 0.55) 100%), url(${course.image})` }}>
                <span>{course.category}</span>
                <div className="course-banner-bottom">
                  <strong>{course.badge}</strong>
                  <small>{course.level}</small>
                </div>
              </div>
              <div className="course-body">
                <div className="course-title-row">
                  <h4>{trimTitle(course.title)}</h4>
                  <button type="button" className="icon-only-btn" aria-label="More options">
                    <MoreVertical size={16} />
                  </button>
                </div>
                <div className="course-chip-row">
                  <span><BadgeCheck size={13} /> {course.mentor}</span>
                  <span><Sparkles size={13} /> Purchased {formatShortDateTime(course.purchasedAt)}</span>
                </div>
                <div className="progress-line">
                  <i style={{ width: `${course.progress}%` }} />
                  <strong>{course.progress}%</strong>
                </div>
                <div className="course-meta">
                  <small><CalendarDays size={14} /> Next Deadline: {formatDueDate(course.deadline)}</small>
                  <small><Clock3 size={14} /> Last Accessed: {formatRecency(course.updatedAt)}</small>
                </div>
                <div className="course-outcomes">
                  {(course.outcomes || []).slice(0, 2).map((outcome) => (
                    <span key={`${course.id}-${outcome}`}>{outcome}</span>
                  ))}
                </div>
                <button type="button" className="outline-btn" onClick={() => continueLearning(course)}>
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
  { key: "To Do", label: "To-do", note: "Tasks waiting to be started" },
  { key: "In Progress", label: "In Progress", note: "Active work with live progress updates" },
  { key: "Review", label: "Review", note: "Work waiting for final check or wrap-up" },
  { key: "Done", label: "Completed", note: "Finished work saved for reporting" },
];

const TaskManagerCard = ({ task, onMove, onProgressSave, onTimeSave, canEditProgress }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "TASK_MANAGER_CARD",
    item: { id: task.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [task.id]);

  const isDone = task.status === "Done";
  const progress = getTaskProgress(task);
  const [draftProgress, setDraftProgress] = useState(progress);
  const [draftMinutes, setDraftMinutes] = useState(task.time_spent_minutes || 0);
  const workloadLeft = Math.max(0, (task.estimated_minutes || 0) - (task.time_spent_minutes || 0));
  const completedMinutes = Math.max(0, Math.round(((task.estimated_minutes || 0) * progress) / 100));
  const remainingPercent = Math.max(0, 100 - progress);

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
      {task.source_type === "planner" && <small className="manager-source-note">Planner roadmap task</small>}
      {!isDone && (
        <div className="manager-progress-shell">
          <div className="manager-progress-head">
            <span>Focus Progress</span>
            <strong>{progress}%</strong>
          </div>
          <div className="manager-progress">
            <i style={{ width: `${progress}%` }} />
          </div>
          <div className="manager-progress-stats">
            <div>
              <small>Work done</small>
              <strong>{progress}%</strong>
              <span>{formatMinutes(completedMinutes)}</span>
            </div>
            <div>
              <small>Remaining</small>
              <strong>{remainingPercent}%</strong>
              <span>{formatMinutes(workloadLeft)}</span>
            </div>
          </div>
        </div>
      )}
      <div className="manager-progress-edit">
        <label htmlFor={`task-progress-${task.id}`}>Progress</label>
        <div className="manager-progress-inputs">
          <input
            id={`task-progress-${task.id}`}
            type="range"
            min="0"
            max="100"
            step="5"
            value={draftProgress}
            disabled={!canEditProgress}
            onChange={(event) => setDraftProgress(clampProgress(event.target.value))}
            onMouseUp={() => canEditProgress && onProgressSave(task.id, draftProgress)}
            onTouchEnd={() => canEditProgress && onProgressSave(task.id, draftProgress)}
          />
          <input
            type="number"
            min="0"
            max="100"
            value={draftProgress}
            disabled={!canEditProgress}
            onChange={(event) => setDraftProgress(clampProgress(event.target.value))}
            onBlur={() => canEditProgress && onProgressSave(task.id, draftProgress)}
          />
          <span>%</span>
        </div>
      </div>
      <div className="manager-progress-edit">
        <label htmlFor={`task-time-${task.id}`}>Time Spent</label>
        <div className="manager-progress-inputs">
          <input
            id={`task-time-${task.id}`}
            type="range"
            min="0"
            max={Math.max(60, task.estimated_minutes || 60)}
            step="15"
            value={draftMinutes}
            disabled={!canEditProgress}
            onChange={(event) => setDraftMinutes(Math.max(0, Number(event.target.value) || 0))}
            onMouseUp={() => canEditProgress && onTimeSave(task.id, draftMinutes)}
            onTouchEnd={() => canEditProgress && onTimeSave(task.id, draftMinutes)}
          />
          <input
            type="number"
            min="0"
            step="15"
            value={draftMinutes}
            disabled={!canEditProgress}
            onChange={(event) => setDraftMinutes(Math.max(0, Number(event.target.value) || 0))}
            onBlur={() => canEditProgress && onTimeSave(task.id, draftMinutes)}
          />
          <span>min</span>
        </div>
      </div>
      <div className="manager-card-summary-line">
        <small>{progress}% completed and {remainingPercent}% remaining.</small>
        <small>Estimated load: {formatMinutes(task.estimated_minutes || 0)}</small>
      </div>
      <div className="manager-card-meta">
        <span><GraduationCap size={12} /> {(task.tags || "").split(",")[0] || "General"}</span>
        <span>{task.difficulty} - {formatMinutes(task.estimated_minutes || 0)}</span>
        <span><CalendarDays size={12} /> {shortDeadline(task.due_date)}</span>
      </div>
    </div>
  );
};

const TaskManagerColumn = ({ status, label, note, tasks, onDropTask, onMove, onProgressSave, onTimeSave, canEditProgress }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "TASK_MANAGER_CARD",
    drop: (item) => onDropTask(item.id, status),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }), [status, onDropTask]);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const visibleTasks = showAllTasks ? tasks : tasks.slice(0, 1);

  return (
    <section ref={drop} className={`manager-column ${isOver ? "is-over" : ""}`}>
      <div className="manager-column-head">
        <div>
          <h3>{label} <span>{tasks.length}</span></h3>
          <p>{note}</p>
        </div>
      </div>
      <div className="manager-card-stack">
        {visibleTasks.map((task) => (
          <TaskManagerCard
            task={task}
            key={`${task.id}-${task.updated_at || task.progress || 0}`}
            onMove={onMove}
            onProgressSave={onProgressSave}
            onTimeSave={onTimeSave}
            canEditProgress={canEditProgress}
          />
        ))}
        {!tasks.length && <div className="manager-empty-slot">Drop tasks here to keep this lane updated.</div>}
        {tasks.length > 1 && (
          <button
            type="button"
            className="manager-column-toggle"
            onClick={() => setShowAllTasks((current) => !current)}
          >
            {showAllTasks ? "See less" : "See more"}
            <ChevronDown size={16} className={showAllTasks ? "is-open" : ""} />
          </button>
        )}
      </div>
    </section>
  );
};

export const TaskManagerPage = ({ canCreate, searchTerm = "" }) => {
  const [tasks, setTasks] = useState([]);
  const [plannerSummary, setPlannerSummary] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [quickForm, setQuickForm] = useState({ title: "", dueDate: "", priority: "Medium", difficulty: "Medium", estimatedMinutes: 90, tags: "CS-101" });
  const [taskWindow, setTaskWindow] = useState(30);

  const reloadWorkspace = async () => {
    const [taskData, summaryData] = await Promise.all([api.tasks(), api.plannerSummary()]);
    setTasks(taskData);
    setPlannerSummary(summaryData);
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([api.tasks(), api.plannerSummary()])
      .then(([taskData, summaryData]) => {
        if (!mounted) return;
        setTasks(taskData);
        setPlannerSummary(summaryData);
      })
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
      const updated = await api.updateTask(id, { status });
      setTasks((items) => items.map((task) => (task.id === id ? updated : task)));
      await reloadWorkspace();
    } catch (err) {
      setTasks(previous);
      setError(err.message);
      if (movedTask) {
        setMessage(`Could not move "${movedTask.title}".`);
      }
    }
  };

  const updateTaskProgress = async (id, progress) => {
    if (typeof id === "string" && id.startsWith("local-")) return;
    const normalizedProgress = clampProgress(progress);
    const remainingProgress = Math.max(0, 100 - normalizedProgress);
    const previous = tasks;
    setTasks((items) => items.map((task) => (task.id === id ? { ...task, progress: normalizedProgress } : task)));
    try {
      const updated = await api.updateTask(id, { progress: normalizedProgress });
      setTasks((items) => items.map((task) => (task.id === id ? updated : task)));
      await reloadWorkspace();
      setMessage(`Progress saved: ${normalizedProgress}% done and ${remainingProgress}% remaining.`);
    } catch (err) {
      setTasks(previous);
      setError(err.message);
    }
  };

  const updateTaskTime = async (id, timeSpentMinutes) => {
    if (typeof id === "string" && id.startsWith("local-")) return;
    const normalizedMinutes = Math.max(0, Number(timeSpentMinutes) || 0);
    const previous = tasks;
    setTasks((items) => items.map((task) => (task.id === id ? { ...task, time_spent_minutes: normalizedMinutes } : task)));
    try {
      const updated = await api.updateTask(id, { time_spent_minutes: normalizedMinutes });
      setTasks((items) => items.map((task) => (task.id === id ? updated : task)));
      await reloadWorkspace();
      setMessage(`Study time logged: ${formatMinutes(normalizedMinutes)}.`);
    } catch (err) {
      setTasks(previous);
      setError(err.message);
    }
  };

  const moveToNextStatus = (id) => {
    const statusOrder = ["To Do", "In Progress", "Review", "Done"];
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const currentIndex = statusOrder.indexOf(task.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    updateTaskStatus(id, nextStatus);
  };

  const submitQuickTask = async (event) => {
    event.preventDefault();
    if (!canCreate) return;
    if (!quickForm.title.trim()) return;
    const payload = {
      title: quickForm.title.trim(),
      description: quickForm.title.trim(),
      priority: quickForm.priority,
      difficulty: quickForm.difficulty,
      estimated_minutes: Number(quickForm.estimatedMinutes) || 90,
      status: "To Do",
      tags: quickForm.tags,
      due_date: quickForm.dueDate ? new Date(quickForm.dueDate).toISOString() : null,
    };

    try {
      await api.createTask(payload);
      await reloadWorkspace();
      setMessage("Task added.");
    } catch (err) {
      setError(err.message);
    }

    setQuickForm({ title: "", dueDate: "", priority: "Medium", difficulty: "Medium", estimatedMinutes: 90, tags: quickForm.tags });
  };

  if (error) return <ErrorState message={error} />;
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const now = new Date();
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = !normalizedSearch || [task.title, task.description, task.priority, task.status, task.tags]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
    if (!matchesSearch) return false;
    const sourceDate = getTaskSourceDate(task);
    if (!sourceDate) return true;
    const taskDate = new Date(sourceDate);
    const windowStart = startOfDay(addDays(now, -(taskWindow - 1)));
    return taskDate >= windowStart;
  });
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
  const allOpenTasks = tasks.filter((task) => task.status !== "Done");
  const plannerRecommendations = plannerSummary?.daily_plan || [];
  const plannerQueue = plannerSummary?.priority_queue || [];
  const plannerTips = plannerSummary?.ai_suggestions || [];
  const roadmapTaskCount = openTasks.filter((task) => task.source_type === "planner").length;
  const dueNowCount = plannerRecommendations.filter((item) => item.due_label === "Due today" || item.due_label === "Overdue").length;
  const planSignals = [
    { label: "Focus blocks", value: plannerRecommendations.length, icon: BrainCircuit },
    { label: "Roadmap tasks", value: roadmapTaskCount, icon: Route },
    { label: "Due now", value: dueNowCount, icon: CalendarClock },
    { label: "Planned load", value: formatMinutes(plannerSummary?.planned_minutes || 0), icon: Target },
  ];
  const statusSummary = TASK_MANAGER_COLUMNS.map((column) => ({
    ...column,
    count: filteredTasks.filter((task) => column.key === "Done" ? task.status === "Done" : task.status === column.key).length,
  }));
  const dueSoonCount = openTasks.filter((task) => {
    if (!task.due_date) return false;
    const days = Math.floor((new Date(task.due_date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 3;
  }).length;
  const plannerQueueTasks = plannerQueue
    .map((item) => allOpenTasks.find((task) => task.title === item.title))
    .filter(Boolean);
  const fallbackQueueTasks = [...allOpenTasks]
    .filter((task) => !plannerQueueTasks.some((plannerTask) => plannerTask.id === task.id))
    .sort((left, right) => new Date(left.due_date || left.updated_at || 0) - new Date(right.due_date || right.updated_at || 0));
  const recentQueue = [...plannerQueueTasks, ...fallbackQueueTasks].slice(0, 4);
  const completionHistory = [...filteredTasks]
    .filter((task) => task.status === "Done")
    .sort((left, right) => new Date(right.updated_at || right.created_at || 0) - new Date(left.updated_at || left.created_at || 0));
  const completedHistoryCount = completionHistory.length;
  const milestoneTask = plannerQueue.length
    ? allOpenTasks.find((task) => task.title === plannerQueue[0].title)
    : [...allOpenTasks].sort((left, right) => new Date(left.due_date || 0) - new Date(right.due_date || 0))[0];
  const milestoneProgress = milestoneTask ? getTaskProgress(milestoneTask) : 0;
  const milestoneTitle = milestoneTask?.title || "No pending milestone";
  const milestoneDetail = milestoneTask
    ? `${getTaskTopic(milestoneTask)} - ${shortDeadline(milestoneTask.due_date)} - ${milestoneTask.status}`
    : "Add or receive a task to start tracking progress.";

  return (
    <MotionDiv className="feature-stack modern-task-manager" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {canCreate ? (
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
          <label className="manager-pill-select">
            <GraduationCap size={14} />
            <select value={quickForm.difficulty} onChange={(event) => setQuickForm({ ...quickForm, difficulty: event.target.value })}>
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </label>
          <label className="manager-pill-select">
            <Clock3 size={14} />
            <input
              type="number"
              min="15"
              step="15"
              value={quickForm.estimatedMinutes}
              onChange={(event) => setQuickForm({ ...quickForm, estimatedMinutes: event.target.value })}
            />
          </label>
          <input type="text" className="manager-hidden-tag" value={quickForm.tags} onChange={(event) => setQuickForm({ ...quickForm, tags: event.target.value })} />
          <button type="submit" className="primary-btn">Add Task</button>
        </form>
      ) : (
        <div className="feature-card manager-intro-card">
          <div className="manager-intro-icon"><CheckCircle2 size={22} /></div>
          <div className="manager-intro-copy">
            <h3>Update Your Task Progress</h3>
            <p className="muted">Enter progress directly on each task card. The same saved percentage is used in your progress section, analytics charts, and live workload insights.</p>
          </div>
        </div>
      )}
      {message && <p className="muted manager-msg">{message}</p>}

      <div className="feature-card manager-plan-card">
        <div className="manager-plan-head">
          <div>
            <p className="eyebrow">Plan Builder</p>
            <h3>Today's Rebuilt Plan</h3>
            <p className="muted">Your planner now translates backend roadmap logic into focused study blocks, and the same tasks stay synced with Task Manager and Kanban.</p>
          </div>
          {plannerSummary?.burnout_risk && (
            <span className={`planner-risk planner-risk-${plannerSummary.burnout_risk.toLowerCase()}`}>
              {plannerSummary.burnout_risk} Burnout Risk
            </span>
          )}
        </div>
        <div className="manager-plan-signals">
          {planSignals.map((signal) => {
            const Icon = signal.icon;
            return (
              <article className="manager-plan-signal" key={signal.label}>
                <span className="manager-plan-signal-icon"><Icon size={16} /></span>
                <div>
                  <small>{signal.label}</small>
                  <strong>{signal.value}</strong>
                </div>
              </article>
            );
          })}
        </div>

        {plannerRecommendations.length ? (
          <div className="manager-plan-grid">
            {plannerRecommendations.map((item, index) => (
              <article className="manager-plan-item" key={`${item.title}-${index}`}>
                <div className="manager-plan-step">{index + 1}</div>
                <div className="manager-plan-copy">
                  <h4>{item.title}</h4>
                  <p>{item.reason}</p>
                </div>
                <div className="manager-plan-meta">
                  <span>{item.due_label}</span>
                  <strong>{formatMinutes(item.recommended_minutes)}</strong>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">No rebuilt recommendations yet. Open Study Planner and rebuild the plan after setting your goal and study time.</p>
        )}

        {!!plannerTips.length && (
          <div className="manager-plan-tips">
            {plannerTips.map((tip) => (
              <div className="planner-tip" key={tip}>{tip}</div>
            ))}
          </div>
        )}
      </div>

      <DndProvider backend={HTML5Backend}>
        <div className="manager-board">
          {TASK_MANAGER_COLUMNS.map((column) => (
            <TaskManagerColumn
              key={column.key}
              status={column.key}
              label={column.label}
              note={column.note}
              tasks={filteredTasks.filter((task) => column.key === "Done" ? task.status === "Done" : task.status === column.key)}
              onDropTask={updateTaskStatus}
              onMove={moveToNextStatus}
              onProgressSave={updateTaskProgress}
              onTimeSave={updateTaskTime}
              canEditProgress
            />
          ))}
        </div>
      </DndProvider>

      <div className="manager-insights-grid">
        <div className="feature-card live-queue-card">
          <div className="velocity-head">
            <div>
              <h4>Live Workload Snapshot</h4>
              <p className="muted velocity-copy">This panel now uses your latest backend tasks and planner summary instead of an almost-empty weekday chart.</p>
            </div>
            <div className="velocity-head-actions">
              <button
                type="button"
                className="velocity-history-btn"
                onClick={() => setShowHistory((current) => !current)}
              >
                <History size={14} />
                {showHistory ? "Hide History" : "History"}
              </button>
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
          </div>

          <div className="live-snapshot-grid">
            <div className="live-snapshot-tile">
              <span>Open Tasks</span>
              <strong>{openTasks.length}</strong>
            </div>
            <div className="live-snapshot-tile">
              <span>Due in 3 Days</span>
              <strong>{dueSoonCount}</strong>
            </div>
            <div className="live-snapshot-tile">
              <span>Today's Focus</span>
              <strong>{formatMinutes(plannerSummary?.planned_minutes || 0)}</strong>
            </div>
            <div className="live-snapshot-tile">
              <span>Pending Today</span>
              <strong>{plannerSummary?.pending_today || 0}</strong>
            </div>
          </div>

          <div className="live-status-rows">
            {statusSummary.map((item) => (
              <div className="live-status-row" key={item.key}>
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.note}</p>
                </div>
                <span>{item.count}</span>
              </div>
            ))}
          </div>

          {showHistory && (
            <div className="completion-history-panel">
              <div className="completion-history-head">
                <div>
                  <h5>Completion History</h5>
                  <p>{completedHistoryCount} task{completedHistoryCount === 1 ? "" : "s"} completed successfully in this window.</p>
                </div>
                <span>{completedHistoryCount}</span>
              </div>
              <div className="completion-history-list">
                {completionHistory.length ? completionHistory.map((task) => (
                  <article className="completion-history-item" key={`done-${task.id}`}>
                    <div>
                      <strong>{task.title}</strong>
                      <p>Completed on {formatShortDateTime(task.updated_at || task.created_at)}</p>
                    </div>
                    <small>{formatMinutes(task.time_spent_minutes || task.estimated_minutes || 0)}</small>
                  </article>
                )) : (
                  <p className="muted">No completed tasks were saved in the current window yet.</p>
                )}
              </div>
            </div>
          )}

          <div className="live-queue-list">
            {recentQueue.map((task) => (
              <div className="live-queue-item" key={task.id}>
                <div>
                  <h5>{task.title}</h5>
                  <p>{task.priority} priority - {shortDeadline(task.due_date)}</p>
                </div>
                <div className="live-queue-progress">
                  <i style={{ width: `${Math.max(8, getTaskProgress(task))}%` }} />
                  <span>{getTaskProgress(task)}%</span>
                </div>
              </div>
            ))}
            {!recentQueue.length && (
              <p className="muted">No active backend tasks are in the current window.</p>
            )}
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
  const { syncUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    bio: user?.bio || "",
    contact_number: user?.contact_number || "",
    notification_email: user?.notification_email ?? true,
    notification_push: user?.notification_push ?? true,
    avatar: user?.avatar || "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const updated = await api.updateProfile({
        name: form.name,
        email: form.email,
        avatar: form.avatar || null,
        bio: form.bio,
        contact_number: form.contact_number || null,
        notification_email: form.notification_email,
        notification_push: form.notification_push,
      });
      const merged = syncUser(updated);
      onUserUpdate?.(merged);
      setMessage("Settings saved successfully.");
    } catch (err) {
      setError(err.message);
    }
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
    <MotionDiv className="feature-stack" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="settings-hero">
        <div className="feature-card settings-profile-card">
          <div className="avatar-editor">
            <img src={form.avatar || "https://i.pravatar.cc/120?img=12"} alt="Profile" />
            <div className="avatar-actions">
              <p className="eyebrow">Profile</p>
              <h3>{form.name || "Your workspace"}</h3>
              <p className="muted">{form.bio || "Add a short profile summary so your dashboard feels more personal."}</p>
              <div className="settings-action-row">
                <label className="outline-btn file-btn">
                  Upload Photo
                  <input type="file" accept="image/*" onChange={onUploadAvatar} />
                </label>
                <button type="button" className="ghost-btn" onClick={() => setForm((prev) => ({ ...prev, avatar: "" }))}>
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="feature-card settings-summary-card">
          <small>Account Overview</small>
          <div className="settings-summary-grid">
            <div className="settings-summary-tile">
              <span className="settings-summary-icon"><Mail size={18} /></span>
              <span>Email</span>
              <h2>{form.email || "Not set"}</h2>
            </div>
            <div className="settings-summary-tile">
              <span className="settings-summary-icon"><Phone size={18} /></span>
              <span>Contact</span>
              <h2>{form.contact_number || "Not set"}</h2>
            </div>
            <div className="settings-summary-tile">
              <span className="settings-summary-icon"><BellRing size={18} /></span>
              <span>Notifications</span>
              <h2>{form.notification_email ? "Email on" : "Email off"}</h2>
            </div>
            <div className="settings-summary-tile">
              <span className="settings-summary-icon"><UserCog size={18} /></span>
              <span>Role</span>
              <h2>{user?.role || "student"}</h2>
            </div>
          </div>
        </div>
      </div>

      <form className="feature-card settings-form settings-modern settings-grid" onSubmit={submit}>
        <div className="settings-section">
          <h3>Profile Settings</h3>
          <label>Full name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <label>Email address</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <label>Contact number</label>
          <input value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} placeholder="Add phone or contact number" />
          <label>Bio</label>
          <textarea value={form.bio || ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </div>

        <div className="settings-section">
          <h3>Notifications</h3>
          <label className="checkbox-line"><input type="checkbox" checked={form.notification_email} onChange={(e) => setForm({ ...form, notification_email: e.target.checked })} /> Email notifications</label>
          <label className="checkbox-line"><input type="checkbox" checked={form.notification_push} onChange={(e) => setForm({ ...form, notification_push: e.target.checked })} /> Push notifications</label>
        </div>

        <div className="settings-submit-row">
          <button type="submit" className="primary-btn">Save Settings</button>
          {message && <p className="success-message">{message}</p>}
          {error && <p className="error-card">{error}</p>}
        </div>
      </form>
    </MotionDiv>
  );
};

export const UsersPage = ({ searchTerm = "" }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [studentTasks, setStudentTasks] = useState([]);
  const [error, setError] = useState("");
  const [savingUserId, setSavingUserId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [activeTaskStudentId, setActiveTaskStudentId] = useState(null);
  const [assigningTaskStudentId, setAssigningTaskStudentId] = useState(null);
  const [taskToast, setTaskToast] = useState(null);
  const [taskDrafts, setTaskDrafts] = useState({});
  const [mountedAt] = useState(() => Date.now());

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.users(),
      user?.role === "mentor" ? api.tasks() : Promise.resolve([]),
    ])
      .then(([userData, taskData]) => {
        if (!mounted) return;
        setUsers(userData);
        setStudentTasks(taskData);
      })
      .catch((err) => mounted && setError(err.message));
    return () => {
      mounted = false;
    };
  }, [user?.role]);

  useEffect(() => {
    if (!taskToast) return undefined;
    const timeoutId = window.setTimeout(() => setTaskToast(null), 4500);
    return () => window.clearTimeout(timeoutId);
  }, [taskToast]);

  if (error) return <ErrorState message={error} />;
  const normalizedQuery = searchTerm.trim().toLowerCase();
  const isMentor = user?.role === "mentor";
  const isAdmin = user?.role === "admin";
  const title = isMentor ? "My Students" : "Users";

  const filteredUsers = users.filter((entry) => {
    if (entry.role !== "student") return false;
    if (!normalizedQuery) return true;
    return [entry.name, entry.email, entry.role].join(" ").toLowerCase().includes(normalizedQuery);
  });

  const onlineUsers = filteredUsers.filter((entry) => {
    const joined = new Date(entry.created_at);
    const daysSinceJoin = Math.round((mountedAt - joined.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceJoin <= 30;
  }).length;
  const oauthUsers = filteredUsers.filter((entry) => entry.oauth_provider).length;
  const roleBreakdown = [
    { label: "Students", value: filteredUsers.length },
    { label: "Assigned Mentors", value: filteredUsers.filter((entry) => entry.assigned_mentor_name).length },
    { label: "Recent Joiners", value: onlineUsers },
    { label: "OAuth Accounts", value: oauthUsers },
  ];
  const studentTaskMap = studentTasks.reduce((lookup, task) => {
    if (!task.assigned_to) return lookup;
    if (!lookup[task.assigned_to]) lookup[task.assigned_to] = [];
    lookup[task.assigned_to].push(task);
    return lookup;
  }, {});

  const handleRoleChange = async (id, role) => {
    setSavingUserId(id);
    try {
      const updated = await api.updateUser(id, { role });
      setUsers((current) => current.map((entry) => (entry.id === id ? updated : entry)));
      setTaskToast({ type: "success", text: "Student role updated successfully." });
      window.dispatchEvent(new CustomEvent(ADMIN_OVERVIEW_REFRESH_EVENT));
    } catch (err) {
      setTaskToast({ type: "error", text: err.message });
    } finally {
      setSavingUserId(null);
    }
  };

  const removeStudent = async (student) => {
    const shouldDelete = window.confirm(
      `Delete ${student.name}'s account? This removes the student and their related reports, enrollments, requests, and student tasks only.`,
    );
    if (!shouldDelete) return;

    setDeletingUserId(student.id);
    try {
      await api.deleteUser(student.id);
      setUsers((current) => current.filter((entry) => entry.id !== student.id));
      setStudentTasks((current) => current.filter((task) => task.assigned_to !== student.id));
      setTaskDrafts((current) => {
        if (!(student.id in current)) return current;
        const next = { ...current };
        delete next[student.id];
        return next;
      });
      setActiveTaskStudentId((current) => (current === student.id ? null : current));
      setTaskToast({ type: "success", text: `${student.name} was removed successfully.` });
      window.dispatchEvent(new CustomEvent(ADMIN_OVERVIEW_REFRESH_EVENT));
    } catch (err) {
      setTaskToast({ type: "error", text: err.message });
    } finally {
      setDeletingUserId(null);
    }
  };

  const updateTaskDraft = (studentId, key, value) => {
    setTaskDrafts((current) => ({
      ...current,
      [studentId]: {
        title: "",
        description: "",
        priority: "",
        difficulty: "",
        estimated_minutes: "",
        due_date: "",
        tags: "",
        ...(current[studentId] || {}),
        [key]: value,
      },
    }));
  };

  const assignTaskToStudent = async (student) => {
    const draft = taskDrafts[student.id] || {};
    if (!draft.title?.trim() || !draft.description?.trim()) {
      setTaskToast({ type: "error", text: "Add a title and description before assigning a mentor task." });
      return;
    }

    setAssigningTaskStudentId(student.id);
    try {
      const createdTask = await api.createTask({
        title: draft.title.trim(),
        description: draft.description.trim(),
        priority: draft.priority || "Medium",
        difficulty: draft.difficulty || "Medium",
        estimated_minutes: Number(draft.estimated_minutes) || 60,
        tags: draft.tags?.trim() || student.assigned_mentor_speciality || "mentor-guidance",
        assigned_to: student.id,
        due_date: draft.due_date || null,
      });
      setStudentTasks((current) => [createdTask, ...current]);
      setTaskDrafts((current) => ({ ...current, [student.id]: {} }));
      setActiveTaskStudentId(null);
      setTaskToast({ type: "success", text: `Task assigned to ${student.name} successfully.` });
    } catch (err) {
      setTaskToast({ type: "error", text: err.message });
    } finally {
      setAssigningTaskStudentId(null);
    }
  };

  return (
    <div className="feature-stack admin-users-shell">
      {taskToast && (
        <div className={`dashboard-toast ${taskToast.type === "error" ? "dashboard-toast-error" : ""}`}>
          {taskToast.text}
        </div>
      )}
      <section className="feature-card page-hero-card">
        <div className="page-hero-copy">
          <p className="eyebrow">{isMentor ? "Student Directory" : "User Management"}</p>
          <h3>{isMentor ? "Review student records, assign fresh work, and keep mentoring actions close to each learner." : "Manage student records, account status, and mentor visibility from one control panel."}</h3>
          <p className="muted">
            {isMentor
              ? "Use this page to scan assigned students, launch mentor-created tasks, and jump into report review or analytics for that learner without leaving the mentor workspace."
              : "Use this page to monitor user growth, review account types, inspect mentor mapping, and control role updates directly from the backend-driven directory."}
          </p>
        </div>
        <div className="page-hero-stats">
          <article>
            <span><UserCog size={18} /></span>
            <small>Focus</small>
            <strong>{isMentor ? "Student visibility" : "Account control"}</strong>
          </article>
          <article>
            <span><GraduationCap size={18} /></span>
            <small>Tracks</small>
            <strong>Mentor linkage</strong>
          </article>
          <article>
            <span><Sparkles size={18} /></span>
            <small>Use case</small>
            <strong>{isMentor ? "Student review" : "Admin governance"}</strong>
          </article>
        </div>
      </section>
      <div className="feature-card admin-users-hero">
        <div className="admin-users-hero-copy">
          <p className="eyebrow">{isMentor ? "Mentor Directory" : "User Control"}</p>
          <h3>{title}</h3>
          <p className="muted">Live user records from the backend with role filters, account type visibility, and joined-date tracking.</p>
        </div>
        <div className="admin-users-stat-grid">
          {roleBreakdown.map((item) => (
            <div className="admin-users-stat" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="feature-card admin-users-panel">
        <div className="section-head">
          <div>
            <h3>{title}</h3>
            <small>{filteredUsers.length} result{filteredUsers.length === 1 ? "" : "s"}</small>
          </div>
          <div className="pill-tabs">
            <button type="button" className="active">Students</button>
          </div>
        </div>

        <div className="admin-users-grid">
          {filteredUsers.map((entry) => (
            <article className="admin-user-card" key={entry.id}>
              <div className="admin-user-card-top">
                <div className="admin-user-avatar">{entry.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</div>
                <div className="admin-user-copy">
                  <h4>{entry.name}</h4>
                  <p>{entry.email}</p>
                </div>
                <span className={`admin-user-role role-${entry.role}`}>{entry.role}</span>
              </div>

              <div className="admin-user-meta">
                <div>
                  <span>Joined</span>
                  <strong>{new Date(entry.created_at).toLocaleDateString()}</strong>
                </div>
                <div>
                  <span>Login Type</span>
                  <strong>{entry.oauth_provider ? `${entry.oauth_provider} OAuth` : "Password login"}</strong>
                </div>
                <div>
                  <span>Assigned Mentor</span>
                  <strong>{entry.assigned_mentor_name || "Not assigned"}</strong>
                </div>
                <div>
                  <span>Mentor Domain</span>
                  <strong>{entry.assigned_mentor_speciality || "Not assigned"}</strong>
                </div>
              </div>

              {isMentor && (
                <>
                  <div className="mentor-student-ops">
                    <div className="mentor-student-ops-stat">
                      <span>Assigned tasks</span>
                      <strong>{(studentTaskMap[entry.id] || []).length}</strong>
                    </div>
                    <div className="mentor-student-ops-stat">
                      <span>Pending review</span>
                      <strong>{(studentTaskMap[entry.id] || []).filter((task) => task.status === "Review").length}</strong>
                    </div>
                    <div className="mentor-student-ops-stat">
                      <span>Latest due</span>
                      <strong>{(studentTaskMap[entry.id] || []).find((task) => task.due_date)?.due_date ? shortDeadline((studentTaskMap[entry.id] || []).find((task) => task.due_date)?.due_date) : "Flexible"}</strong>
                    </div>
                  </div>

                  <div className="mentor-student-card-actions">
                    <button
                      type="button"
                      className="outline-btn"
                      onClick={() => setActiveTaskStudentId((current) => current === entry.id ? null : entry.id)}
                    >
                      <Plus size={16} />
                      {activeTaskStudentId === entry.id ? "Hide Task Form" : "Assign Task"}
                    </button>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => navigate("/mentor/reports")}
                    >
                      <FileCheck2 size={16} />
                      Review Reports
                    </button>
                  </div>

                  {activeTaskStudentId === entry.id && (
                    <div className="mentor-student-task-form">
                      <div className="mentor-student-task-head">
                        <div>
                          <strong>Create mentor task for {entry.name}</strong>
                          <p>Tasks created here are saved to the backend and appear in the student's task flow immediately.</p>
                        </div>
                        <span className="report-meta-pill">{entry.assigned_mentor_speciality || "Mentor follow-up"}</span>
                      </div>
                      <div className="mentor-student-task-grid">
                        <input
                          value={taskDrafts[entry.id]?.title || ""}
                          onChange={(event) => updateTaskDraft(entry.id, "title", event.target.value)}
                          placeholder="Task title"
                        />
                        <input
                          value={taskDrafts[entry.id]?.description || ""}
                          onChange={(event) => updateTaskDraft(entry.id, "description", event.target.value)}
                          placeholder="Short task description"
                        />
                        <select
                          value={taskDrafts[entry.id]?.priority || ""}
                          onChange={(event) => updateTaskDraft(entry.id, "priority", event.target.value)}
                        >
                          <option value="" disabled>Select priority</option>
                          <option>Low</option>
                          <option>Medium</option>
                          <option>High</option>
                          <option>Critical</option>
                        </select>
                        <select
                          value={taskDrafts[entry.id]?.difficulty || ""}
                          onChange={(event) => updateTaskDraft(entry.id, "difficulty", event.target.value)}
                        >
                          <option value="" disabled>Select difficulty</option>
                          <option>Easy</option>
                          <option>Medium</option>
                          <option>Hard</option>
                        </select>
                        <input
                          type="number"
                          min="15"
                          step="15"
                          value={taskDrafts[entry.id]?.estimated_minutes || ""}
                          onChange={(event) => updateTaskDraft(entry.id, "estimated_minutes", event.target.value)}
                          placeholder="Estimated minutes"
                        />
                        <input
                          type="date"
                          value={taskDrafts[entry.id]?.due_date || ""}
                          onChange={(event) => updateTaskDraft(entry.id, "due_date", event.target.value)}
                        />
                        <input
                          className="mentor-student-task-tags"
                          value={taskDrafts[entry.id]?.tags || ""}
                          onChange={(event) => updateTaskDraft(entry.id, "tags", event.target.value)}
                          placeholder="tags,comma,separated"
                        />
                      </div>
                      <div className="mentor-student-task-foot">
                        <small>The student sees this in Task Manager, and progress updates come back to your mentor notifications.</small>
                        <button
                          type="button"
                          className="primary-btn"
                          disabled={assigningTaskStudentId === entry.id}
                          onClick={() => assignTaskToStudent(entry)}
                        >
                          <WandSparkles size={16} />
                          {assigningTaskStudentId === entry.id ? "Assigning..." : "Create Task"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {isAdmin && (
                <div className="admin-user-manage">
                  <label>Change Role</label>
                  <select
                    value={entry.role}
                    disabled={savingUserId === entry.id || deletingUserId === entry.id || entry.id === user?.id}
                    onChange={(event) => handleRoleChange(entry.id, event.target.value)}
                  >
                    <option value="student">student</option>
                    <option value="mentor">mentor</option>
                    <option value="admin">admin</option>
                  </select>
                  <div className="admin-user-manage-actions">
                    <button
                      type="button"
                      className="ghost-btn admin-user-delete-btn"
                      disabled={deletingUserId === entry.id || savingUserId === entry.id}
                      onClick={() => removeStudent(entry)}
                    >
                      <Trash2 size={16} />
                      {deletingUserId === entry.id ? "Removing..." : "Remove Student"}
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>

        {!filteredUsers.length && <p className="muted">No matching users found for the selected filter.</p>}
      </div>
    </div>
  );
};

export const MentorDeskPage = () => {
  const { user } = useAuth();
  const [mentors, setMentors] = useState([]);
  const [students, setStudents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [expandedStaffId, setExpandedStaffId] = useState(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [mentorForm, setMentorForm] = useState({
    name: "",
    email: "",
    password: "mentor123",
    role: "mentor",
    mentor_speciality: "",
    bio: "",
  });
  const [assignmentSelections, setAssignmentSelections] = useState({});
  const [studentAssignments, setStudentAssignments] = useState({});

  const loadMentorDesk = async () => {
    try {
      const [mentorData, requestData, userData] = await Promise.all([api.mentors(), api.mentorRequests(), api.users()]);
      setMentors(mentorData);
      setRequests(requestData);
      setStudents(userData.filter((entry) => entry.role === "student"));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadMentorDesk();
    })();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const createMentor = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.createMentor(mentorForm);
      setMentorForm({
        name: "",
        email: "",
        password: "mentor123",
        role: "mentor",
        mentor_speciality: "",
        bio: "",
      });
      setToast({ type: "success", text: "Staff member added successfully." });
      await loadMentorDesk();
    } catch (err) {
      setToast({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const assignMentorToRequest = async (requestId) => {
    const mentorId = Number(assignmentSelections[requestId]);
    if (!mentorId) {
      setToast({ type: "error", text: "Select a mentor before assigning." });
      return;
    }

    setSaving(true);
    try {
      await api.assignMentor(requestId, { mentor_id: mentorId });
      setToast({ type: "success", text: "Mentor assigned successfully." });
      await loadMentorDesk();
    } catch (err) {
      setToast({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const removeStaffMember = async (staffId) => {
    setSaving(true);
    try {
      await api.deleteMentor(staffId);
      setToast({ type: "success", text: "Staff member removed successfully." });
      await loadMentorDesk();
    } catch (err) {
      setToast({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const assignMentorToStudent = async (studentId) => {
    const mentorId = Number(studentAssignments[studentId]);
    if (!mentorId) {
      setToast({ type: "error", text: "Select a mentor before saving the student assignment." });
      return;
    }

    setSaving(true);
    try {
      await api.updateUser(studentId, { assigned_mentor_id: mentorId });
      setToast({ type: "success", text: "Mentor assigned directly to the student." });
      await loadMentorDesk();
    } catch (err) {
      setToast({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (error) return <ErrorState message={error} />;

  const pendingRequests = requests.filter((item) => item.status === "Pending");
  const assignedRequests = requests.filter((item) => item.status === "Assigned");
  const mentorsOnly = mentors.filter((item) => item.role === "mentor");
  const adminsOnly = mentors.filter((item) => item.role === "admin");
  const visibleStaff = mentors.filter((item) => {
    if (roleFilter === "all") return true;
    return item.role === roleFilter;
  });
  const filteredStudents = students.filter((student) => {
    const normalized = studentSearch.trim().toLowerCase();
    if (!normalized) return true;
    return student.name.toLowerCase().includes(normalized);
  });
  const visibleStudents = showAllStudents ? filteredStudents : filteredStudents.slice(0, 3);
  const mentorDeskStats = [
    { label: "Live staff records", value: mentors.length, icon: UserCog },
    { label: "Pending assignments", value: pendingRequests.length, icon: MessagesSquare },
    { label: "Student matches", value: students.filter((item) => item.assigned_mentor_id).length, icon: BadgeCheck },
  ];

  const unassignMentorFromRequest = async (requestId) => {
    setSaving(true);
    try {
      await api.unassignMentor(requestId);
      setToast({ type: "success", text: "Assigned mentor removed successfully." });
      await loadMentorDesk();
    } catch (err) {
      setToast({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <MotionDiv className="feature-stack" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {toast && (
        <div className={`dashboard-toast ${toast.type === "error" ? "dashboard-toast-error" : ""}`}>
          {toast.text}
        </div>
      )}
      <section className="feature-card mentor-desk-hero">
        <div className="mentor-desk-hero-copy">
          <p className="eyebrow" style={{ color: "wheat" }}>Mentor Control</p>
          <h3>Manage staff, review student mentor requests, and control who is assigned to whom.</h3>
          <p className="muted">
            This page is backend-driven. Admins can add mentors or admins, assign or remove mentor matches, and those changes reflect immediately in the student Mentor Desk.
          </p>
        </div>
        <div className="mentor-desk-hero-stats">
          {mentorDeskStats.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label}>
                <span><Icon size={18} /></span>
                <small>{item.label}</small>
                <strong>{item.value}</strong>
              </article>
            );
          })}
        </div>
      </section>
      <div className="feature-grid stats-grid">
        <div className="feature-card stat-tile"><span>Total Staff</span><strong>{mentors.length}</strong></div>
        <div className="feature-card stat-tile"><span>Mentors</span><strong>{mentorsOnly.length}</strong></div>
        <div className="feature-card stat-tile"><span>Admins</span><strong>{adminsOnly.length}</strong></div>
        <div className="feature-card stat-tile"><span>Pending Requests</span><strong>{pendingRequests.length}</strong></div>
      </div>

      <div className="feature-grid mentor-desk-grid">
        <form className="feature-card mentor-form-card" onSubmit={createMentor}>
          <div className="section-head">
            <div>
              <h3>Add Staff Member</h3>
              <small>Create a mentor or admin account from the same staff section.</small>
            </div>
          </div>
          <div className="settings-section mentor-form-section">
            <label>Name</label>
            <input value={mentorForm.name} onChange={(event) => setMentorForm({ ...mentorForm, name: event.target.value })} required />
            <label>Email</label>
            <input type="email" value={mentorForm.email} onChange={(event) => setMentorForm({ ...mentorForm, email: event.target.value })} required />
            <label>Temporary Password</label>
            <input value={mentorForm.password} onChange={(event) => setMentorForm({ ...mentorForm, password: event.target.value })} required />
            <label>Role</label>
            <select value={mentorForm.role} onChange={(event) => setMentorForm({ ...mentorForm, role: event.target.value })}>
              <option value="mentor">mentor</option>
              <option value="admin">admin</option>
            </select>
            <label>{mentorForm.role === "admin" ? "Focus Area" : "Speciality"}</label>
            <input
              value={mentorForm.mentor_speciality}
              onChange={(event) => setMentorForm({ ...mentorForm, mentor_speciality: event.target.value })}
              placeholder={mentorForm.role === "admin" ? "Platform operations, user support..." : "React, DSA, DBMS..."}
            />
            <label>Bio</label>
            <textarea value={mentorForm.bio} onChange={(event) => setMentorForm({ ...mentorForm, bio: event.target.value })} placeholder="Short mentor introduction..." />
          </div>
          <div className="settings-submit-row">
            <button type="submit" className="primary-btn" disabled={saving}>Add Staff</button>
          </div>
        </form>

        <div className="feature-card mentor-directory-card">
          <div className="section-head">
            <div>
              <h3>Mentor & Admin Directory</h3>
              <small>Mentors and admins live here, with role filters and remove actions.</small>
            </div>
            <div className="pill-tabs">
              {[
                { key: "all", label: "All" },
                { key: "mentor", label: "Mentors" },
                { key: "admin", label: "Admins" },
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
          <div className="mentor-directory-list">
            {visibleStaff.map((mentor) => (
              <article className="mentor-directory-item mentor-directory-item-rich" key={mentor.id}>
                <div className="mentor-directory-main">
                  <div>
                    <h4>{mentor.name}</h4>
                    <p>{mentor.email}</p>
                  </div>
                  <span className={`admin-user-role role-${mentor.role}`}>{mentor.role}</span>
                </div>
                <div className="mentor-directory-meta">
                  <span>{mentor.mentor_speciality || "General"}</span>
                  <small>{mentor.role === "mentor" ? "Available for student assignment" : "Admin account for operations and oversight"}</small>
                </div>
                {expandedStaffId === mentor.id && (
                  <div className="mentor-directory-bio">
                    <strong>Bio</strong>
                    <p>{mentor.bio || "No bio added yet for this staff member."}</p>
                  </div>
                )}
                <div className="mentor-directory-actions">
                  <button
                    type="button"
                    className="outline-btn"
                    onClick={() => setExpandedStaffId((current) => current === mentor.id ? null : mentor.id)}
                  >
                    {expandedStaffId === mentor.id ? "Hide Bio" : "View Bio"}
                  </button>
                  <button
                    type="button"
                    className="ghost-btn mentor-delete-btn"
                    disabled={saving || mentor.id === user?.id}
                    onClick={() => removeStaffMember(mentor.id)}
                  >
                    <Trash2 size={16} />
                    {mentor.role === "mentor" ? "Delete Mentor" : "Delete Admin"}
                  </button>
                </div>
              </article>
            ))}
            {!visibleStaff.length && <p className="muted">No staff members found for this filter.</p>}
          </div>
        </div>
      </div>

      <div className="feature-card mentor-request-board">
        <div className="section-head">
          <div>
            <h3>Direct Student Assignment</h3>
            <small>Assign a mentor to any student even if they did not submit a mentor request first.</small>
          </div>
        </div>
        <div className="mentor-student-toolbar">
          <label className="mentor-student-search">
            <Search size={16} />
            <input
              value={studentSearch}
              onChange={(event) => {
                setStudentSearch(event.target.value);
                setShowAllStudents(false);
              }}
              placeholder="Search student by name..."
            />
          </label>
        </div>
        <div className="mentor-request-list">
          {visibleStudents.map((student) => (
            <article className="mentor-request-card" key={`student-assignment-${student.id}`}>
              <div className="mentor-request-card-head">
                <div>
                  <h4>{student.name}</h4>
                  <p>{student.email}</p>
                </div>
                <span className={`report-status ${student.assigned_mentor_name ? "report-status-reviewed" : "report-status-submitted"}`}>
                  {student.assigned_mentor_name ? "Assigned" : "Unassigned"}
                </span>
              </div>
              <div className="mentor-request-tags">
                <span className="report-meta-pill">Current mentor: {student.assigned_mentor_name || "None"}</span>
                <span className="report-meta-pill">Domain: {student.assigned_mentor_speciality || "Not set"}</span>
              </div>
              <div className="mentor-assignment-row">
                <select value={studentAssignments[student.id] || student.assigned_mentor_id || ""} onChange={(event) => setStudentAssignments((current) => ({ ...current, [student.id]: event.target.value }))}>
                  <option value="">Select mentor</option>
                  {mentorsOnly.map((mentor) => (
                    <option key={`student-${student.id}-mentor-${mentor.id}`} value={mentor.id}>
                      {mentor.name} - {mentor.mentor_speciality || "General"}
                    </option>
                  ))}
                </select>
                <button type="button" className="primary-btn" onClick={() => assignMentorToStudent(student.id)} disabled={saving}>
                  Save Assignment
                </button>
              </div>
            </article>
          ))}
          {!filteredStudents.length && <p className="muted">No students matched this search.</p>}
        </div>
        {filteredStudents.length > 3 && (
          <button type="button" className="mentor-show-more-btn" onClick={() => setShowAllStudents((current) => !current)}>
            {showAllStudents ? "Show less" : "Show more"}
            <ChevronDown size={18} className={showAllStudents ? "is-open" : ""} />
          </button>
        )}
      </div>

      <div className="feature-card mentor-request-board">
        <div className="section-head">
          <div>
            <h3>Mentor Requests</h3>
            <small>Students ask for help here, and the admin assigns the right mentor.</small>
          </div>
          <div className="mentor-request-board-stats">
            <span>{pendingRequests.length} pending</span>
            <span>{assignedRequests.length} assigned</span>
          </div>
        </div>
        <div className="mentor-request-list">
          {requests.map((request) => (
            <article className="mentor-request-card" key={request.id}>
              <div className="mentor-request-card-head">
                <div>
                  <h4>{request.user_name}</h4>
                  <p>{request.user_email}</p>
                </div>
                <span className={`report-status ${request.status === "Assigned" ? "report-status-reviewed" : "report-status-submitted"}`}>{request.status}</span>
              </div>
              <div className="mentor-request-tags">
                <span className="report-meta-pill">{request.requested_domain}</span>
                <span className="report-meta-pill">{new Date(request.created_at).toLocaleString()}</span>
              </div>
              <p className="mentor-request-message">{request.message || "No extra message provided."}</p>
              {request.assigned_mentor_name ? (
                <div className="mentor-assigned-summary">
                  <div className="mentor-assigned-copy">
                    <strong>{request.assigned_mentor_name}</strong>
                    <span>{request.assigned_mentor_speciality || "General speciality"}</span>
                  </div>
                  <button
                    type="button"
                    className="mentor-unassign-btn"
                    onClick={() => unassignMentorFromRequest(request.id)}
                    disabled={saving}
                    aria-label={`Remove assigned mentor for ${request.user_name}`}
                    title="Remove assigned mentor"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="mentor-assignment-row">
                  <select value={assignmentSelections[request.id] || ""} onChange={(event) => setAssignmentSelections((current) => ({ ...current, [request.id]: event.target.value }))}>
                    <option value="">Select mentor</option>
                    {mentorsOnly.map((mentor) => (
                      <option key={`assign-${request.id}-${mentor.id}`} value={mentor.id}>
                        {mentor.name} - {mentor.mentor_speciality || "General"}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="primary-btn" onClick={() => assignMentorToRequest(request.id)} disabled={saving}>
                    Assign Mentor
                  </button>
                </div>
              )}
            </article>
          ))}
          {!requests.length && <p className="muted">No mentor requests yet.</p>}
        </div>
      </div>
    </MotionDiv>
  );
};

export const StudentMentorPage = () => {
  const [requests, setRequests] = useState([]);
  const [feedbackEntries, setFeedbackEntries] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [requestFeedback, setRequestFeedback] = useState(null);
  const [form, setForm] = useState({
    requested_domain: "",
    message: "",
  });
  const [feedbackForm, setFeedbackForm] = useState({
    rating: "5",
    message: "",
  });

  const loadMentorData = async () => {
    try {
      const [requestData, dashboardData, feedbackData] = await Promise.all([api.mentorRequests(), api.dashboard("student"), api.mentorFeedbacks()]);
      setRequests(requestData);
      setDashboard(dashboardData);
      setFeedbackEntries(feedbackData);
      setLoadError("");
    } catch (err) {
      setLoadError(err.message);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadMentorData();
    })();
  }, []);

  useEffect(() => {
    if (!requestFeedback) return undefined;
    const timeoutId = window.setTimeout(() => setRequestFeedback(null), 4500);
    return () => window.clearTimeout(timeoutId);
  }, [requestFeedback]);

  const submitRequest = async (event) => {
    event.preventDefault();
    try {
      await api.createMentorRequest(form);
      setForm({ requested_domain: "", message: "" });
      setRequestFeedback({ type: "success", text: "Your mentor request was sent to admin." });
      await loadMentorData();
    } catch (err) {
      setRequestFeedback({ type: "error", text: err.message || "Could not send mentor request." });
    }
  };

  const submitMentorFeedback = async (event) => {
    event.preventDefault();
    try {
      await api.createMentorFeedback({
        rating: Number(feedbackForm.rating),
        message: feedbackForm.message,
      });
      setFeedbackForm({ rating: "5", message: "" });
      setRequestFeedback({ type: "success", text: "Your mentor feedback was shared successfully." });
      await loadMentorData();
    } catch (err) {
      setRequestFeedback({ type: "error", text: err.message || "Could not send mentor feedback." });
    }
  };

  if (loadError) return <ErrorState message={loadError} />;
  if (!dashboard) return <LoadingState />;

  const latestRequest = requests[0];
  const assignedMentor = dashboard.assigned_mentor;
  const mentorStats = [
    { label: "Requests sent", value: requests.length, icon: MessagesSquare },
    { label: "Assigned status", value: assignedMentor ? "Live" : "Pending", icon: UserCog },
    { label: "Latest domain", value: latestRequest?.requested_domain || "None", icon: Sparkles },
  ];

  return (
    <MotionDiv className="feature-stack" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <section className="feature-card mentor-student-hero">
        <div>
          <p className="eyebrow" style={{ color: '#00fffb' }}>Mentor Desk</p>
          <h3>Find the right mentor, track your request status, and keep domain guidance visible in one place.</h3>
        </div>
        <div className="mentor-student-hero-stats">
          {mentorStats.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label}>
                <span><Icon size={16} /> {item.label}</span>
                <strong>{item.value}</strong>
              </article>
            );
          })}
        </div>
      </section>

      <div className="feature-grid mentor-student-grid">
        <section className="feature-card mentor-status-card">
          <p className="eyebrow">Assigned Mentor</p>
          <h3>{assignedMentor?.name || "No mentor assigned yet"}</h3>
          <div className="mentor-status-pills">
            <span><Mail size={13} /> {assignedMentor?.email || "Waiting for admin"}</span>
            <span><Sparkles size={13} /> {assignedMentor?.mentor_speciality || "Not assigned"}</span>
          </div>
          <div className="metric-list">
            <p>Email <strong>{assignedMentor?.email || "Waiting for admin"}</strong></p>
            <p>Speciality <strong>{assignedMentor?.mentor_speciality || "Not assigned"}</strong></p>
            <p>Status <strong>{assignedMentor ? "Assigned" : "Pending"}</strong></p>
          </div>
          <p className="muted mentor-bio-copy">{assignedMentor?.bio || "When the admin assigns a mentor, their profile and speciality will appear here."}</p>
        </section>

        <form className="feature-card mentor-request-form" onSubmit={submitRequest}>
          <p className="eyebrow">Need Help?</p>
          <h3>Request a Mentor</h3>
          <label>Domain or speciality needed</label>
          <input value={form.requested_domain} onChange={(event) => setForm({ ...form, requested_domain: event.target.value })} placeholder="DSA, React, DBMS..." required />
          <label>Describe what kind of help you need</label>
          <textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="I need a mentor for interview prep and weekly guidance." />
          <div className="settings-submit-row">
            <button type="submit" className="primary-btn">Send Request</button>
            {requestFeedback && (
              <p className={requestFeedback.type === "error" ? "request-feedback request-feedback-error" : "request-feedback"}>
                {requestFeedback.text}
              </p>
            )}
          </div>
        </form>
      </div>

      {assignedMentor && (
        <div className="feature-grid mentor-student-grid">
          <form className="feature-card mentor-feedback-form" onSubmit={submitMentorFeedback}>
            <p className="eyebrow">Mentor Feedback</p>
            <h3>Rate Your Assigned Mentor</h3>
            <label>Rating</label>
            <select value={feedbackForm.rating} onChange={(event) => setFeedbackForm((current) => ({ ...current, rating: event.target.value }))}>
              <option value="5">5 - Excellent</option>
              <option value="4">4 - Good</option>
              <option value="3">3 - Average</option>
              <option value="2">2 - Needs Improvement</option>
              <option value="1">1 - Poor</option>
            </select>
            <label>Your feedback</label>
            <textarea
              value={feedbackForm.message}
              onChange={(event) => setFeedbackForm((current) => ({ ...current, message: event.target.value }))}
              placeholder="Share how the mentor is helping, what is working well, or what should improve."
              required
            />
            <button type="submit" className="primary-btn">Send Feedback</button>
          </form>

          <section className="feature-card mentor-feedback-history">
            <div className="section-head">
              <div>
                <h3>Previous Feedback</h3>
                <small>Your submitted mentor feedback appears here.</small>
              </div>
            </div>
            <div className="mentor-feedback-list">
              {feedbackEntries.length ? feedbackEntries.map((entry) => (
                <article className="mentor-feedback-item" key={entry.id}>
                  <div className="mentor-feedback-top">
                    <strong>{entry.mentor_name}</strong>
                    <span>{entry.rating}/5</span>
                  </div>
                  <p>{entry.message}</p>
                  <small>{formatShortDateTime(entry.created_at)}</small>
                </article>
              )) : (
                <p className="muted">No mentor feedback submitted yet.</p>
              )}
            </div>
          </section>
        </div>
      )}

      <section className="feature-card mentor-request-history">
        <div className="section-head">
          <div>
            <h3>Request History</h3>
            <small>The latest request stays visible until the admin assigns a mentor.</small>
          </div>
        </div>
        {latestRequest ? (
          <div className="mentor-request-list">
            {requests.map((request) => (
              <article className="mentor-request-card" key={`student-request-${request.id}`}>
                <div className="mentor-request-card-head">
                  <div>
                    <h4>{request.requested_domain}</h4>
                    <p>{new Date(request.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`report-status ${request.status === "Assigned" ? "report-status-reviewed" : "report-status-submitted"}`}>{request.status}</span>
                </div>
                <p className="mentor-request-message">{request.message || "No additional note added."}</p>
                <div className="mentor-assigned-summary">
                  <strong>{request.assigned_mentor_name || "Awaiting mentor assignment"}</strong>
                  <span>{request.assigned_mentor_speciality || "Admin will select the best-fit mentor for your request."}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">You have not requested a mentor yet.</p>
        )}
      </section>
    </MotionDiv>
  );
};

export const MentorPlannerPage = () => {
  const [students, setStudents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [reports, setReports] = useState([]);
  const [mentorRequests, setMentorRequests] = useState([]);
  const [feedbackEntries, setFeedbackEntries] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadMentorPlanner = async () => {
      try {
        const [studentData, taskData, reportData, requestData, feedbackData] = await Promise.all([
          api.users(),
          api.tasks(),
          api.reports(),
          api.mentorRequests(),
          api.mentorFeedbacks(),
        ]);
        if (!mounted) return;
        setStudents(studentData);
        setTasks(taskData);
        setReports(reportData);
        setMentorRequests(requestData);
        setFeedbackEntries(feedbackData);
        setError("");
      } catch (err) {
        if (mounted) setError(err.message);
      }
    };

    loadMentorPlanner();
    const intervalId = window.setInterval(loadMentorPlanner, DASHBOARD_REFRESH_INTERVAL);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  if (error) return <ErrorState message={error} />;

  const today = startOfDay(new Date());
  const assignedStudents = students.filter((entry) => entry.role === "student");
  const activeTasks = tasks.filter((task) => task.status !== "Done");
  const dueTodayTasks = activeTasks.filter((task) => task.due_date && startOfDay(task.due_date).getTime() === today.getTime());
  const dueSoonTasks = [...activeTasks]
    .filter((task) => task.due_date)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);
  const pendingReports = reports.filter((report) => report.status === "Submitted");
  const activeRequests = mentorRequests.filter((request) => request.status === "Assigned");
  const studentLookup = assignedStudents.reduce((lookup, student) => {
    lookup[student.id] = student.name;
    return lookup;
  }, {});
  const agendaEntries = [
    ...dueSoonTasks.map((task) => ({
      id: `task-${task.id}`,
      date: task.due_date,
      type: "Task deadline",
      title: task.title,
      student: studentLookup[task.assigned_to] || "Assigned student",
      accent: task.priority,
    })),
    ...pendingReports.map((report) => ({
      id: `report-${report.id}`,
      date: report.submitted_at,
      type: "Report review",
      title: "Student report waiting for feedback",
      student: studentLookup[report.student_id] || "Assigned student",
      accent: report.status,
    })),
  ]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 6);
  const mentorFocusRows = [
    { label: "Assigned students", value: assignedStudents.length, icon: UserCog },
    { label: "Due today", value: dueTodayTasks.length, icon: CalendarDays },
    { label: "Pending reviews", value: pendingReports.length, icon: FileCheck2 },
    { label: "Feedback entries", value: feedbackEntries.length, icon: MessagesSquare },
  ];

  return (
    <MotionDiv className="feature-stack" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <section className="feature-card page-hero-card mentor-planner-hero">
        <div className="page-hero-copy">
          <p className="eyebrow">Mentor Calendar</p>
          <h3>Plan student follow-ups, watch due work, and manage your mentoring workload from one backend-driven view.</h3>
          <p className="muted">
            Unlike the student Study Planner, this page is for mentor operations. It helps you monitor assigned learners, review due tasks, check submitted reports, and stay aware of mentor-request and feedback activity.
          </p>
        </div>
        <div className="page-hero-stats">
          {mentorFocusRows.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label}>
                <span><Icon size={18} /></span>
                <small>{item.label}</small>
                <strong>{item.value}</strong>
              </article>
            );
          })}
        </div>
      </section>

      <div className="feature-grid mentor-planner-grid">
        <section className="feature-card mentor-planner-card">
          <div className="section-head">
            <div>
              <h3>Upcoming Student Flow</h3>
              <small>Backend deadlines from students currently assigned to you</small>
            </div>
            <span className="report-meta-pill">{dueSoonTasks.length} tracked</span>
          </div>
          <div className="mentor-planner-list">
            {dueSoonTasks.length ? dueSoonTasks.map((task) => (
              <article className="mentor-planner-item" key={task.id}>
                <div className="mentor-planner-item-top">
                  <strong>{task.title}</strong>
                  <span>{task.priority}</span>
                </div>
                <p>{studentLookup[task.assigned_to] || "Assigned student"} - {getDeadlineLabel(task.due_date)}</p>
                <small>{task.status} - {getTaskProgress(task)}% progress</small>
              </article>
            )) : (
              <p className="muted">No assigned student deadlines are queued right now.</p>
            )}
          </div>
        </section>

        <section className="feature-card mentor-planner-card">
          <div className="section-head">
            <div>
              <h3>Mentor Priorities</h3>
              <small>Review queue, assigned requests, and latest feedback</small>
            </div>
          </div>
          <div className="mentor-priority-stack">
            <div className="mentor-priority-note">
              <strong>{pendingReports.length} report{pendingReports.length === 1 ? "" : "s"} waiting for review</strong>
              <p>Students have submitted these reports and they still need mentor feedback.</p>
            </div>
            <div className="mentor-priority-note">
              <strong>{activeRequests.length} mentor request{activeRequests.length === 1 ? "" : "s"} assigned to you</strong>
              <p>These students requested direct mentoring and are currently mapped to your guidance desk.</p>
            </div>
            <div className="mentor-priority-note">
              <strong>{feedbackEntries[0] ? `${feedbackEntries[0].student_name} rated you ${feedbackEntries[0].rating}/5` : "No mentor feedback yet"}</strong>
              <p>{feedbackEntries[0]?.message || "Student feedback will appear here once assigned learners submit their mentor review."}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="feature-card mentor-agenda-card">
        <div className="section-head">
          <div>
            <h3>Mentor Agenda Timeline</h3>
            <small>A standout backend-driven agenda that merges upcoming student deadlines and pending report reviews.</small>
          </div>
          <span className="report-meta-pill">{agendaEntries.length} live items</span>
        </div>
        <div className="mentor-agenda-list">
          {agendaEntries.length ? agendaEntries.map((entry, index) => (
            <article className="mentor-agenda-item" key={entry.id}>
              <div className="mentor-agenda-marker">
                <span>{index + 1}</span>
              </div>
              <div className="mentor-agenda-copy">
                <div className="mentor-agenda-top">
                  <strong>{entry.title}</strong>
                  <span className="report-meta-pill">{entry.type}</span>
                </div>
                <p>{entry.student}</p>
                <small>{formatShortDateTime(entry.date)} - {entry.accent}</small>
              </div>
            </article>
          )) : (
            <p className="muted">No live agenda items yet. As your assigned students receive tasks or submit reports, this timeline will populate automatically from the backend.</p>
          )}
        </div>
      </section>
    </MotionDiv>
  );
};

export const PlannerPage = () => {
  const { user, syncUser } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [plannerForm, setPlannerForm] = useState({
    daily_study_minutes: "",
    burnout_limit_minutes: "",
    goal_title: "",
    goal_target_date: "",
  });
  const [deadlineInputType, setDeadlineInputType] = useState("text");

  useEffect(() => {
    let mounted = true;
    api.plannerSummary()
      .then((plannerData) => {
        if (!mounted) return;
        setSummary(plannerData);
      })
      .catch((err) => mounted && setError(err.message));
    return () => {
      mounted = false;
    };
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!summary) return <LoadingState />;
  const plannerQueue = summary.priority_queue || [];

  const savePlannerSettings = async (event) => {
    event.preventDefault();
    try {
      setError("");
      const payload = {
        daily_study_minutes: Number(plannerForm.daily_study_minutes) || user?.daily_study_minutes || 120,
        burnout_limit_minutes: Number(plannerForm.burnout_limit_minutes) || user?.burnout_limit_minutes || 240,
        goal_title: plannerForm.goal_title.trim() || user?.goal_title || null,
        goal_target_date: plannerForm.goal_target_date
          ? new Date(plannerForm.goal_target_date).toISOString()
          : user?.goal_target_date || null,
      };
      const [updatedUser, rebuildResult] = await Promise.all([
        api.updateProfile(payload),
        api.rebuildPlanner(payload),
      ]);
      syncUser(updatedUser);
      setSummary(rebuildResult.summary);
      setPlannerForm({
        daily_study_minutes: "",
        burnout_limit_minutes: "",
        goal_title: "",
        goal_target_date: "",
      });
      setDeadlineInputType("text");
      setMessage(
        rebuildResult.generated_tasks
          ? `Planner rebuilt and ${rebuildResult.generated_tasks} roadmap tasks were added to your task flow.`
          : "Planner settings updated. No new roadmap tasks were needed for this rebuild."
      );
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <MotionDiv className="feature-stack" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="feature-grid stats-grid planner-stats-grid">
        <div className="feature-card stat-tile"><span>Available Today</span><strong>{formatMinutes(summary.available_minutes)}</strong></div>
        <div className="feature-card stat-tile"><span>Planned Focus</span><strong>{formatMinutes(summary.planned_minutes)}</strong></div>
        <div className="feature-card stat-tile"><span>Productivity Score</span><strong>{summary.productivity_score}</strong></div>
        <div className="feature-card stat-tile"><span>Remaining Workload</span><strong>{formatMinutes(summary.remaining_workload_minutes)}</strong></div>
      </div>

      <div className="feature-grid">
        <div className="feature-card planner-hero-card">
          <div className="section-head planner-section-head">
            <div>
              <div className="planner-title-row">
                <span className="planner-panel-icon"><BrainCircuit size={20} /></span>
                <h3>AI Study Planner</h3>
              </div>
              <small>Built from your saved goal, live task backlog, available time, and remaining effort.</small>
            </div>
            <span className={`planner-risk planner-risk-${summary.burnout_risk.toLowerCase()}`}>{summary.burnout_risk} Burnout Risk</span>
          </div>
          <div className="planner-adaptive-banner">
            <p className="muted">{summary.adaptive_message}</p>
            <div className="planner-banner-stats">
              <span><Clock3 size={14} /> {formatMinutes(summary.planned_minutes)} focus</span>
              <span><ListTodo size={14} /> {plannerQueue.length} queued</span>
            </div>
          </div>
          {summary.daily_plan.map((item, index) => (
            <div className="planner-row planner-row-rich planner-plan-card" key={`${item.title}-${index}`}>
              <span>{index + 1}</span>
              <div>
                <p>{item.title}</p>
                <small>{item.reason}</small>
              </div>
              <div className="planner-plan-meta">
                <em>{item.due_label}</em>
                <strong>{formatMinutes(item.recommended_minutes)}</strong>
              </div>
            </div>
          ))}
          {!summary.daily_plan.length && <p className="muted">No active tasks to schedule right now.</p>}
        </div>

        <form className="feature-card planner-profile-card planner-settings-card" onSubmit={savePlannerSettings}>
          <div className="planner-title-row">
            <span className="planner-panel-icon planner-panel-icon-warm"><Target size={20} /></span>
            <h3>Adaptive Scheduling</h3>
          </div>
          <p className="muted">Set your available time and goal. Rebuild will save a roadmap into your tasks so it also appears in Task Manager and the Kanban to-do flow.</p>
          <div className="planner-field-grid">
            <label>
              <span>Daily study time (minutes)</span>
              <input
                type="number"
                min="30"
                step="15"
                value={plannerForm.daily_study_minutes}
                placeholder={`${user?.daily_study_minutes || 120}`}
                onChange={(event) => setPlannerForm({ ...plannerForm, daily_study_minutes: event.target.value })}
              />
            </label>
            <label>
              <span>Burnout limit (minutes)</span>
              <input
                type="number"
                min="60"
                step="15"
                value={plannerForm.burnout_limit_minutes}
                placeholder={`${user?.burnout_limit_minutes || 240}`}
                onChange={(event) => setPlannerForm({ ...plannerForm, burnout_limit_minutes: event.target.value })}
              />
            </label>
            <label className="planner-field-full">
              <span>Learning goal</span>
              <input
                value={plannerForm.goal_title}
                onChange={(event) => setPlannerForm({ ...plannerForm, goal_title: event.target.value })}
                placeholder={user?.goal_title || "Complete DSA in 30 days"}
              />
            </label>
            <label className="planner-field-full">
              <span>Goal deadline</span>
              <input
                type={deadlineInputType}
                value={plannerForm.goal_target_date}
                placeholder={user?.goal_target_date ? new Date(user.goal_target_date).toLocaleDateString() : "Select goal deadline"}
                onFocus={() => setDeadlineInputType("date")}
                onBlur={() => !plannerForm.goal_target_date && setDeadlineInputType("text")}
                onChange={(event) => setPlannerForm({ ...plannerForm, goal_target_date: event.target.value })}
              />
            </label>
          </div>
          <button type="submit" className="primary-btn">Rebuild Plan</button>
          {message && <p className="success-message">{message}</p>}
        </form>
      </div>

      <div className="feature-grid">
        <div className="feature-card">
          <h3>Reminders</h3>
          {summary.reminders.map((reminder) => (
            <div className={`planner-alert planner-alert-${reminder.severity}`} key={reminder.title}>
              <strong>{reminder.title}</strong>
              <p>{reminder.detail}</p>
            </div>
          ))}
          {!summary.reminders.length && <p className="muted">You are caught up for today.</p>}
        </div>
        <div className="feature-card">
          <h3>AI Suggestions</h3>
          {summary.ai_suggestions.map((item) => (
            <div className="planner-tip" key={item}>{item}</div>
          ))}
          {!summary.ai_suggestions.length && <p className="muted">Add a goal or active tasks to receive live study suggestions.</p>}
        </div>
      </div>

      <div className="feature-grid">
        <div className="feature-card roadmap-card planner-roadmap-card">
          <div className="planner-title-row">
            <span className="planner-panel-icon"><Route size={20} /></span>
            <h3>Goal-Based Roadmap</h3>
          </div>
          {summary.goal_milestones.length ? summary.goal_milestones.map((milestone) => (
            <div className="planner-row planner-roadmap-row" key={milestone.label}>
              <span>{milestone.label.split(" ")[1]}</span>
              <p>{milestone.focus}</p>
              <small>{formatMinutes(milestone.target_minutes)} / day</small>
            </div>
          )) : (
            <div className="roadmap-empty-state">
              <p className="muted">Add a goal and deadline to generate a daily roadmap.</p>
              <div className="roadmap-empty-steps">
                <div>
                  <strong>1. Add your goal</strong>
                  <p>Example: Complete DSA in 30 days.</p>
                </div>
                <div>
                  <strong>2. Set the deadline</strong>
                  <p>The planner calculates how many days are left.</p>
                </div>
                <div>
                  <strong>3. Rebuild the plan</strong>
                  <p>It saves roadmap phases into your live task list and then schedules them.</p>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="feature-card planner-priority-card">
          <div className="planner-title-row">
            <span className="planner-panel-icon planner-panel-icon-cool"><ListTodo size={20} /></span>
            <h3>Priority Queue</h3>
          </div>
          <p className="muted">This queue is now backend-ranked. It prioritizes roadmap and current-goal work first, which is why old unrelated tasks should no longer stay on top here.</p>
          {plannerQueue.map((task, index) => (
            <div className="planner-row planner-priority-row" key={`${task.title}-${index}`}>
              <span>{index + 1}</span>
              <p>{task.title}</p>
              <small>{task.reason} - {formatMinutes(task.recommended_minutes)}</small>
            </div>
          ))}
          {!plannerQueue.length && <p className="muted">No open tasks are waiting in your queue right now.</p>}
        </div>
      </div>
    </MotionDiv>
  );
};
