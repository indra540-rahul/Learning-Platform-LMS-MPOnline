import { Routes, Route } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

import Home from "../pages/Home";
import About from "../pages/About";
import Contact from "../pages/Contact";
import Courses from "../pages/Courses";
import Auth from "../pages/Auth";
import Checkout from "../components/Checkout";

import AdminDashboard from "../pages/dashboard/AdminDashboard";
import UserDashboard from "../pages/dashboard/UserDashboard";
import MentorDashboard from "../pages/dashboard/MentorDashboard";

import ProtectedRoute from "./ProtectedRoute";

const AppRoutes = () => {
  return (
    <Routes>

      {/* PAGES WITH NAVBAR + FOOTER */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/checkout" element={<Checkout />} />
      </Route>

      <Route path="/auth" element={<MainLayout />}>
        <Route index element={<Auth />} />
      </Route>

      {/* DASHBOARDS (NO NAVBAR/FOOTER) */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute role="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/user/*"
        element={
          <ProtectedRoute role="student">
            <UserDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/mentor/*"
        element={
          <ProtectedRoute role="mentor">
            <MentorDashboard />
          </ProtectedRoute>
        }
      />

    </Routes>
  );
};

export default AppRoutes;
