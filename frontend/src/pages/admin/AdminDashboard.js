import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Wrench,
  Users,
  BarChart2,
  Shield,
  Plus,
  HelpCircle,
  ClipboardList,
  Banknote,
  Package,
  Activity,
  AlertTriangle,
  User,
} from "lucide-react";
import "../../styles/admin/AdminDashboard.css";

const overviewCards = [
  {
    title: "Tổng người dùng",
    value: 1284,
    display: "1,284",
    meta: "+36 tài khoản trong tháng",
    icon: Users,
    tone: "neutral",
  },
  {
    title: "Tổng đơn đặt lịch",
    value: 428,
    display: "428",
    meta: "78 đơn trong 7 ngày gần nhất",
    icon: ClipboardList,
    tone: "primary",
  },
  {
    title: "Doanh thu",
    value: 186.5,
    display: "186.5M",
    suffix: "M",
    decimals: 1,
    meta: "VND · tăng 12% so với tháng trước",
    icon: Banknote,
    tone: "success",
  },
  {
    title: "Đơn chờ xử lý",
    value: 18,
    display: "18",
    meta: "Cần xác nhận hoặc phân công",
    icon: AlertTriangle,
    tone: "warning",
  },
];

const lowStockItems = [
  { name: "Nhớt Motul 300V 10W40", amount: "Còn 5L", percent: 20, tone: "danger" },
  { name: "Má phanh Brembo Carbon", amount: "Còn 2 bộ", percent: 14, tone: "danger" },
  { name: "Lọc gió K&N CB650R", amount: "Còn 3 cái", percent: 28, tone: "warning" },
];

const recentActivities = [
  { time: "09:42", text: "Quản lý xác nhận lịch #APT-20260528-P1ZOUV", type: "confirm" },
  { time: "09:18", text: "Nhân viên Minh nhận xe BMW R1250GS", type: "assign" },
  { time: "08:55", text: "Cập nhật tồn kho má phanh Brembo", type: "stock" },
  { time: "08:20", text: "Khách hàng Le Thi C tạo lịch rửa xe cao cấp", type: "booking" },
];

const revenueBars = [
  ["T2", 46],
  ["T3", 58],
  ["T4", 52],
  ["T5", 74],
  ["T6", 88],
  ["T7", 65],
  ["CN", 72],
];

const revenueSummary = [
  ["Tổng doanh thu", "186.5M"],
  ["Đơn đã thanh toán", "312"],
  ["Giá trị trung bình", "598K"],
  ["Tăng trưởng", "+12%"],
];

const latestAppointments = [
  {
    code: "APT-20260528-P1ZOUV",
    customer: "Le Thi C",
    service: "Rửa xe cao cấp",
    time: "29/05/2026 - 13:30",
    branch: "MOTOCORE Mỹ Đình",
    status: "Chờ xác nhận",
    statusClass: "pending",
  },
  {
    code: "APT-20260528-ZFU9LI",
    customer: "Nguyễn Minh Quân",
    service: "Bảo dưỡng định kỳ",
    time: "29/05/2026 - 09:30",
    branch: "MOTOCORE Cầu Giấy",
    status: "Đã xác nhận",
    statusClass: "confirmed",
  },
  {
    code: "APT-20260527-K82MA",
    customer: "Trần Thị Hồng",
    service: "Thay lốp",
    time: "28/05/2026 - 16:00",
    branch: "MOTOCORE Mỹ Đình",
    status: "Đang xử lý",
    statusClass: "progress",
  },
  {
    code: "APT-20260527-N4P21",
    customer: "Lê Hoàng Nam",
    service: "Kiểm tra điện",
    time: "28/05/2026 - 08:00",
    branch: "MOTOCORE Hà Đông",
    status: "Hoàn thành",
    statusClass: "completed",
  },
];

function CountUp({ value, suffix = "", decimals = 0 }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let frameId;
    const duration = 900;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(value * eased);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value]);

  const formatted = current.toLocaleString("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });

  return `${formatted}${suffix}`;
}

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

const AdminDashboard = ({ onViewChange }) => {
  return (
    <div className="dashboard-layout">
      <ManagerSidebar activeView="dashboard" onViewChange={onViewChange} />

      <main className="main-content">
        <div className="content-body dashboard-overview">
          <section className="overview-kpi-grid fade-section">
            {overviewCards.map((card) => {
              const Icon = card.icon;
              return (
                <article className={`overview-card ${card.tone}`} key={card.title}>
                  <div className="overview-card-top">
                    <span>{card.title}</span>
                    <Icon />
                  </div>
                  <strong>
                    <CountUp value={card.value} suffix={card.suffix} decimals={card.decimals || 0} />
                  </strong>
                  <p>{card.meta}</p>
                </article>
              );
            })}
          </section>

          <section className="overview-grid fade-section section-delay-1">
            <article className="manager-panel revenue-panel">
              <div className="panel-heading">
                <div>
                  <span>Doanh thu</span>
                  <h3>Biểu đồ doanh thu</h3>
                </div>
                <div className="revenue-filters" aria-label="Lọc thời gian doanh thu">
                  <button className="active" type="button">1 tuần</button>
                  <button type="button">1 tháng</button>
                  <button type="button">1 quý</button>
                  <button type="button">1 năm</button>
                </div>
              </div>
              <div className="revenue-content">
                <div className="revenue-chart" aria-label="Biểu đồ doanh thu theo ngày">
                  {revenueBars.map(([label, value], index) => (
                    <div className="revenue-bar" key={label}>
                      <div style={{ "--bar-height": `${value}%`, "--bar-delay": `${index * 80}ms` }} />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
                <div className="revenue-table">
                  <div className="revenue-table-head">
                    <span>Chỉ số</span>
                    <span>Giá trị</span>
                  </div>
                  {revenueSummary.map(([label, value]) => (
                    <div className="revenue-table-row" key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </section>

          <section className="overview-support-grid fade-section section-delay-2">
            <article className="manager-panel low-stock-panel">
              <div className="panel-heading">
                <div>
                  <span>Kho vật tư</span>
                  <h3>Vật tư sắp hết</h3>
                </div>
                <Package />
              </div>
              <div className="compact-list">
                {lowStockItems.map((item) => (
                  <div className={`stock-row ${item.tone}`} key={item.name}>
                    <div className="stock-row-main">
                      <Package />
                      <div>
                        <span>{item.name}</span>
                        <small>{item.percent}% tồn kho khuyến nghị</small>
                      </div>
                    </div>
                    <div className="stock-row-bottom">
                      <div className="stock-progress">
                        <span style={{ width: `${item.percent}%` }} />
                      </div>
                      <strong>{item.amount}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="manager-panel latest-appointments-panel fade-section section-delay-3">
            <div className="panel-heading">
              <div>
                <span>Lịch hẹn</span>
                <h3>Bảng lịch hẹn mới nhất</h3>
              </div>
              <button className="btn-secondary" type="button">Xem tất cả</button>
            </div>

            <div className="latest-table">
              <div className="latest-table-head">
                <span>Mã đơn</span>
                <span>Khách hàng</span>
                <span>Dịch vụ</span>
                <span>Thời gian hẹn</span>
                <span>Chi nhánh</span>
                <span>Trạng thái</span>
              </div>
              {latestAppointments.map((appointment) => (
                <div className="latest-table-row" key={appointment.code}>
                  <strong>{appointment.code}</strong>
                  <span>{appointment.customer}</span>
                  <span>{appointment.service}</span>
                  <span>{appointment.time}</span>
                  <span>{appointment.branch}</span>
                  <em className={`manager-status ${appointment.statusClass}`}>{appointment.status}</em>
                </div>
              ))}
            </div>
          </section>

          <section className="manager-panel activity-panel fade-section section-delay-4">
            <div className="panel-heading">
              <div>
                <span>Nhật ký</span>
                <h3>Hoạt động gần đây</h3>
              </div>
              <Activity />
            </div>
            <div className="activity-timeline">
              {recentActivities.map((item) => (
                <div className={`activity-row ${item.type}`} key={`${item.time}-${item.text}`}>
                  <time>{item.time}</time>
                  <span className="activity-dot" />
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
