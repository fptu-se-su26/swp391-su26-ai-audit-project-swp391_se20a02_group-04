import React from "react";
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

const ManagerRevenue = () => {
  return (
    <>
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Báo cáo Doanh thu</h2>
          <p className="page-subtitle">Biểu đồ thống kê kết quả doanh thu dịch vụ tuần này.</p>
        </div>
        <div style={{ padding: "8px 16px", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "700", color: "#334155" }}>
          Tuần hiện tại (25/05 - 31/05)
        </div>
      </div>

      <div className="dashboard-grid-bottom">
        
        {/* Visual Chart Panel */}
        <div className="revenue-section">
          <div className="section-title-wrapper">
            <span className="section-title">Thống kê doanh thu tuần này</span>
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
          <h3 className="section-title" style={{ marginBottom: "12px" }}>Tỉ lệ dịch vụ</h3>
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
    </>
  );
};

export default ManagerRevenue;
