import React from 'react';
import {
    LayoutDashboard, Calendar, Wrench, Users, BarChart2,
    Plus, HelpCircle, Search, Bell, Settings,
    ClipboardList, Banknote, PenTool, Bike, Zap
} from 'lucide-react';
import '../../styles/admin/AdminDashboard.css';

const AdminDashboard = ({ onViewChange }) => {
    return (
        <div className="dashboard-layout">

            {/* SIDEBAR */}
            <aside className="sidebar">
                <div>
                    <div className="sidebar-brand">
                        <h1>GARAGE ADMIN</h1>
                        <p>Hệ thống quản lý</p>
                    </div>

                    <nav className="sidebar-nav">
                        <a 
                            href="#" 
                            className="nav-item active"
                            onClick={(e) => {
                                e.preventDefault();
                                if (onViewChange) onViewChange('dashboard');
                            }}
                        >
                            <LayoutDashboard className="nav-icon" />
                            <span>Dashboard</span>
                        </a>
                        <a 
                            href="#" 
                            className="nav-item"
                            onClick={(e) => {
                                e.preventDefault();
                                if (onViewChange) onViewChange('calendar');
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

            {/* MAIN CONTENT */}
            <main className="main-content">

                {/* HEADER */}
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
                                <span className="badge"></span>
                            </div>
                            <Settings className="header-icon" />
                            <div className="avatar">
                                <img src="/api/placeholder/32/32" alt="Avatar" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* DASHBOARD CONTENT BODY */}
                <div className="content-body">

                    {/* STATS ROW */}
                    <div className="stats-grid">
                        {/* Stat 1 */}
                        <div className="stat-card">
                            <div className="stat-header">
                                <p className="stat-title">Lịch hẹn hôm nay</p>
                                <ClipboardList className="stat-icon" />
                            </div>
                            <div>
                                <h3 className="stat-value-orange">24</h3>
                                <p className="stat-meta-green">
                                    <BarChart2 style={{ width: '12px', height: '12px', marginRight: '4px' }} /> +12% so với hôm qua
                                </p>
                            </div>
                        </div>

                        {/* Stat 2 */}
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

                        {/* Stat 3 */}
                        <div className="stat-card">
                            <div className="stat-header">
                                <p className="stat-title">Đang xử lý</p>
                                <PenTool className="stat-icon" />
                            </div>
                            <div>
                                <h3 className="stat-value-white">08</h3>
                                <div className="progress-bar-container">
                                    <div className="progress-bar-fill"></div>
                                </div>
                                <p className="stat-meta-gray">8/12 Kệ sửa chữa đang bận</p>
                            </div>
                        </div>
                    </div>

                    {/* MAIN GRID */}
                    <div className="main-grid">

                        {/* LEFT COL: LỊCH HẸN CẦN XÁC NHẬN */}
                        <div className="appointments-section">
                            <div className="section-header">
                                <h3 className="section-title">Lịch hẹn cần xác nhận</h3>
                                <a href="#" className="section-link">Xem tất cả</a>
                            </div>

                            <div className="appointments-list">
                                {/* Appointment Card 1 */}
                                <div className="appointment-card">
                                    <div className="appointment-info">
                                        <div className="icon-box">
                                            <Bike className="info-icon" />
                                        </div>
                                        <div className="customer-details">
                                            <div className="customer-name-row">
                                                <h4 className="customer-name">NGUYỄN MINH QUÂN</h4>
                                                <span className="bike-badge">BMW R1250GS</span>
                                            </div>
                                            <p className="service-desc">
                                                Bảo dưỡng định kỳ 20.000km • <span className="highlight-text">14:30 Hôm nay</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="appointment-actions">
                                        <button className="btn-secondary">CHI TIẾT</button>
                                        <button className="btn-assign">
                                            <Users style={{ width: '16px', height: '16px' }} /> PHÂN CÔNG
                                        </button>
                                    </div>
                                </div>

                                {/* Appointment Card 2 */}
                                <div className="appointment-card">
                                    <div className="appointment-info">
                                        <div className="icon-box">
                                            <Wrench className="info-icon" />
                                        </div>
                                        <div className="customer-details">
                                            <div className="customer-name-row">
                                                <h4 className="customer-name">TRẦN THỊ HỒNG</h4>
                                                <span className="bike-badge">DUCATI V4S</span>
                                            </div>
                                            <p className="service-desc">
                                                Thay lốp & Vệ sinh sên dĩa • <span className="highlight-text">16:00 Hôm nay</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="appointment-actions">
                                        <button className="btn-secondary">CHI TIẾT</button>
                                        <button className="btn-assign">
                                            <Users style={{ width: '16px', height: '16px' }} /> PHÂN CÔNG
                                        </button>
                                    </div>
                                </div>

                                {/* Appointment Card 3 */}
                                <div className="appointment-card">
                                    <div className="appointment-info">
                                        <div className="icon-box">
                                            <Zap className="info-icon" />
                                        </div>
                                        <div className="customer-details">
                                            <div className="customer-name-row">
                                                <h4 className="customer-name">LÊ HOÀNG NAM</h4>
                                                <span className="bike-badge">HONDA CB650R</span>
                                            </div>
                                            <p className="service-desc">
                                                Kiểm tra hệ thống điện • <span className="highlight-text">08:00 Ngày mai</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="appointment-actions">
                                        <button className="btn-secondary">CHI TIẾT</button>
                                        <button className="btn-assign">
                                            <Users style={{ width: '16px', height: '16px' }} /> PHÂN CÔNG
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COL: NHÂN SỰ & PHỤ TÙNG */}
                        <div className="right-sidebar">

                            {/* Nhân sự trực ca */}
                            <div className="sidebar-block">
                                <h3 className="sidebar-block-title">Nhân sự trực ca</h3>
                                <div className="staff-card">
                                    <div className="staff-row">
                                        <div className="staff-name-container">
                                            <span className="status-dot-green"></span>
                                            <span className="staff-name">Minh <span className="staff-role">(Trưởng nhóm)</span></span>
                                        </div>
                                        <span className="staff-count">3 việc</span>
                                    </div>
                                    <div className="staff-row">
                                        <div className="staff-name-container">
                                            <span className="status-dot-green"></span>
                                            <span className="staff-name">Thắng <span className="staff-role">(Kỹ thuật)</span></span>
                                        </div>
                                        <span className="staff-count">2 việc</span>
                                    </div>
                                    <div className="staff-row">
                                        <div className="staff-name-container">
                                            <span className="status-dot-yellow"></span>
                                            <span className="staff-name">Quốc <span className="staff-role">(Học việc)</span></span>
                                        </div>
                                        <span className="staff-count">Đang hỗ trợ</span>
                                    </div>
                                </div>
                            </div>

                            {/* Phụ tùng sắp hết */}
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
                                    <button className="btn-outline">
                                        Nhập thêm hàng
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* FOOTER */}
                    <footer className="footer">
                        <h4>MOTOCORE INDUSTRIAL GARAGE</h4>
                        <div className="footer-links">
                            <a href="#">Chính sách bảo mật</a>
                            <a href="#">Điều khoản dịch vụ</a>
                            <a href="#">Liên hệ</a>
                        </div>
                        <p className="footer-copyright">© 2024 MOTOCORE INDUSTRIAL GARAGE. All rights reserved.</p>
                    </footer>

                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;