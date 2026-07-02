import React, { useMemo } from "react";
import "../../styles/manager/ManagerRevenue.css";

const ManagerRevenue = ({ appointments = [] }) => {
  // Compute dynamic weekly revenue data (Daily stats for 7 days in Millions VND)
  const weeklyRevenueData = useMemo(() => {
    const weekdays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];
    const revenueMap = {
      "Thứ 2": 0,
      "Thứ 3": 0,
      "Thứ 4": 0,
      "Thứ 5": 0,
      "Thứ 6": 0,
      "Thứ 7": 0,
      "Chủ Nhật": 0
    };
    
    const completedApps = appointments.filter(app => app.status === "COMPLETED");
    
    // Fallback if no database data
    if (completedApps.length === 0) {
      return [
        { day: "Thứ 2", revenue: 8.5, active: false },
        { day: "Thứ 3", revenue: 10.2, active: false },
        { day: "Thứ 4", revenue: 12.4, active: true },
        { day: "Thứ 5", revenue: 9.8, active: false },
        { day: "Thứ 6", revenue: 14.5, active: false },
        { day: "Thứ 7", revenue: 18.2, active: false },
        { day: "Chủ Nhật", revenue: 16.0, active: false }
      ];
    }

    const weekdayMap = {
      0: "Chủ Nhật",
      1: "Thứ 2",
      2: "Thứ 3",
      3: "Thứ 4",
      4: "Thứ 5",
      5: "Thứ 6",
      6: "Thứ 7"
    };

    completedApps.forEach(app => {
      const date = new Date(app.raw?.completed_at || app.apiDate);
      const dayName = weekdayMap[date.getDay()];
      if (revenueMap[dayName] !== undefined) {
        revenueMap[dayName] += Number(app.raw?.final_cost || 0);
      }
    });

    const todayDayName = weekdayMap[new Date().getDay()];

    return weekdays.map(day => ({
      day,
      revenue: Number((revenueMap[day] / 1000000).toFixed(1)), // in Millions
      active: day === todayDayName
    }));
  }, [appointments]);

  const totalWeeklyRevenue = useMemo(() => {
    return weeklyRevenueData.reduce((sum, item) => sum + item.revenue, 0).toFixed(1);
  }, [weeklyRevenueData]);

  // Compute service category splits dynamically
  const serviceSplits = useMemo(() => {
    const completed = appointments.filter(app => app.status === "COMPLETED");
    if (completed.length === 0) {
      return [
        { name: "Sửa chữa động cơ", percent: 45, color: "#3b82f6" },
        { name: "Bảo dưỡng định kỳ", percent: 35, color: "#ff6b00" },
        { name: "Chăm sóc & Rửa xe", percent: 20, color: "#10b981" }
      ];
    }
    
    let motorCount = 0;
    let maintenanceCount = 0;
    let careCount = 0;
    
    completed.forEach(app => {
      const serviceType = String(app.raw?.service?.type || "").toUpperCase();
      const serviceName = String(app.service || "").toLowerCase();
      
      if (serviceType === "REPAIR" || serviceName.includes("sửa") || serviceName.includes("động cơ") || serviceName.includes("côn")) {
        motorCount++;
      } else if (serviceType === "MAINTENANCE" || serviceName.includes("bảo dưỡng") || serviceName.includes("định kỳ")) {
        maintenanceCount++;
      } else {
        careCount++;
      }
    });

    const total = motorCount + maintenanceCount + careCount;
    if (total === 0) {
      return [
        { name: "Sửa chữa động cơ", percent: 0, color: "#3b82f6" },
        { name: "Bảo dưỡng định kỳ", percent: 0, color: "#ff6b00" },
        { name: "Chăm sóc & Rửa xe", percent: 0, color: "#10b981" }
      ];
    }
    
    return [
      { name: "Sửa chữa động cơ", percent: Math.round((motorCount / total) * 100), color: "#3b82f6" },
      { name: "Bảo dưỡng định kỳ", percent: Math.round((maintenanceCount / total) * 100), color: "#ff6b00" },
      { name: "Chăm sóc & Rửa xe", percent: Math.round((careCount / total) * 100), color: "#10b981" }
    ];
  }, [appointments]);

  return (
    <>
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Báo cáo Doanh thu</h2>
          <p className="page-subtitle">Biểu đồ thống kê kết quả doanh thu dịch vụ tuần này.</p>
        </div>
        <div style={{ padding: "8px 16px", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "700", color: "#334155" }}>
          Tuần hiện tại
        </div>
      </div>

      <div className="dashboard-grid-bottom">
        
        {/* Visual Chart Panel */}
        <div className="revenue-section">
          <div className="section-title-wrapper">
            <span className="section-title">Thống kê doanh thu tuần này</span>
            <span style={{ fontSize: "0.85rem", fontWeight: "800", color: "#10b981" }}>Tổng: {totalWeeklyRevenue}M VNĐ</span>
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
                {weeklyRevenueData.map((node, i) => {
                  const maxRevenue = Math.max(...weeklyRevenueData.map(w => w.revenue));
                  const heightPercent = maxRevenue > 0 ? (node.revenue / maxRevenue) * 90 : 20;
                  return (
                    <div
                      key={i}
                      className={`chart-bar-node ${node.active ? "active" : ""}`}
                      style={{ height: `${heightPercent}%` }}
                    >
                      <div className="chart-tooltip">
                        {node.revenue}M VNĐ
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Beneath Labels row */}
            <div className="chart-labels-row">
              {weeklyRevenueData.map((node, i) => (
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
            {serviceSplits.map((split, i) => (
              <div className="split-item" key={i}>
                <div className="split-header">
                  <span className="split-title">
                    <span className="split-color-dot" style={{ backgroundColor: split.color }} />
                    {split.name}
                  </span>
                  <span className="split-percentage">{split.percent}%</span>
                </div>
                <div className="split-track">
                  <div className="split-fill" style={{ width: `${split.percent}%`, backgroundColor: split.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
};

export default ManagerRevenue;
