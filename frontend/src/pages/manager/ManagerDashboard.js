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
  const [lowStock, setLowStock] = useState([]);
  const [staffPerformance, setStaffPerformance] = useState([]);
  const [timeFilter, setTimeFilter] = useState("1 tuần");

  const getAppRevenue = (app) =>
    Number(app.raw?.final_cost || app.raw?.payment_info?.amount || 0);

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
              name: item.name || item.item_name,
              amount: `Còn ${item.quantity} ${item.unit || "cái"}`,
              percent: Math.min(100, pct),
              tone: pct < 15 ? "danger" : "warning"
            };
          });
          setLowStock(mappedStock);
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
  const todayStr = useMemo(() => {
    const local = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }, []);
  const todayAppointments = useMemo(() => {
    return appointments.filter(app => app.apiDate === todayStr);
  }, [appointments, todayStr]);

  const todayCount = todayAppointments.length;

  const pendingCount = useMemo(() => {
    return appointments.filter(app => app.status === "PENDING").length;
  }, [appointments]);

  // Today's occupancy details
  const totalBays = bays.length || 0;
  const occupiedBays = bays.filter(b => b.occupied).length;
  const occupancyRate = totalBays > 0 ? Math.round((occupiedBays / totalBays) * 100) : 0;

  const completedAppointments = useMemo(
    () => appointments.filter((app) => app.status === "COMPLETED"),
    [appointments]
  );

  // Monthly Revenue Sum (real data only)
  const monthlyRevenueVal = useMemo(() => {
    const monthPrefix = todayStr.slice(0, 7);
    const monthCompleted = completedAppointments.filter((app) => {
      const dateKey = String(app.raw?.completed_at || app.apiDate || "").slice(0, 7);
      return dateKey === monthPrefix;
    });
    const total = monthCompleted.reduce((sum, app) => sum + getAppRevenue(app), 0);
    return Number((total / 1000000).toFixed(1));
  }, [completedAppointments, todayStr]);

  // Revenue chart items based on selected period
  const chartBars = useMemo(() => {
    const toHeight = (values) => {
      const maxVal = Math.max(0, ...values.map((row) => row[1]));
      return values.map(([label, amount]) => {
        const height = maxVal > 0 ? (amount / maxVal) * 80 + 10 : 8;
        return [label, Math.round(height)];
      });
    };

    if (timeFilter === "1 tuần") {
      const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
      const revenueMap = { T2: 0, T3: 0, T4: 0, T5: 0, T6: 0, T7: 0, CN: 0 };
      const weekdayMap = { 0: "CN", 1: "T2", 2: "T3", 3: "T4", 4: "T5", 5: "T6", 6: "T7" };

      completedAppointments.forEach((app) => {
        const date = new Date(app.raw?.completed_at || app.apiDate);
        if (Number.isNaN(date.getTime())) return;
        const dayName = weekdayMap[date.getDay()];
        if (revenueMap[dayName] !== undefined) {
          revenueMap[dayName] += getAppRevenue(app);
        }
      });

      return toHeight(weekdays.map((day) => [day, revenueMap[day]]));
    }

    if (timeFilter === "1 tháng") {
      const buckets = [
        ["Tuần 1", 0],
        ["Tuần 2", 0],
        ["Tuần 3", 0],
        ["Tuần 4", 0],
      ];
      completedAppointments.forEach((app) => {
        const date = new Date(app.raw?.completed_at || app.apiDate);
        if (Number.isNaN(date.getTime())) return;
        if (date.getMonth() !== new Date().getMonth() || date.getFullYear() !== new Date().getFullYear()) return;
        const weekIndex = Math.min(3, Math.floor((date.getDate() - 1) / 7));
        buckets[weekIndex][1] += getAppRevenue(app);
      });
      return toHeight(buckets);
    }

    if (timeFilter === "1 quý") {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const buckets = [
        [`Tháng ${quarter * 3 + 1}`, 0],
        [`Tháng ${quarter * 3 + 2}`, 0],
        [`Tháng ${quarter * 3 + 3}`, 0],
      ];
      completedAppointments.forEach((app) => {
        const date = new Date(app.raw?.completed_at || app.apiDate);
        if (Number.isNaN(date.getTime()) || date.getFullYear() !== now.getFullYear()) return;
        const appQuarter = Math.floor(date.getMonth() / 3);
        if (appQuarter !== quarter) return;
        const index = date.getMonth() % 3;
        buckets[index][1] += getAppRevenue(app);
      });
      return toHeight(buckets);
    }

    const yearBuckets = [
      ["Q1", 0],
      ["Q2", 0],
      ["Q3", 0],
      ["Q4", 0],
    ];
    completedAppointments.forEach((app) => {
      const date = new Date(app.raw?.completed_at || app.apiDate);
      if (Number.isNaN(date.getTime()) || date.getFullYear() !== new Date().getFullYear()) return;
      yearBuckets[Math.floor(date.getMonth() / 3)][1] += getAppRevenue(app);
    });
    return toHeight(yearBuckets);
  }, [completedAppointments, timeFilter]);

  // Report statistics summary table
  const reportsSummary = useMemo(() => {
    const monthCompleted = completedAppointments.filter((app) => {
      const dateKey = String(app.raw?.completed_at || app.apiDate || "").slice(0, 7);
      return dateKey === todayStr.slice(0, 7);
    });
    const monthCount = monthCompleted.length;
    const totalVND = monthCompleted.reduce((sum, app) => sum + getAppRevenue(app), 0);
    const avgInvoice = monthCount > 0 ? Math.round(totalVND / monthCount) : 0;
    const avgInvoiceStr =
      avgInvoice >= 1000000
        ? `${(avgInvoice / 1000000).toFixed(1)}M`
        : avgInvoice >= 1000
          ? `${Math.round(avgInvoice / 1000)}K`
          : `${avgInvoice}`;
    const completionRate =
      appointments.length > 0
        ? Math.round((completedAppointments.length / appointments.length) * 1000) / 10
        : 0;

    return [
      ["Tổng doanh thu tháng", `${monthlyRevenueVal}M VNĐ`],
      ["Đơn hoàn thành tháng", `${monthCount} đơn`],
      ["Hóa đơn trung bình", `${avgInvoiceStr} VNĐ`],
      ["Tỷ lệ hoàn thành", `${completionRate}%`],
    ];
  }, [appointments, completedAppointments, monthlyRevenueVal, todayStr]);

  // Leaderboard of Technicians
  const techniciansLeaderboard = useMemo(() => {
    if (staffPerformance.length > 0) {
      return staffPerformance
        .map((tp) => ({
          name: tp.full_name,
          specialty: tp.specialization || "KTV",
          efficiency: tp.completion_rate || 0,
          completed: tp.completed_appointments || 0,
        }))
        .sort((a, b) => b.completed - a.completed)
        .slice(0, 4);
    }
    return [];
  }, [staffPerformance]);

  // Top revenue services from real completed appointments
  const topServices = useMemo(() => {
    const map = new Map();
    completedAppointments.forEach((app) => {
      const name =
        app.service ||
        app.raw?.service?.name ||
        app.raw?.service_id?.service_name ||
        "Dịch vụ khác";
      const current = map.get(name) || { name, count: 0, revenue: 0 };
      current.count += 1;
      current.revenue += getAppRevenue(app);
      map.set(name, current);
    });
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 4);
  }, [completedAppointments]);

  // Recent activity log
  const recentActivities = useMemo(() => {
    const sorted = [...appointments]
      .sort((a, b) => {
        const aDate = new Date(a.raw?.updated_at || a.raw?.created_at || 0);
        const bDate = new Date(b.raw?.updated_at || b.raw?.created_at || 0);
        return bDate - aDate;
      })
      .slice(0, 4);

    return sorted.map((app) => {
      const date = new Date(app.raw?.updated_at || app.raw?.created_at || new Date());
      const hour = String(date.getHours()).padStart(2, "0");
      const min = String(date.getMinutes()).padStart(2, "0");
      const timeStr = `${hour}:${min}`;
      const bikeName = app.vehicleType || "Xe máy";
      let type = "booking";
      let text = "";

      if (app.status === "COMPLETED") {
        type = "assign";
        text = `Hoàn thành dịch vụ cho ${bikeName}`;
      } else if (app.status === "CANCELLED") {
        type = "stock";
        text = `Lịch hẹn ${bikeName} bị hủy`;
      } else if (app.status === "CONFIRMED" || app.status === "IN_PROGRESS") {
        type = "confirm";
        text = `Đang xử lý lịch hẹn ${bikeName}`;
      } else {
        text = `Khách đặt lịch ${bikeName}`;
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
            <p>VND · tính từ đơn đã hoàn thành trong tháng</p>
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
            {lowStock.length === 0 ? (
              <p style={{ margin: 0, color: "var(--manager-muted)", fontWeight: 700 }}>Chưa có cảnh báo tồn kho.</p>
            ) : (
              lowStock.map((item) => (
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
              ))
            )}
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
            {techniciansLeaderboard.length === 0 ? (
              <p style={{ margin: 0, color: "var(--manager-muted)", fontWeight: 700 }}>Chưa có dữ liệu hiệu suất KTV.</p>
            ) : (
              techniciansLeaderboard.map((tech, index) => (
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
              ))
            )}
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
            {topServices.length === 0 ? (
              <p style={{ margin: "12px 16px", color: "var(--manager-muted)", fontWeight: 700 }}>
                Chưa có đơn hoàn thành để thống kê doanh thu dịch vụ.
              </p>
            ) : (
              topServices.map((svc) => (
              <div className="latest-table-row" key={svc.name} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.2fr", padding: "12px 16px" }}>
                <strong>{svc.name}</strong>
                <span>{svc.count} đơn</span>
                <span style={{ textAlign: "right", color: "var(--manager-primary-bright)", fontWeight: "800" }}>
                  {formatVND(svc.revenue)}
                </span>
              </div>
              ))
            )}
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
            {recentActivities.length === 0 ? (
              <p style={{ margin: 0, color: "var(--manager-muted)", fontWeight: 700 }}>Chưa có hoạt động gần đây.</p>
            ) : (
              recentActivities.map((item, idx) => (
              <div className={`activity-row ${item.type}`} key={idx}>
                <time>{item.time}</time>
                <span className="activity-dot" />
                <p dangerouslySetInnerHTML={{ __html: item.text }} />
              </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
