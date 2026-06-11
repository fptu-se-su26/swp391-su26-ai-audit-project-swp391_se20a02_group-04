import React, { useMemo, useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Wrench,
  Users,
  BarChart2,
  Shield,
  Plus,
  HelpCircle,
  User,
  Search,
  Bell,
  Download,
  TrendingUp,
  ClipboardList,
  Gauge,
  LineChart,
} from "lucide-react";
import "../../styles/admin/AdminDashboard.css";
import "../../styles/admin/AdminReports.css";

const weeklyRevenue = [
  ["T2", 42],
  ["T3", 58],
  ["T4", 50],
  ["T5", 73],
  ["T6", 66],
  ["T7", 88],
  ["CN", 61],
];

const serviceRows = [
  ["Bảo dưỡng định kỳ", 86, "124.8tr", "96%"],
  ["Thay lốp và cân vành", 42, "78.5tr", "91%"],
  ["Kiểm tra điện - ắc quy", 37, "35.2tr", "89%"],
  ["Chăm sóc xe cao cấp", 24, "52.1tr", "94%"],
];

function ManagerSidebar({ activeView, onViewChange }) {
  const navItems = [
    ["dashboard", LayoutDashboard, "Tổng quan"],
    ["calendar", Calendar, "Lịch hẹn"],
    ["services", Wrench, "Dịch vụ"],
    ["customers", Users, "Khách hàng"],
    ["users", Shield, "Người dùng"],
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
        <button className="btn-primary" type="button" onClick={() => onViewChange?.("calendar")}>
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

export default function AdminReports({ onViewChange }) {
  const [period, setPeriod] = useState("Tháng này");
  const totalRevenue = useMemo(() => weeklyRevenue.reduce((sum, [, value]) => sum + value, 0), []);

  const kpis = [
    ["Doanh thu", "486.3tr", TrendingUp, "neutral", "+12.4% so với kỳ trước"],
    ["Lịch hoàn tất", "312", ClipboardList, "success", "Tỷ lệ đúng hẹn 94%"],
    ["Công suất kệ", "82%", Gauge, "warning", "Giờ cao điểm 09:00 - 16:00"],
    ["Lợi nhuận ước tính", "143.7tr", LineChart, "primary", "Biên lợi nhuận 29.5%"],
  ];

  return (
    <div className="reports-layout dashboard-layout">
      <ManagerSidebar activeView="reports" onViewChange={onViewChange} />

      <main className="main-content">
        <header className="reports-topbar">
          <div>
            <span>Hiệu suất garage</span>
            <h2>Báo cáo</h2>
          </div>

          <div className="reports-topbar-actions">
            <label className="reports-search">
              <Search />
              <input type="text" placeholder="Tìm chỉ số, dịch vụ, nhân sự..." />
            </label>
            <button className="reports-icon-btn" type="button" aria-label="Thông báo">
              <Bell />
            </button>
          </div>
        </header>

        <div className="reports-body">
          <section className="report-period-panel">
            {["Hôm nay", "Tuần này", "Tháng này", "Quý này"].map((item) => (
              <button
                className={`report-period-btn ${period === item ? "active" : ""}`}
                key={item}
                onClick={() => setPeriod(item)}
                type="button"
              >
                {item}
              </button>
            ))}
            <button className="report-export-btn" type="button">
              <Download size={16} /> Xuất báo cáo
            </button>
          </section>

          <section className="report-kpi-grid">
            {kpis.map(([label, value, Icon, tone, note]) => (
              <article className={`report-kpi-card ${tone}`} key={label}>
                <div>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <p>{note}</p>
                </div>
                <Icon />
              </article>
            ))}
          </section>

          <section className="report-grid">
            <article className="report-panel revenue">
              <div className="report-panel-heading">
                <div>
                  <span>Doanh thu 7 ngày</span>
                  <h3>{totalRevenue}tr</h3>
                </div>
                <BarChart2 />
              </div>

              <div className="report-chart">
                {weeklyRevenue.map(([label, value], index) => (
                  <div className="report-bar" key={label}>
                    <div style={{ "--bar-height": `${value}%`, "--bar-delay": `${index * 0.05}s` }} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="report-panel operations">
              <div className="report-panel-heading">
                <div>
                  <span>Vận hành</span>
                  <h3>Ổn định</h3>
                </div>
                <TrendingUp />
              </div>

              <div className="report-compact-list">
                <div><span>Thời gian chờ trung bình</span><strong>18 phút</strong></div>
                <div><span>Lịch bị đổi giờ</span><strong>9</strong></div>
                <div><span>Phụ tùng sắp hết</span><strong>14 mã</strong></div>
                <div><span>Đánh giá dịch vụ</span><strong>4.8/5</strong></div>
              </div>
            </article>
          </section>

          <section className="report-table-card">
            <div className="report-table-title">
              <div>
                <span>Top dịch vụ</span>
                <h3>Đóng góp doanh thu</h3>
              </div>
              <strong>{period}</strong>
            </div>
            <div className="report-table-header">
              <span>Dịch vụ</span>
              <span>Đơn</span>
              <span>Doanh thu</span>
              <span>Hoàn tất</span>
            </div>
            <div className="report-table-body">
              {serviceRows.map(([name, orders, revenue, rate]) => (
                <article className="report-table-row" key={name}>
                  <strong>{name}</strong>
                  <span>{orders}</span>
                  <span>{revenue}</span>
                  <span className="report-rate">{rate}</span>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
