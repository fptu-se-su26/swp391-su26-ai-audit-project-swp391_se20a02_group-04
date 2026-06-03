import React from "react";
import {
  Calendar,
  TrendingUp,
  Users,
  Layers
} from "lucide-react";
import "../../styles/manager/ManagerDashboard.css";
import "../../styles/manager/ManagerRevenue.css";

// Revenue charts data (Daily stats for 7 days)
const dailyRevenueData = [
  { day: "Thứ 2", revenue: 8.5, active: false },
  { day: "Thứ 3", revenue: 10.2, active: false },
  { day: "Thứ 4", revenue: 12.4, active: true }, // Today
  { day: "Thứ 5", revenue: 9.8, active: false },
  { day: "Thứ 6", revenue: 14.5, active: false },
  { day: "Thứ 7", revenue: 18.2, active: false },
  { day: "Chủ Nhật", revenue: 16.0, active: false }
];

const ManagerDashboard = ({ bays, technicians }) => {
  return (
    <>
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Tổng quan Garage</h2>
          <p className="page-subtitle">Thống kê vận hành thực tế hôm nay tại garage MotoCore.</p>
        </div>
      </div>

      {/* KPI metrics row */}
      <div className="kpis-grid">
        <div className="kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Lịch hẹn hôm nay</span>
            <span className="kpi-value">18</span>
            <span className="kpi-meta">+12% so với hôm qua</span>
          </div>
          <div className="kpi-icon-wrapper">
            <Calendar size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Doanh thu ngày</span>
            <span className="kpi-value">12.4M</span>
            <span className="kpi-meta orange">VNĐ • Tăng trưởng ổn định</span>
          </div>
          <div className="kpi-icon-wrapper">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Kỹ thuật ca trực</span>
            <span className="kpi-value">4</span>
            <span className="kpi-meta blue">3 Đang bận • 1 Sẵn sàng</span>
          </div>
          <div className="kpi-icon-wrapper">
            <Users size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Công suất kệ</span>
            <span className="kpi-value">60%</span>
            <span className="kpi-meta">6 / 10 kệ đang có xe sửa</span>
          </div>
          <div className="kpi-icon-wrapper">
            <Layers size={22} />
          </div>
        </div>
      </div>

      {/* Merged Weekly Revenue Section */}
      <div className="dashboard-grid-bottom">
        {/* Visual Chart Panel */}
        <div className="revenue-section">
          <div className="section-title-wrapper">
            <span className="section-title" style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "800", fontSize: "1.1rem" }}>
              <TrendingUp size={18} style={{ color: "#10b981" }} /> Thống kê doanh thu tuần này
            </span>
            <span style={{ fontSize: "0.85rem", fontWeight: "800", color: "#10b981" }}>Tổng: 89.6M VNĐ</span>
          </div>

          {/* Aesthetic column chart */}
          <div className="revenue-chart-outer">
            <div className="chart-container-inner">
              
              {/* Grid background lines */}
              <div className="chart-grid-lines">
                <div className="grid-line" />
                <div className="grid-line" />
                <div className="grid-line" />
                <div className="grid-line" />
                <div className="grid-line" />
              </div>

              {/* Dynamic columns flex wrapper */}
              <div className="chart-bars-flex">
                {dailyRevenueData.map((node, i) => (
                  <div
                    key={i}
                    className={`chart-bar-node ${node.active ? "active" : ""}`}
                    style={{ height: `${(node.revenue / 20) * 100}%` }}
                  >
                    <div className="chart-tooltip">
                      {node.revenue}M VNĐ
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* Beneath Labels row */}
            <div className="chart-labels-row">
              {dailyRevenueData.map((node, i) => (
                <div key={i} className="chart-label-node">
                  {node.day}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Service Splits Percentage Card */}
        <div className="revenue-splits-card">
          <h3 className="section-title" style={{ marginBottom: "16px", fontWeight: "800", fontSize: "1.1rem" }}>
            Tỉ lệ doanh thu dịch vụ
          </h3>
          <div className="splits-list">
            
            <div className="split-item">
              <div className="split-header">
                <span className="split-title">
                  <span className="split-color-dot" style={{ backgroundColor: "#3b82f6" }} />
                  Sửa chữa động cơ
                </span>
                <span className="split-percentage">45%</span>
              </div>
              <div className="split-track">
                <div className="split-fill" style={{ width: "45%", backgroundColor: "#3b82f6" }} />
              </div>
            </div>

            <div className="split-item">
              <div className="split-header">
                <span className="split-title">
                  <span className="split-color-dot" style={{ backgroundColor: "#ff6b00" }} />
                  Bảo dưỡng định kỳ
                </span>
                <span className="split-percentage">35%</span>
              </div>
              <div className="split-track">
                <div className="split-fill" style={{ width: "35%", backgroundColor: "#ff6b00" }} />
              </div>
            </div>

            <div className="split-item">
              <div className="split-header">
                <span className="split-title">
                  <span className="split-color-dot" style={{ backgroundColor: "#10b981" }} />
                  Chăm sóc & Rửa xe
                </span>
                <span className="split-percentage">20%</span>
              </div>
              <div className="split-track">
                <div className="split-fill" style={{ width: "20%", backgroundColor: "#10b981" }} />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Roster & Feed elements */}
      <div className="dashboard-grid-bottom">
        <div className="recent-activity-card">
          <h3 className="section-title" style={{ marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
            Nhật ký vận hành gần đây
          </h3>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-avatar" />
              <div className="activity-desc-wrapper">
                <span className="activity-text">
                  KTV <strong>Nguyễn Minh Thắng</strong> được phân công sửa xe <strong>BMW R1250GS</strong>
                </span>
                <span className="activity-time">5 phút trước</span>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-avatar" />
              <div className="activity-desc-wrapper">
                <span className="activity-text">
                  Khách hàng <strong>Trần Thị Hồng</strong> đặt lịch hẹn thành công lúc 16:00
                </span>
                <span className="activity-time">15 phút trước</span>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-avatar" />
              <div className="activity-desc-wrapper">
                <span className="activity-text">
                  Đã hoàn thành sửa chữa cho xe <strong>Yamaha R1M</strong> của khách Phạm Quốc Hùng
                </span>
                <span className="activity-time">45 phút trước</span>
              </div>
            </div>
          </div>
        </div>

        <div className="roster-mini-card">
          <h3 className="section-title" style={{ marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
            Ca trực Kỹ thuật viên
          </h3>
          {technicians.map((tech) => (
            <div className="tech-mini-row" key={tech.id}>
              <div className="tech-mini-info">
                <div className="tech-mini-avatar">
                  <img src={tech.avatar} alt={tech.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div>
                  <p className="tech-mini-name">{tech.name}</p>
                  <p className="tech-mini-role">{tech.specialty}</p>
                </div>
              </div>
              <span className={`status-badge ${tech.workload === 0 ? "active" : "locked"}`} style={{ fontSize: "0.7rem", padding: "4px 8px" }}>
                {tech.workload === 0 ? "Nhàn rỗi" : "Đang bận"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default ManagerDashboard;
