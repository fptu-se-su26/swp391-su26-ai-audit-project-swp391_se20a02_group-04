import React, { useEffect, useState, useMemo } from "react";
import {
  Calendar,
  Wrench,
  Users,
  BarChart2,
  Plus,
  ClipboardList,
  Banknote,
  Package,
  Activity,
  AlertTriangle,
  Layers,
  Award,
  TrendingUp,
} from "lucide-react";
import "../../styles/admin/AdminDashboard.css"; // Reuse Admin dashboard layout and elements
import { getLowStockItems } from "../../services/inventoryApi";
import { managerStaffApi } from "../../services/managerStaffApi";

// CountUp Animation Component matching Admin
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

export default function ManagerDashboard({ bays = [], technicians = [], appointments = [], refreshData }) {
  const [lowStock, setLowStock] = useState([
    { name: "Nhớt Motul 300V 10W40", amount: "Còn 5L", percent: 20, tone: "danger" },
    { name: "Má phanh Brembo Carbon", amount: "Còn 2 bộ", percent: 14, tone: "danger" },
    { name: "Lọc gió K&N CB650R", amount: "Còn 3 cái", percent: 28, tone: "warning" },
  ]);
  const [staffPerformance, setStaffPerformance] = useState([]);
  const [timeFilter, setTimeFilter] = useState("1 tuần");

  // Load backend statistics
  useEffect(() => {
    async function loadStats() {
      try {
        const [stockRes, staffRes] = await Promise.all([
          getLowStockItems({ limit: 5 }).catch(() => null),
          managerStaffApi.getStaffPerformance().catch(() => [])
        ]);

        if (stockRes && Array.isArray(stockRes.data)) {
          const mappedStock = stockRes.data.map(item => {
            const pct = Math.round((item.quantity / (item.min_quantity || 10)) * 100);
            return {
              name: item.name,
              amount: `Còn ${item.quantity} ${item.unit || "cái"}`,
              percent: Math.min(100, pct),
              tone: pct < 15 ? "danger" : "warning"
            };
          });
          if (mappedStock.length > 0) setLowStock(mappedStock);
        }

        if (Array.isArray(staffRes)) {
          setStaffPerformance(staffRes);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      }
    }
    loadStats();
  }, []);

  // Today Date details
  const todayStr = useMemo(() => new Date().toLocaleDateString("sv-SE"), []); // YYYY-MM-DD
  const todayAppointments = useMemo(() => {
    return appointments.filter(app => app.apiDate === todayStr);
  }, [appointments, todayStr]);

  const todayCount = todayAppointments.length;

  const pendingCount = useMemo(() => {
    return appointments.filter(app => app.status === "PENDING").length;
  }, [appointments]);

  // Today's occupancy details
  const totalBays = bays.length || 10;
  const occupiedBays = bays.filter(b => b.occupied).length;
  const occupancyRate = totalBays > 0 ? Math.round((occupiedBays / totalBays) * 100) : 0;

  // Monthly Revenue Sum
  const monthlyRevenueVal = useMemo(() => {
    const completedApps = appointments.filter(app => app.status === "COMPLETED");
    if (completedApps.length === 0) return 186.5; // Premium mockup total in millions

    const total = completedApps.reduce((sum, app) => sum + (app.raw?.final_cost || 0), 0);
    return Number((total / 1000000).toFixed(1));
  }, [appointments]);

  // Revenue chart items based on selected period
  const chartBars = useMemo(() => {
    if (timeFilter === "1 tuần") {
      const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
      const revenueMap = { "T2": 0, "T3": 0, "T4": 0, "T5": 0, "T6": 0, "T7": 0, "CN": 0 };
      const weekdayMap = { 0: "CN", 1: "T2", 2: "T3", 3: "T4", 4: "T5", 5: "T6", 6: "T7" };

      const completed = appointments.filter(app => app.status === "COMPLETED");
      
      if (completed.length === 0) {
        // Fallback mockup bar heights
        return [
          ["T2", 46],
          ["T3", 58],
          ["T4", 52],
          ["T5", 74],
          ["T6", 88],
          ["T7", 65],
          ["CN", 72],
        ];
      }

      completed.forEach(app => {
        const date = new Date(app.raw?.completed_at || app.apiDate);
        const dayName = weekdayMap[date.getDay()];
        if (revenueMap[dayName] !== undefined) {
          revenueMap[dayName] += Number(app.raw?.final_cost || 0);
        }
      });

      const maxVal = Math.max(...Object.values(revenueMap));
      return weekdays.map(day => {
        const height = maxVal > 0 ? (revenueMap[day] / maxVal) * 80 + 10 : 25;
        return [day, Math.round(height)];
      });
    }

    if (timeFilter === "1 tháng") {
      return [
        ["Tuần 1", 35],
        ["Tuần 2", 55],
        ["Tuần 3", 75],
        ["Tuần 4", 90]
      ];
    }

    if (timeFilter === "1 quý") {
      return [
        ["Tháng 1", 60],
        ["Tháng 2", 75],
        ["Tháng 3", 90]
      ];
    }

    // 1 năm
    return [
      ["Q1", 50],
      ["Q2", 65],
      ["Q3", 80],
      ["Q4", 95]
    ];
  }, [appointments, timeFilter]);

  // Report statistics summary table
  const reportsSummary = useMemo(() => {
    const totalVND = monthlyRevenueVal * 1000000;
    const completedCount = appointments.filter(a => a.status === "COMPLETED").length || 32;
    const avgInvoice = completedCount > 0 ? Math.round(totalVND / completedCount) : 0;
    const avgInvoiceStr = avgInvoice >= 1000000 ? `${(avgInvoice / 1000000).toFixed(1)}M` : avgInvoice >= 1000 ? `${Math.round(avgInvoice / 1000)}K` : `${avgInvoice}`;

    return [
      ["Tổng doanh thu", `${monthlyRevenueVal}M VNĐ`],
      ["Đơn hoàn thành", `${completedCount} đơn`],
      ["Hóa đơn trung bình", `${avgInvoiceStr} VNĐ`],
      ["Tỷ lệ hoàn thành", "96.2%"],
    ];
  }, [appointments, monthlyRevenueVal]);

  // Leaderboard of Technicians
  const techniciansLeaderboard = useMemo(() => {
    if (staffPerformance.length > 0) {
      return staffPerformance.map(tp => ({
        name: tp.full_name,
        specialty: tp.specialization || "KTV",
        efficiency: tp.completion_rate || 95,
        completed: tp.completed_appointments || 10
      })).slice(0, 4);
    }

    return [
      { name: "Nguyễn Minh Thắng", specialty: "Hệ thống điện & Fi", efficiency: 98, completed: 18 },
      { name: "Lê Văn Minh", specialty: "Động cơ & Bình xăng con", efficiency: 95, completed: 15 },
      { name: "Hoàng Kim Sơn", specialty: "Phuộc nhún & Phanh đĩa", efficiency: 92, completed: 12 },
      { name: "Trần Quốc Huy", specialty: "Bảo dưỡng tổng quát", efficiency: 88, completed: 8 }
    ];
  }, [staffPerformance]);

  // Top revenue services
  const topServices = [
    { name: "Bảo dưỡng định kỳ Honda SH", count: 48, revenue: 14400000 },
    { name: "Đại tu động cơ & côn Ducati", count: 12, revenue: 42000000 },
    { name: "Vệ sinh nồi & thay bi nồi Yamaha NVX", count: 32, revenue: 9600000 },
    { name: "Phủ Ceramic bảo vệ sơn xe cao cấp", count: 16, revenue: 16000000 }
  ];

  // Recent activity log formatted for Admin styles
  const recentActivities = useMemo(() => {
    const sorted = [...appointments].sort((a, b) => {
      const aDate = new Date(a.raw?.updated_at || a.raw?.created_at || 0);
      const bDate = new Date(b.raw?.updated_at || b.raw?.created_at || 0);
      return bDate - aDate;
    }).slice(0, 4);

    if (sorted.length === 0) {
      return [
        { time: "09:42", text: "KTV Nguyễn Minh Thắng được phân công sửa xe BMW R1250GS", type: "confirm" },
        { time: "09:18", text: "Khách hàng Trần Thị Hồng đặt lịch hẹn thành công lúc 16:00", type: "booking" },
        { time: "08:55", text: "Đã hoàn thành sửa chữa cho xe Yamaha R1M của khách Phạm Quốc Hùng", type: "assign" },
        { time: "08:20", text: "Lịch hẹn xe Vespa Sprint của khách Đỗ Kim Oanh bị hủy", type: "stock" }
      ];
    }

    return sorted.map(app => {
      const date = new Date(app.raw?.updated_at || app.raw?.created_at || new Date());
      const hour = String(date.getHours()).padStart(2, "0");
      const min = String(date.getMinutes()).padStart(2, "0");
      const timeStr = `${hour}:${min}`;

      let text = "";
      const bikeName = app.vehicleType || "Xe máy";
      let type = "booking";

      if (app.status === "PENDING") {
        text = `Khách hàng ${app.customer} đặt lịch hẹn dịch vụ ${app.service}`;
        type = "booking";
      } else if (app.status === "CONFIRMED") {
        text = `Lịch hẹn xe ${bikeName} của ${app.customer} đã được xác nhận`;
        if (app.techAssigned && app.techAssigned !== "Chưa phân công") {
          text += `, phân công cho KTV ${app.techAssigned}`;
        }
        type = "confirm";
      } else if (app.status === "IN_PROGRESS") {
        text = `KTV ${app.techAssigned} đang sửa chữa xe ${bikeName}`;
        type = "assign";
      } else if (app.status === "COMPLETED") {
        text = `Hoàn thành xe ${bikeName} cho khách ${app.customer}. Chi phí: ${new Intl.NumberFormat("vi-VN").format(app.raw?.final_cost || 0)}đ`;
        type = "stock";
      } else {
        text = `Lịch hẹn xe ${bikeName} của ${app.customer} đã bị hủy`;
        type = "stock";
      }

      return { time: timeStr, text, type };
    });
  }, [appointments]);

  // Format currency
  const formatVND = (value) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" })
      .format(value)
      .replace("₫", "đ");
  };

  return (
    <div className="content-body dashboard-overview fade-section">
      {/* Title */}
      <div className="page-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <h2 className="page-title" style={{ fontSize: "24px", fontWeight: "900", color: "var(--manager-ink)", margin: 0 }}>Tổng quan Garage</h2>
          <p className="page-subtitle" style={{ fontSize: "13px", fontWeight: "700", color: "var(--manager-muted)", margin: "4px 0 0 0" }}>
            Thống kê hoạt động, doanh thu và hiệu suất của garage MotoCare hôm nay.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <section className="overview-kpi-grid">
        <article className="overview-card neutral">
          <div className="overview-card-top">
            <span>Lịch hẹn hôm nay</span>
            <ClipboardList />
          </div>
          <strong>
            <CountUp value={todayCount} />
          </strong>
          <p>Yêu cầu dịch vụ trong ngày</p>
        </article>

        <article className="overview-card primary">
          <div className="overview-card-top">
            <span>Công suất kệ</span>
            <Layers />
          </div>
          <strong>
            <CountUp value={occupancyRate} suffix="%" />
          </strong>
          <p>{occupiedBays} / {totalBays} kệ đang hoạt động</p>
        </article>

        <article className="overview-card success">
          <div className="overview-card-top">
            <span>Doanh thu tháng này</span>
            <Banknote />
          </div>
          <strong>
            <CountUp value={monthlyRevenueVal} suffix="M" decimals={1} />
          </strong>
          <p>VND · tăng 14% so với tháng trước</p>
        </article>

        <article className="overview-card warning">
          <div className="overview-card-top">
            <span>Lịch hẹn chờ xử lý</span>
            <AlertTriangle />
          </div>
          <strong>
            <CountUp value={pendingCount} />
          </strong>
          <p>Cần xác nhận hoặc phân công thợ</p>
        </article>
      </section>

      {/* Revenue Section */}
      <section className="overview-grid section-delay-1">
        <article className="manager-panel revenue-panel">
          <div className="panel-heading">
            <div>
              <span>Báo cáo doanh số</span>
              <h3>Biểu đồ doanh thu</h3>
            </div>
            <div className="revenue-filters">
              {["1 tuần", "1 tháng", "1 quý", "1 năm"].map((p) => (
                <button
                  key={p}
                  className={timeFilter === p ? "active" : ""}
                  onClick={() => setTimeFilter(p)}
                  type="button"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          
          <div className="revenue-content">
            <div className="revenue-chart">
              {chartBars.map(([label, value], index) => (
                <div className="revenue-bar" key={label}>
                  <div style={{ "--bar-height": `${value}%`, "--bar-delay": `${index * 80}ms` }} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
            
            <div className="revenue-table">
              <div className="revenue-table-head">
                <span>Chỉ số báo cáo</span>
                <span>Giá trị</span>
              </div>
              {reportsSummary.map(([label, value]) => (
                <div className="revenue-table-row" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      {/* Low Stock & Staff Performance Leaderboard Row */}
      <section className="overview-grid section-delay-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px" }}>
        {/* Low Stock Items Panel */}
        <article className="manager-panel low-stock-panel">
          <div className="panel-heading" style={{ marginBottom: "14px" }}>
            <div>
              <span>Kho vật tư</span>
              <h3>Vật tư sắp hết</h3>
            </div>
            <Package />
          </div>
          <div className="compact-list">
            {lowStock.map((item) => (
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

        {/* Technicians Performance Leaderboard */}
        <article className="manager-panel low-stock-panel">
          <div className="panel-heading" style={{ marginBottom: "14px" }}>
            <div>
              <span>Đội ngũ thợ</span>
              <h3>Hiệu suất Kỹ thuật viên</h3>
            </div>
            <Award />
          </div>
          <div className="compact-list">
            {techniciansLeaderboard.map((tech, index) => (
              <div className="stock-row" key={tech.name} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center" }}>
                <div className="stock-row-main">
                  <Award style={{ color: index === 0 ? "#eab308" : index === 1 ? "#94a3b8" : "#94a3b8" }} />
                  <div>
                    <span style={{ fontSize: "14px", fontWeight: "850" }}>#{index + 1} {tech.name}</span>
                    <small>{tech.specialty}</small>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <strong style={{
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: "28px",
                    padding: "0 10px",
                    borderRadius: "999px",
                    background: "#e8f8ee",
                    color: "#116b33",
                    fontSize: "12px",
                    fontWeight: "900",
                    border: "1px solid #bbf7d0"
                  }}>
                    {tech.completed} đơn
                  </strong>
                  <small style={{ display: "block", color: "#16a34a", fontWeight: "800", fontSize: "12px", marginTop: "4px" }}>
                    Hiệu suất {tech.efficiency}%
                  </small>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* Top Services & Activities Log Row */}
      <section className="overview-grid section-delay-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px" }}>
        {/* Top Services Table */}
        <article className="manager-panel latest-appointments-panel">
          <div className="panel-heading" style={{ marginBottom: "14px" }}>
            <div>
              <span>Thống kê dịch vụ</span>
              <h3>Top dịch vụ doanh thu</h3>
            </div>
            <TrendingUp />
          </div>
          <div className="latest-table">
            <div className="latest-table-head" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.2fr", padding: "12px 16px" }}>
              <span>Dịch vụ</span>
              <span>Số đơn</span>
              <span style={{ textAlign: "right" }}>Tổng doanh thu</span>
            </div>
            {topServices.map((svc) => (
              <div className="latest-table-row" key={svc.name} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.2fr", padding: "12px 16px" }}>
                <strong>{svc.name}</strong>
                <span>{svc.count} đơn</span>
                <span style={{ textAlign: "right", color: "var(--manager-primary-bright)", fontWeight: "800" }}>
                  {formatVND(svc.revenue)}
                </span>
              </div>
            ))}
          </div>
        </article>

        {/* Recent Activities Timeline */}
        <article className="manager-panel activity-panel">
          <div className="panel-heading" style={{ marginBottom: "14px" }}>
            <div>
              <span>Nhật ký</span>
              <h3>Hoạt động gần đây</h3>
            </div>
            <Activity />
          </div>
          <div className="activity-timeline">
            {recentActivities.map((item, idx) => (
              <div className={`activity-row ${item.type}`} key={idx}>
                <time>{item.time}</time>
                <span className="activity-dot" />
                <p dangerouslySetInnerHTML={{ __html: item.text }} />
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
