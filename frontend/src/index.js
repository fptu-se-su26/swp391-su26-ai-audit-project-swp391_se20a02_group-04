import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes } from "react-router-dom";
import "./index.css";
import App from "./App";
import ProtectedRoute from "./components/ProtectedRoute";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import VerifyOtpPage from "./pages/auth/VerifyOtpPage";
import AboutPage from "./pages/home/AboutPage";
import ServicesPage from "./pages/home/ServicesPage";
import BookingPage from "./pages/customer/BookingPage";
import UserProfile from "./pages/customer/UserProfile";
import SupportChat from "./pages/customer/SupportChat";
import HomePage from "./pages/home/HomePage";
import StaffLayout from "./pages/staff/StaffLayout";
import ManagerLayout from "./pages/manager/ManagerLayout";
import "./styles/design-system.css";

function UnauthorizedPage() {
  return (
    <main className="route-message-page">
      <section className="route-message-card">
        <span className="material-symbols-outlined route-message-icon">block</span>
        <p className="route-message-eyebrow">Không đủ quyền</p>
        <h1>Bạn không thể truy cập khu vực này</h1>
        <p>Vui lòng quay lại dashboard phù hợp với vai trò hiện tại của tài khoản.</p>
      </section>
    </main>
  );
}

const staticRoute = window.__MOTOCARE_STATIC_ROUTE__;
const Router = staticRoute ? MemoryRouter : BrowserRouter;
const routerProps = staticRoute
  ? { initialEntries: [staticRoute] }
  : {};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router {...routerProps}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route
          path="/booking"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <BookingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <UserProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/support"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <SupportChat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <App />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/*"
          element={
            <ProtectedRoute allowedRoles={["STAFF"]}>
              <StaffLayout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/*"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <ManagerLayout />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
