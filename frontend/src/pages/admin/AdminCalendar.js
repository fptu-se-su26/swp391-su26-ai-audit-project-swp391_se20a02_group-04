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
  ChevronRight,
  Filter,
  Clock,
} from "lucide-react";
import "../../styles/admin/AdminCalendar.css";

const appointments = [
  {
    id: "#MC-99281",
    service: "BẢO DƯỠNG ĐỊNH KỲ 10.000KM",
    vehicle: "Honda CBR1000RR-R • 29A1-12345",
    time: "24/10/2024",
    hour: "09:00 AM",
    status: "IN_PROGRESS",
    statusText: "ĐANG XỬ LÝ",
  },
  {
    id: "#MC-99275",
    service: "THAY LỐP & CÂN VÀNH",
    vehicle: "Ducati Panigale V4 • 59F1-88888",
    time: "24/10/2024",
    hour: "02:30 PM",
    status: "CONFIRMED",
    statusText: "ĐÃ XÁC NHẬN",
  },
  {
    id: "#MC-99260",
    service: "VỆ SINH BUỒNG ĐỐT",
    vehicle: "Yamaha R1M • 30H1-6789",
    time: "15/10/2024",
    hour: "10:00 AM",
    status: "PENDING",
    statusText: "CHỜ XÁC NHẬN",
  },
];

const AdminCalendar = ({ onViewChange }) => {
  return (
    <div className="calendar-layout">
      <aside className="sidebar">
        <div>
          <div className="sidebar-brand">
            <h1>QUẢN LÝ GARAGE</h1>
            <p>Hệ thống quản lý</p>
          </div>

          <nav className="sidebar-nav">
            <a
              href="#"
              className="nav-item"
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
              className="nav-item active"
              onClick={(event) => {
                event.preventDefault();
                if (onViewChange) onViewChange("calendar");
              }}
            >
              <Calendar className="nav-icon" />
              <span>Lịch hẹn</span>
            </a>
            <a href="#" className="nav-item">
              <Wrench className="nav-icon" />
              <span>Dịch vụ</span>
            </a>
            <a href="#" className="nav-item">
              <Users className="nav-icon" />
              <span>Khách hàng</span>
            </a>
            <a href="#" className="nav-item">
              <BarChart2 className="nav-icon" />
              <span>Báo cáo</span>
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
          <div className="header-left">
            <h2>MOTOCORE</h2>
            <span className="breadcrumb">Quản trị garage</span>
          </div>

          <div className="header-actions">
            <div className="search-container">
              <Search className="search-icon" />
              <input type="text" placeholder="Tìm mã lịch..." className="search-input" />
            </div>
            <div className="header-icons">
              <Bell className="header-icon" />
              <Settings className="header-icon" />
              <div className="avatar">
                <img src="/api/placeholder/32/32" alt="Quản trị viên" />
              </div>
            </div>
          </div>
        </header>

        <div className="calendar-body">
          <h2 className="page-title">Lịch hẹn của tôi</h2>

          <div className="filter-bar">
            <div className="filter-buttons">
              <button className="btn-filter-icon">
                <Filter size={16} /> BỘ LỌC:
              </button>
              <button className="filter-btn active">TẤT CẢ</button>
              <button className="filter-btn">CHỜ XÁC NHẬN</button>
              <button className="filter-btn">ĐÃ XÁC NHẬN</button>
              <button className="filter-btn">ĐANG XỬ LÝ</button>
              <button className="filter-btn">HOÀN TẤT</button>
            </div>
            <div className="total-box">
              <p>TỔNG LỊCH HẸN</p>
              <h3>12</h3>
            </div>
          </div>

          <div className="appointment-table">
            <div className="table-header">
              <div className="col-id">MÃ LỊCH</div>
              <div className="col-info">DỊCH VỤ & PHƯƠNG TIỆN</div>
              <div className="col-time">THỜI GIAN</div>
              <div className="col-status">TRẠNG THÁI</div>
              <div className="col-action">THAO TÁC</div>
            </div>

            <div className="table-body">
              {appointments.map((item) => (
                <div className="table-row" key={item.id}>
                  <div className="col-id font-bold text-gray-400">{item.id}</div>
                  <div className="col-info">
                    <p className="service-name">{item.service}</p>
                    <p className="vehicle-name">{item.vehicle}</p>
                  </div>
                  <div className="col-time">
                    <p className="time-date flex items-center">
                      <Calendar size={14} className="mr-2" /> {item.time}
                    </p>
                    <p className="time-hour flex items-center">
                      <Clock size={14} className="mr-2" /> {item.hour}
                    </p>
                  </div>
                  <div className="col-status">
                    <span className={`status-badge ${item.status.toLowerCase()}`}>
                      <span className="dot" />
                      {item.statusText}
                    </span>
                  </div>
                  <div className="col-action">
                    <button className="detail-link">
                      Chi tiết <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
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

export default AdminCalendar;
