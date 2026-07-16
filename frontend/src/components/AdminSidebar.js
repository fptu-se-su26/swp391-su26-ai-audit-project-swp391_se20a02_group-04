import React from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Wrench,
  Users,
  BarChart2,
  Shield,
  Package,
  User,
  LogOut,
} from "lucide-react";
import { getAuthSession, clearAuthSession } from "../services/authApi";
import "../styles/admin/AdminDashboard.css";

export default function AdminSidebar({ activeView, onViewChange }) {
  const navigate = useNavigate();

  const session = getAuthSession();
  const adminInfo = session.user || {
    full_name: "Admin",
    role: "Quản trị viên",
    avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%23fff7ed"/><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="%23ff6b00"/></svg>'
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login");
  };

  const navItems = [
    ["dashboard", LayoutDashboard, "Tổng quan"],
    ["calendar", Calendar, "Lịch hẹn"],
    ["services", Wrench, "Dịch vụ"],
    ["customers", Users, "Khách hàng"],
    ["users", Shield, "Người dùng"],
    ["inventory", Package, "Kho"],
    ["reports", BarChart2, "Báo cáo"],
    ["profile", User, "Hồ sơ"],
  ];

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-brand">
          <h1>MOTOCORE</h1>
          <p>Quản lý garage</p>
        </div>

        <nav className="sidebar-nav" aria-label="Quản lý garage">
          {navItems.map(([view, Icon, label]) => (
            <a
              className={`nav-item ${activeView === view ? "active" : ""}`}
              href="#"
              key={view}
              onClick={(event) => {
                event.preventDefault();
                onViewChange?.(view);
              }}
            >
              <Icon className="nav-icon" />
              <span>{label}</span>
            </a>
          ))}
        </nav>
      </div>

      <div className="sidebar-footer" style={{ borderTop: "1px solid rgba(226, 191, 176, 0.3)", padding: "20px 24px" }}>
        {/* Profile and Logout Row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", width: "100%", marginBottom: "16px" }}>
          {/* Avatar + Info */}
          <div 
            style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0, cursor: "pointer" }} 
            onClick={() => onViewChange?.("profile")}
          >
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden", backgroundColor: "#fff7ed", border: "1px solid #ffedd5", flexShrink: 0 }}>
              <img 
                src={adminInfo.avatar || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%23fff7ed"/><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="%23ff6b00"/></svg>'} 
                alt="Admin" 
                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {adminInfo.full_name || adminInfo.fullname || "Admin"}
              </span>
              <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#64748b" }}>
                {adminInfo.role || "Admin"}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            style={{
              background: "#fef2f2",
              border: "none",
              color: "#ef4444",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
