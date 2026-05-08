import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
export const API_ROOT_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("lms_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || "Request failed";
    return Promise.reject(new Error(message));
  },
);

export const api = {
  login: (payload) => apiClient.post("/auth/login", payload).then((res) => res.data),
  register: (payload) => apiClient.post("/auth/register", payload).then((res) => res.data),
  forgotPassword: (payload) => apiClient.post("/auth/forgot-password", payload).then((res) => res.data),
  resendOtp: (payload) => apiClient.post("/auth/resend-otp", payload).then((res) => res.data),
  resetPassword: (payload) => apiClient.post("/auth/reset-password", payload).then((res) => res.data),
  subscribeNewsletter: (payload) => apiClient.post("/newsletter/subscribe", payload).then((res) => res.data),
  submitContact: (payload) => apiClient.post("/contact", payload).then((res) => res.data),
  contactMessages: () => apiClient.get("/contact").then((res) => res.data),
  communityFaq: () => apiClient.get("/contact/community-faq").then((res) => res.data),
  replyContactMessage: (id, payload) => apiClient.post(`/contact/${id}/reply`, payload).then((res) => res.data),
  courses: () => apiClient.get("/courses").then((res) => res.data),
  me: () => apiClient.get("/auth/me").then((res) => res.data),
  users: () => apiClient.get("/users").then((res) => res.data),
  user: (id) => apiClient.get(`/users/${id}`).then((res) => res.data),
  updateUser: (id, payload) => apiClient.patch(`/users/${id}`, payload).then((res) => res.data),
  deleteUser: (id) => apiClient.delete(`/users/${id}`).then((res) => res.data),
  updateProfile: (payload) => apiClient.patch("/users/me", payload).then((res) => res.data),
  mentors: () => apiClient.get("/mentors").then((res) => res.data),
  createMentor: (payload) => apiClient.post("/mentors", payload).then((res) => res.data),
  deleteMentor: (id) => apiClient.delete(`/mentors/${id}`).then((res) => res.data),
  mentorRequests: () => apiClient.get("/mentors/requests").then((res) => res.data),
  mentorFeedbacks: () => apiClient.get("/mentors/feedback").then((res) => res.data),
  createMentorRequest: (payload) => apiClient.post("/mentors/requests", payload).then((res) => res.data),
  createMentorFeedback: (payload) => apiClient.post("/mentors/feedback", payload).then((res) => res.data),
  assignMentor: (requestId, payload) => apiClient.post(`/mentors/requests/${requestId}/assign`, payload).then((res) => res.data),
  unassignMentor: (requestId) => apiClient.delete(`/mentors/requests/${requestId}/assign`).then((res) => res.data),
  tasks: () => apiClient.get("/tasks").then((res) => res.data),
  createTask: (payload) => apiClient.post("/tasks", payload).then((res) => res.data),
  updateTask: (id, payload) => apiClient.patch(`/tasks/${id}`, payload).then((res) => res.data),
  deleteTask: (id) => apiClient.delete(`/tasks/${id}`).then((res) => res.data),
  reports: () => apiClient.get("/reports").then((res) => res.data),
  createReport: (payload) => apiClient.post("/reports", payload).then((res) => res.data),
  deleteReport: (id) => apiClient.delete(`/reports/${id}`).then((res) => res.data),
  feedback: (id, payload) => apiClient.post(`/reports/${id}/feedback`, payload).then((res) => res.data),
  uploadReport: (id, formData) =>
    apiClient.post(`/reports/${id}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((res) => res.data),
  analyticsOverview: (params = {}) => apiClient.get("/analytics/overview", { params }).then((res) => res.data),
  analyticsPerformance: (params = {}) => apiClient.get("/analytics/performance", { params }).then((res) => res.data),
  plannerSummary: () => apiClient.get("/planner/summary").then((res) => res.data),
  rebuildPlanner: (payload) => apiClient.post("/planner/rebuild", payload).then((res) => res.data),
  notifications: () => apiClient.get("/notifications").then((res) => res.data),
  readNotification: (id) => apiClient.patch(`/notifications/${id}/read`).then((res) => res.data),
  deleteNotification: (id) => apiClient.delete(`/notifications/${id}`).then((res) => res.data),
  dashboard: (role, params = {}) => apiClient.get(`/dashboard/${role}`, { params }).then((res) => res.data),
  adminOverview: () => apiClient.get("/dashboard/admin/overview").then((res) => res.data),
  myEnrollments: () => apiClient.get("/payments/enrollments").then((res) => res.data),
  createRazorpayOrder: (payload) => apiClient.post("/payments/razorpay/order", payload).then((res) => res.data),
  verifyRazorpayPayment: (payload) => apiClient.post("/payments/razorpay/verify", payload).then((res) => res.data),
};
