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
  me: () => apiClient.get("/auth/me").then((res) => res.data),
  users: () => apiClient.get("/users").then((res) => res.data),
  user: (id) => apiClient.get(`/users/${id}`).then((res) => res.data),
  updateProfile: (payload) => apiClient.patch("/users/me", payload).then((res) => res.data),
  tasks: () => apiClient.get("/tasks").then((res) => res.data),
  createTask: (payload) => apiClient.post("/tasks", payload).then((res) => res.data),
  updateTask: (id, payload) => apiClient.patch(`/tasks/${id}`, payload).then((res) => res.data),
  deleteTask: (id) => apiClient.delete(`/tasks/${id}`).then((res) => res.data),
  reports: () => apiClient.get("/reports").then((res) => res.data),
  createReport: (payload) => apiClient.post("/reports", payload).then((res) => res.data),
  feedback: (id, payload) => apiClient.post(`/reports/${id}/feedback`, payload).then((res) => res.data),
  uploadReport: (id, formData) =>
    apiClient.post(`/reports/${id}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((res) => res.data),
  analyticsOverview: () => apiClient.get("/analytics/overview").then((res) => res.data),
  analyticsPerformance: () => apiClient.get("/analytics/performance").then((res) => res.data),
  notifications: () => apiClient.get("/notifications").then((res) => res.data),
  readNotification: (id) => apiClient.patch(`/notifications/${id}/read`).then((res) => res.data),
  dashboard: (role) => apiClient.get(`/dashboard/${role}`).then((res) => res.data),
};
