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
  Search,
  Bell,
  ChevronRight,
  Filter,
  Clock,
  User,
  ClipboardList,
  CheckCircle2,
  Timer,
  Bike,
} from "lucide-react";
import "../../styles/admin/AdminDashboard.css";
import "../../styles/admin/AdminCalendar.css";
import AppointmentDetailPage from "../manager/AppointmentDetailPage";

const appointmentKpis = [
  ["Tổng lịch", "128", ClipboardList, "neutral", "+12 lịch tuần này"],
  ["Chờ xác nhận", "18", Timer, "warning", "Cần xử lý trước 16:00"],
  ["Đang xử lý", "24", Wrench, "progress", "8 kệ sửa đang bận"],
  ["Hoàn tất hôm nay", "31", CheckCircle2, "success", "Tỷ lệ đúng hẹn 94%"],
];

const workflowSteps = [
  ["pending", "Chờ xác nhận", "18"],
  ["confirmed", "Đã xác nhận", "42"],
  ["progress", "Đang xử lý", "24"],
  ["completed", "Hoàn tất", "31"],
];

const appointments = [
  {
    id: "#MC-99281",
    service: "Bảo dưỡng định kỳ 10.000km",
    customer: "Nguyễn Minh Quân",
    vehicle: "Honda CBR1000RR-R - 29A1-12345",
    time: "24/10/2026",
    hour: "09:00",
    bay: "Kệ sửa 02",
    urgency: "Ưu tiên cao",
    status: "IN_PROGRESS",
    statusText: "Đang xử lý",
  },
  {
    id: "#MC-99275",
    service: "Thay lốp và cân vành",
    customer: "Trần Thị Hồng",
    vehicle: "Ducati Panigale V4 - 59F1-88888",
    time: "24/10/2026",
    hour: "14:30",
    bay: "Chờ tiếp nhận",
    urgency: "Sắp đến giờ",
    status: "CONFIRMED",
    statusText: "Đã xác nhận",
  },
  {
    id: "#MC-99260",
    service: "Vệ sinh buồng đốt",
    customer: "Lê Hoàng Nam",
    vehicle: "Yamaha R1M - 30H1-6789",
    time: "15/10/2026",
    hour: "10:00",
    bay: "Chưa phân kệ",
    urgency: "Lịch mới",
    status: "PENDING",
    statusText: "Chờ xác nhận",
  },
  {
    id: "#MC-99244",
    service: "Rửa xe cao cấp",
    customer: "Le Thi C",
    vehicle: "BMW R1250GS - 30K1-45678",
    time: "15/10/2026",
    hour: "16:00",
    bay: "Kệ chăm sóc 01",
    urgency: "Ổn định",
    status: "COMPLETED",
    statusText: "Hoàn tất",
  },
];

const filterOptions = [
  ["all", "Tất cả"],
  ["PENDING", "Chờ xác nhận"],
  ["CONFIRMED", "Đã xác nhận"],
  ["IN_PROGRESS", "Đang xử lý"],
  ["COMPLETED", "Hoàn tất"],
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

const AdminCalendar = ({ onViewChange }) => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const filteredAppointments = useMemo(() => {
    if (activeFilter === "all") return appointments;
    return appointments.filter((item) => item.status === activeFilter);
  }, [activeFilter]);

  return (
    <div className="calendar-layout dashboard-layout">
      <ManagerSidebar activeView="calendar" onViewChange={onViewChange} />

      <main className="main-content">
        {selectedAppointment ? (
          <div className="calendar-detail-body appointment-detail-scope">
            <AppointmentDetailPage
              appointment={selectedAppointment}
              onBack={() => setSelectedAppointment(null)}
              onConfirm={() => setSelectedAppointment((current) => current ? { ...current, status: "CONFIRMED", statusText: "Đã xác nhận" } : current)}
              onStart={() => setSelectedAppointment((current) => current ? { ...current, status: "IN_PROGRESS", statusText: "Đang xử lý" } : current)}
              onComplete={() => setSelectedAppointment((current) => current ? { ...current, status: "COMPLETED", statusText: "Hoàn tất" } : current)}
            />
          </div>
        ) : (
          <>
        <header className="calendar-topbar">
          <div>
            <span className="calendar-eyebrow">Điều phối garage</span>
            <h2>Lịch hẹn</h2>
          </div>

          <div className="calendar-topbar-actions">
            <label className="calendar-search">
              <Search />
              <input type="text" placeholder="Tìm mã lịch, khách hàng, biển số..." />
            </label>
            <button className="topbar-icon" type="button" aria-label="Thông báo">
              <Bell />
            </button>
          </div>
        </header>

        <div className="calendar-body">
          <section className="calendar-kpi-grid" aria-label="Tổng hợp lịch hẹn">
            {appointmentKpis.map(([label, value, Icon, tone, note]) => (
              <article className={`calendar-kpi-card ${tone}`} key={label}>
                <div>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <p>{note}</p>
                </div>
                <Icon />
              </article>
            ))}
          </section>

          <section className="workflow-card" aria-label="Trạng thái quy trình">
            {workflowSteps.map(([tone, label, count], index) => (
              <div className={`workflow-step ${tone}`} key={label}>
                <span>{count}</span>
                <strong>{label}</strong>
                {index < workflowSteps.length - 1 && <em />}
              </div>
            ))}
          </section>

          <section className="appointment-toolbar">
            <div className="filter-buttons">
              <span className="btn-filter-icon">
                <Filter size={16} /> Bộ lọc
              </span>
              {filterOptions.map(([value, label]) => (
                <button
                  className={`filter-btn ${activeFilter === value ? "active" : ""}`}
                  key={value}
                  onClick={() => setActiveFilter(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="appointment-table">
            <div className="table-header">
              <div className="col-id">Mã lịch</div>
              <div className="col-info">Khách hàng và dịch vụ</div>
              <div className="col-time">Thời gian</div>
              <div className="col-bay">Kệ / ưu tiên</div>
              <div className="col-status">Trạng thái</div>
              <div className="col-action">Thao tác</div>
            </div>

            <div className="table-body">
              {filteredAppointments.map((item) => (
                <article className="table-row" key={item.id}>
                  <div className="col-id font-bold">{item.id}</div>
                  <div className="col-info">
                    <div className="service-name-row">
                      <Bike size={18} />
                      <p className="service-name">{item.service}</p>
                    </div>
                    <p className="vehicle-name">{item.customer} - {item.vehicle}</p>
                  </div>
                  <div className="col-time">
                    <p className="time-date">
                      <Calendar size={14} className="mr-2" /> {item.time}
                    </p>
                    <p className="time-hour">
                      <Clock size={14} className="mr-2" /> {item.hour}
                    </p>
                  </div>
                  <div className="col-bay">
                    <strong>{item.bay}</strong>
                    <span>{item.urgency}</span>
                  </div>
                  <div className="col-status">
                    <span className={`status-badge ${item.status.toLowerCase()}`}>
                      <span className="dot" />
                      {item.statusText}
                    </span>
                  </div>
                  <div className="col-action">
                    <button
                      className="detail-link"
                      type="button"
                      onClick={() => setSelectedAppointment(item)}
                    >
                      Chi tiết <ChevronRight size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminCalendar;
