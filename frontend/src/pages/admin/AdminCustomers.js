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
  Filter,
  ChevronRight,
  ClipboardList,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import "../../styles/admin/AdminDashboard.css";
import "../../styles/admin/AdminCustomers.css";

const customers = [
  {
    id: "KH-1042",
    name: "Nguyễn Minh Quân",
    phone: "090 218 4421",
    vehicle: "Honda CBR1000RR-R",
    plate: "29A1-12345",
    visits: 8,
    spent: "18.4tr",
    lastVisit: "24/10/2026",
    segment: "VIP",
    status: "Đang chăm sóc",
  },
  {
    id: "KH-0988",
    name: "Trần Bảo Anh",
    phone: "091 633 8290",
    vehicle: "Yamaha NVX 155",
    plate: "51B2-89012",
    visits: 5,
    spent: "7.8tr",
    lastVisit: "22/10/2026",
    segment: "Thân thiết",
    status: "Mới đặt lịch",
  },
  {
    id: "KH-0871",
    name: "Lê Hoàng Phúc",
    phone: "093 772 1066",
    vehicle: "Vespa Sprint 150",
    plate: "30L5-77881",
    visits: 3,
    spent: "4.1tr",
    lastVisit: "19/10/2026",
    segment: "Mới",
    status: "Cần nhắc bảo dưỡng",
  },
  {
    id: "KH-0756",
    name: "Phạm Thanh Mai",
    phone: "097 340 5562",
    vehicle: "Honda SH 160i",
    plate: "59H1-44220",
    visits: 11,
    spent: "22.9tr",
    lastVisit: "15/10/2026",
    segment: "VIP",
    status: "Ổn định",
  },
];

const filterOptions = ["Tất cả", "VIP", "Thân thiết", "Mới", "Cần chăm sóc"];

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

export default function AdminCustomers({ onViewChange }) {
  const [activeFilter, setActiveFilter] = useState("Tất cả");

  const filteredCustomers = useMemo(() => {
    if (activeFilter === "Tất cả" || activeFilter === "Cần chăm sóc") return customers;
    return customers.filter((customer) => customer.segment === activeFilter);
  }, [activeFilter]);

  const kpis = [
    ["Tổng khách", "1,248", Users, "neutral", "+36 khách mới tháng này"],
    ["Quay lại", "68%", CheckCircle2, "success", "Tốt hơn 7% so với kỳ trước"],
    ["Cần nhắc", "42", Clock, "warning", "Đến hạn bảo dưỡng trong 7 ngày"],
    ["Doanh thu / KH", "2.8tr", Sparkles, "primary", "Giá trị trung bình mỗi lượt"],
  ];

  return (
    <div className="customers-layout dashboard-layout">
      <ManagerSidebar activeView="customers" onViewChange={onViewChange} />

      <main className="main-content">
        <header className="customers-topbar">
          <div>
            <span>Chăm sóc khách hàng</span>
            <h2>Khách hàng</h2>
          </div>

          <div className="customers-topbar-actions">
            <label className="customers-search">
              <Search />
              <input type="text" placeholder="Tìm tên, số điện thoại, biển số..." />
            </label>
            <button className="customers-icon-btn" type="button" aria-label="Thông báo">
              <Bell />
            </button>
          </div>
        </header>

        <div className="customers-body">
          <section className="customer-kpi-grid">
            {kpis.map(([label, value, Icon, tone, note]) => (
              <article className={`customer-kpi-card ${tone}`} key={label}>
                <div>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <p>{note}</p>
                </div>
                <Icon />
              </article>
            ))}
          </section>

          <section className="customer-filter-panel">
            <span className="customer-filter-label">
              <Filter size={16} /> Bộ lọc
            </span>
            {filterOptions.map((filter) => (
              <button
                className={`customer-filter-btn ${activeFilter === filter ? "active" : ""}`}
                key={filter}
                onClick={() => setActiveFilter(filter)}
                type="button"
              >
                {filter}
              </button>
            ))}
          </section>

          <section className="customer-table-card">
            <div className="customer-table-header">
              <span>Khách hàng</span>
              <span>Xe / biển số</span>
              <span>Lượt đến</span>
              <span>Chi tiêu</span>
              <span>Trạng thái</span>
              <span>Thao tác</span>
            </div>

            <div className="customer-table-body">
              {filteredCustomers.map((customer) => (
                <article className="customer-table-row" key={customer.id}>
                  <div className="customer-name-cell">
                    <div className="customer-avatar">{customer.name.charAt(0)}</div>
                    <div>
                      <strong>{customer.name}</strong>
                      <p>{customer.id} · {customer.phone}</p>
                    </div>
                  </div>
                  <div className="customer-bike-cell">
                    <strong>{customer.vehicle}</strong>
                    <p>{customer.plate}</p>
                  </div>
                  <span>{customer.visits} lượt</span>
                  <span className="customer-spent">{customer.spent}</span>
                  <span className="customer-status">{customer.status}</span>
                  <button className="customer-detail-btn" type="button">
                    Chi tiết <ChevronRight size={15} />
                  </button>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
