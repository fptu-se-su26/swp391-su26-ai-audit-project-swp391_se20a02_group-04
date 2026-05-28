import React from "react";
import {
  LayoutDashboard,
  Calendar,
  Wrench,
  Users,
  BarChart2,
  Plus,
  HelpCircle,
  Search,
  Bell,
  Settings,
  ClipboardList,
  Banknote,
  PenTool,
  Bike,
  Zap,
  User,
} from "lucide-react";
import "../../styles/admin/AdminDashboard.css";

const appointments = [
  {
    icon: Bike,
    name: "NGUYỄN MINH QUÂN",
    vehicle: "BMW R1250GS",
    service: "Bảo dưỡng định kỳ 20.000km",
    time: "14:30 Hôm nay",
  },
  {
    icon: Wrench,
    name: "TRẦN THỊ HỒNG",
    vehicle: "DUCATI V4S",
    service: "Thay lốp & vệ sinh sên dĩa",
    time: "16:00 Hôm nay",
  },
  {
    icon: Zap,
    name: "LÊ HOÀNG NAM",
    vehicle: "HONDA CB650R",
    service: "Kiểm tra hệ thống điện",
    time: "08:00 Ngày mai",
  },
];

const staff = [
  ["Minh", "Trưởng nhóm", "3 việc", "status-dot-green"],
  ["Thắng", "Kỹ thuật", "2 việc", "status-dot-green"],
  ["Quốc", "Học việc", "Đang hỗ trợ", "status-dot-yellow"],
];

const AdminDashboard = ({ onViewChange }) => {
  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div>
          <div className="sidebar-brand">
            <h1>QUẢN LÝ GARAGE</h1>
            <p>Hệ thống quản lý</p>
          </div>

          <nav className="sidebar-nav">
            <a
              href="#"
              className="nav-item active"
              onClick={(event) => {
                event.preventDefault();
                if (onViewChange) onViewChange("dashboard");
              }}
            >
              <LayoutDashboard className="nav-icon" />
              <span>Tổng quan</span>
            </a>
            <a
              href="#"
              className="nav-item"
              onClick={(event) => {
                event.preventDefault();
                if (onViewChange) onViewChange("calendar");
              }}
            >
              <Calendar className="nav-icon" />
              <span>Lịch hẹn</span>
            </a>
            <a href="#" className="nav-item" onClick={(e) => e.preventDefault()}>
              <Wrench className="nav-icon" />
              <span>Dịch vụ</span>
            </a>
            <a href="#" className="nav-item" onClick={(e) => e.preventDefault()}>
              <Users className="nav-icon" />
              <span>Khách hàng</span>
            </a>
            <a href="#" className="nav-item" onClick={(e) => e.preventDefault()}>
              <BarChart2 className="nav-icon" />
              <span>Báo cáo</span>
            </a>
            <a
              href="#"
              className="nav-item"
              onClick={(event) => {
                event.preventDefault();
                if (onViewChange) onViewChange("profile");
              }}
            >
              <User className="nav-icon" />
              <span>Hồ sơ</span>
            </a>
          </nav>
        </div>

        <div className="sidebar-footer">
          <button className="btn-primary">
            <Plus className="btn-icon" />
            ĐẶT LỊCH MỚI
          </button>
          <a href="#" className="support-link">
            <HelpCircle className="support-icon" />
            <span>Hỗ trợ</span>
          </a>
        </div>
      </aside>

      <main className="main-content">
        <header className="header">
          <h2>MOTOCORE</h2>

          <div className="header-actions">
            <div className="search-container">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Tìm kiếm mã đơn, biển số..."
                className="search-input"
              />
            </div>
            <div className="header-icons">
              <div className="icon-wrapper">
                <Bell className="header-icon" />
                <span className="badge" />
              </div>
              <Settings className="header-icon" onClick={() => { if (onViewChange) onViewChange("profile"); }} style={{ cursor: "pointer" }} />
              <div className="avatar" onClick={() => { if (onViewChange) onViewChange("profile"); }}>
                <img src='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%23fff7ed"/><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="%23ff6b00"/></svg>' alt="Ảnh đại diện" />
              </div>
            </div>
          </div>
        </header>

        <div className="content-body">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-header">
                <p className="stat-title">Lịch hẹn hôm nay</p>
                <ClipboardList className="stat-icon" />
              </div>
              <div>
                <h3 className="stat-value-orange">24</h3>
                <p className="stat-meta-green">
                  <BarChart2 style={{ width: "12px", height: "12px", marginRight: "4px" }} />
                  +12% so với hôm qua
                </p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <p className="stat-title">Doanh thu ngày</p>
                <Banknote className="stat-icon" />
              </div>
              <div>
                <h3 className="stat-value-white">18.5M</h3>
                <p className="stat-meta-gray">VNĐ • Tăng trưởng ổn định</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <p className="stat-title">Đang xử lý</p>
                <PenTool className="stat-icon" />
              </div>
              <div>
                <h3 className="stat-value-white">08</h3>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" />
                </div>
                <p className="stat-meta-gray">8/12 kệ sửa chữa đang bận</p>
              </div>
            </div>
          </div>

          <div className="main-grid">
            <div className="appointments-section">
              <div className="section-header">
                <h3 className="section-title">Lịch hẹn cần xác nhận</h3>
                <a href="#" className="section-link">
                  Xem tất cả
                </a>
              </div>

              <div className="appointments-list">
                {appointments.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div className="appointment-card" key={item.name}>
                      <div className="appointment-info">
                        <div className="icon-box">
                          <Icon className="info-icon" />
                        </div>
                        <div className="customer-details">
                          <div className="customer-name-row">
                            <h4 className="customer-name">{item.name}</h4>
                            <span className="bike-badge">{item.vehicle}</span>
                          </div>
                          <p className="service-desc">
                            {item.service} • <span className="highlight-text">{item.time}</span>
                          </p>
                        </div>
                      </div>
                      <div className="appointment-actions">
                        <button className="btn-secondary">CHI TIẾT</button>
                        <button className="btn-assign">
                          <Users style={{ width: "16px", height: "16px" }} /> PHÂN CÔNG
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="right-sidebar">
              <div className="sidebar-block">
                <h3 className="sidebar-block-title">Nhân sự trực ca</h3>
                <div className="staff-card">
                  {staff.map(([name, role, count, statusClass]) => (
                    <div className="staff-row" key={name}>
                      <div className="staff-name-container">
                        <span className={statusClass} />
                        <span className="staff-name">
                          {name} <span className="staff-role">({role})</span>
                        </span>
                      </div>
                      <span className="staff-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sidebar-block">
                <h3 className="sidebar-block-title">Phụ tùng sắp hết</h3>
                <div className="parts-card">
                  <div className="parts-list">
                    <div className="parts-row border-bottom">
                      <span className="part-name">Nhớt Motul 300V 10W40</span>
                      <span className="stock-badge">CÒN 5L</span>
                    </div>
                    <div className="parts-row">
                      <span className="part-name">Má phanh Brembo Carbon</span>
                      <span className="stock-badge">CÒN 2 BỘ</span>
                    </div>
                  </div>
                  <button className="btn-outline">Nhập thêm hàng</button>
                </div>
              </div>
            </div>
          </div>

          <footer className="footer">
            <h4>MOTOCORE GARAGE</h4>
            <div className="footer-links">
              <a href="#">Chính sách bảo mật</a>
              <a href="#">Điều khoản dịch vụ</a>
              <a href="#">Liên hệ</a>
            </div>
            <p className="footer-copyright">
              © 2024 MOTOCORE INDUSTRIAL GARAGE. Bảo lưu mọi quyền.
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
