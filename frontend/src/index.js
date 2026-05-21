import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./App";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import BookingPage from "./pages/customer/BookingPage";
import HomePage from "./pages/home/HomePage";
import StaffLayout from "./pages/staff/StaffLayout";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/admin/*" element={<App />} />
        <Route path="/*" element={<StaffLayout />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
