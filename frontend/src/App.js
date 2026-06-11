import React from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCalendar from "./pages/admin/AdminCalendar";
import AdminProfile from "./pages/admin/AdminProfile";
import AdminServices from "./pages/admin/AdminServices";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminReports from "./pages/admin/AdminReports";
import "./App.css";

const ADMIN_PAGES = new Set([
  "dashboard",
  "calendar",
  "services",
  "customers",
  "users",
  "reports",
  "profile",
]);

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPage = location.pathname.split("/")[2] || "dashboard";

  const handleViewChange = (page) => {
    navigate(`/admin/${page}`);
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <AdminDashboard onViewChange={handleViewChange} />;
      case "calendar":
        return <AdminCalendar onViewChange={handleViewChange} />;
      case "services":
        return <AdminServices onViewChange={handleViewChange} />;
      case "customers":
        return <AdminCustomers onViewChange={handleViewChange} />;
      case "users":
        return <AdminUsers onViewChange={handleViewChange} />;
      case "reports":
        return <AdminReports onViewChange={handleViewChange} />;
      case "profile":
        return <AdminProfile onViewChange={handleViewChange} />;
      default:
        return <AdminDashboard onViewChange={handleViewChange} />;
    }
  };

  if (!ADMIN_PAGES.has(currentPage)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <div className="App">{renderPage()}</div>;
}

export default App;
