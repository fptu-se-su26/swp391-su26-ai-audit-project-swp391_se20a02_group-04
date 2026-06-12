import React from "react";
import {
  BarChart2,
  Calendar,
  HelpCircle,
  LayoutDashboard,
  Package,
  Plus,
  Shield,
  User,
  Users,
  Wrench,
} from "lucide-react";
import InventoryModule from "../inventory/InventoryModule";
import "../../styles/admin/AdminDashboard.css";

function AdminInventorySidebar({ activeView = "inventory", onViewChange }) {
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

      <div className="sidebar-footer">
        <button className="btn-primary" type="button">
          <Plus className="btn-icon" />
          Đặt lịch mới
        </button>
        <a href="#" className="support-link" onClick={(event) => event.preventDefault()}>
          <HelpCircle className="support-icon" />
          <span>Hỗ trợ</span>
        </a>
      </div>
    </aside>
  );
}

export default function AdminInventory({ onViewChange }) {
  return (
    <div className="dashboard-layout">
      <AdminInventorySidebar activeView="inventory" onViewChange={onViewChange} />
      <main className="main-content">
        <div className="content-body">
          <InventoryModule basePath="/admin/inventory" />
        </div>
      </main>
    </div>
  );
}
