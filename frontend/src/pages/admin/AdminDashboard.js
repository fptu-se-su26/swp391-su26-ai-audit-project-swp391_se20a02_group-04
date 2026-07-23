import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  ClipboardList,
  Banknote,
  AlertTriangle,
  Package,
  Activity,
  RefreshCw,
  Calendar,
  ArrowRight,
  Bell,
  CheckCircle2,
} from "lucide-react";
import AdminSidebar from "../../components/AdminSidebar";
import { adminUserService } from "../../services/adminUserService";
import {
  getAdminAppointments,
  getAdminAppointmentStatistics,
  mapAdminAppointment,
} from "../../services/adminAppointmentApi";
import { getInventoryStatistics, getLowStockItems } from "../../services/inventoryApi";
import {
  getNotifications,
  markAsRead as markNotificationAsRead,
  markAllAsRead as markAllNotificationsAsRead,
} from "../../services/notificationApi";
import "../../styles/admin/AdminDashboard.css";

const PERIOD_OPTIONS = [
  { key: "7", label: "7 ngày" },
  { key: "30", label: "30 ngày" },
  { key: "90", label: "90 ngày" },
];

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function CountUp({ value, suffix = "", decimals = 0 }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let frameId;
    const duration = 800;
    const start = performance.now();
    const target = Number(value) || 0;

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(target * eased);
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value]);

  return `${current.toLocaleString("vi-VN", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })}${suffix}`;
}

function formatMoney(amount) {
  const value = Number(amount) || 0;
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}tr`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}

function toLocalKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfLocalDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getAppointmentDate(appointment = {}) {
  const raw = appointment.appointment_date || appointment.appointment_start_at || appointment.created_at;
  if (!raw) return null;

  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getAppointmentCost(appointment = {}) {
  const service = appointment.service_id || appointment.service || {};
  return Number(appointment.final_cost || service.base_price || 0);
}

function statusClass(status = "") {
  const value = String(status).toUpperCase();
  if (value === "PENDING") return "pending";
  if (value === "CONFIRMED") return "confirmed";
  if (value === "IN_PROGRESS") return "progress";
  if (value === "COMPLETED") return "completed";
  if (value === "CANCELLED" || value === "NO_SHOW") return "cancelled";
  return "pending";
}

function formatTimeElapsed(dateStr) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return `${Math.floor(diffHours / 24)} ngày trước`;
}

function settledValue(result, fallback = null) {
  return result.status === "fulfilled" ? result.value : fallback;
}

export default function AdminDashboard({ onViewChange }) {
  const [period, setPeriod] = useState("7");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboardStats, setDashboardStats] = useState(null);
  const [appointmentStats, setAppointmentStats] = useState(null);
  const [inventoryStats, setInventoryStats] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await getNotifications({ limit: 12 });
      setNotifications(res?.data?.notifications || []);
    } catch {
      // Silent: dashboard vẫn dùng được khi thông báo lỗi
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    const results = await Promise.allSettled([
      adminUserService.getDashboardStatistics(period),
      getAdminAppointmentStatistics({ period }),
      getAdminAppointments({ limit: 100, sort_by: "appointment_date", sort_order: "desc" }),
      getInventoryStatistics({ period }),
      getLowStockItems({ limit: 5 }),
    ]);

    const [dashRes, apptStatsRes, apptRes, invStatsRes, lowStockRes] = results.map((item) =>
      settledValue(item)
    );

    const failed = results.filter((item) => item.status === "rejected");
    if (failed.length === results.length) {
      setError(failed[0]?.reason?.message || "Không thể tải tổng quan");
    } else if (failed.length > 0) {
      setError("Một số dữ liệu chưa tải được. Đang hiển thị phần còn lại.");
    }

    setDashboardStats(dashRes || null);
    setAppointmentStats(apptStatsRes?.data || apptStatsRes || null);
    setInventoryStats(invStatsRes?.data || invStatsRes || null);

    const rawAppointments = apptRes?.data?.appointments || apptRes?.appointments || [];
    setAppointments(Array.isArray(rawAppointments) ? rawAppointments : []);

    const lowItems =
      lowStockRes?.data?.items ||
      lowStockRes?.data?.low_stock_items ||
      lowStockRes?.items ||
      [];
    setLowStock(Array.isArray(lowItems) ? lowItems : []);
    setLoading(false);
  }, [period]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 20000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    if (!showNotifications) return undefined;
    const onOutside = (event) => {
      if (!event.target.closest(".dashboard-notif-wrap")) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [showNotifications]);

  const mappedAppointments = useMemo(
    () => appointments.map(mapAdminAppointment),
    [appointments]
  );

  const periodAppointments = useMemo(() => {
    const days = Number(period) || 7;
    const from = startOfLocalDay();
    from.setDate(from.getDate() - (days - 1));

    return appointments.filter((item) => {
      const date = getAppointmentDate(item);
      return date && date >= from;
    });
  }, [appointments, period]);

  const todayKey = toLocalKey(startOfLocalDay());
  const todayAppointments = useMemo(
    () =>
      appointments.filter((item) => {
        const date = getAppointmentDate(item);
        return date && toLocalKey(date) === todayKey;
      }),
    [appointments, todayKey]
  );

  const revenueTotal = useMemo(
    () =>
      periodAppointments
        .filter((item) => String(item.status).toUpperCase() === "COMPLETED")
        .reduce((sum, item) => sum + getAppointmentCost(item), 0),
    [periodAppointments]
  );

  const chartBars = useMemo(() => {
    const days = Number(period) || 7;
    const useWeeks = days > 14;
    const buckets = [];

    if (useWeeks) {
      const weeks = Math.ceil(days / 7);
      for (let i = weeks - 1; i >= 0; i -= 1) {
        const end = startOfLocalDay();
        end.setDate(end.getDate() - i * 7);
        const start = startOfLocalDay(end);
        start.setDate(start.getDate() - 6);
        buckets.push({
          key: toLocalKey(end),
          label: `${start.getDate()}/${start.getMonth() + 1}`,
          start,
          end,
          count: 0,
          revenue: 0,
        });
      }

      periodAppointments.forEach((item) => {
        const date = getAppointmentDate(item);
        if (!date) return;
        const bucket = buckets.find((entry) => date >= entry.start && date <= entry.end);
        if (!bucket) return;
        bucket.count += 1;
        if (String(item.status).toUpperCase() === "COMPLETED") {
          bucket.revenue += getAppointmentCost(item);
        }
      });
    } else {
      for (let i = days - 1; i >= 0; i -= 1) {
        const date = startOfLocalDay();
        date.setDate(date.getDate() - i);
        buckets.push({
          key: toLocalKey(date),
          label: DAY_LABELS[date.getDay()],
          count: 0,
          revenue: 0,
        });
      }

      const map = Object.fromEntries(buckets.map((item) => [item.key, item]));
      periodAppointments.forEach((item) => {
        const date = getAppointmentDate(item);
        if (!date) return;
        const key = toLocalKey(date);
        if (!map[key]) return;
        map[key].count += 1;
        if (String(item.status).toUpperCase() === "COMPLETED") {
          map[key].revenue += getAppointmentCost(item);
        }
      });
    }

    const max = Math.max(...buckets.map((item) => item.count), 1);
    return buckets.map((item) => ({
      ...item,
      height: Math.max(8, Math.round((item.count / max) * 100)),
    }));
  }, [period, periodAppointments]);

  const overview = appointmentStats?.overview || {};
  const users = dashboardStats?.users || {};
  const invOverview = inventoryStats?.overview || {};

  const completedInPeriod = periodAppointments.filter(
    (item) => String(item.status).toUpperCase() === "COMPLETED"
  ).length;

  const avgTicket = completedInPeriod > 0 ? revenueTotal / completedInPeriod : 0;

  const pipeline = [
    { key: "pending", label: "Chờ xử lý", value: Number(overview.pending || 0), tone: "warning" },
    { key: "confirmed", label: "Đã xác nhận", value: Number(overview.confirmed || 0), tone: "neutral" },
    { key: "progress", label: "Đang làm", value: Number(overview.in_progress || 0), tone: "primary" },
    { key: "completed", label: "Hoàn tất", value: Number(overview.completed || 0), tone: "success" },
  ];

  const kpis = [
    {
      title: "Tổng người dùng",
      value: Number(users.total || 0),
      meta: `+${Number(users.new_users || 0)} mới trong ${period} ngày`,
      icon: Users,
      tone: "neutral",
    },
    {
      title: "Tổng lịch hẹn",
      value: Number(overview.total || dashboardStats?.appointments?.total || 0),
      meta: `${Number(overview.recent || periodAppointments.length || 0)} lịch trong kỳ đang chọn`,
      icon: ClipboardList,
      tone: "primary",
    },
    {
      title: "Doanh thu kỳ",
      value: revenueTotal >= 1_000_000 ? revenueTotal / 1_000_000 : revenueTotal,
      displaySuffix: revenueTotal >= 1_000_000 ? "tr" : "đ",
      decimals: revenueTotal >= 1_000_000 ? 1 : 0,
      meta: "Từ lịch đã hoàn tất (ước tính)",
      icon: Banknote,
      tone: "success",
    },
    {
      title: "Chờ xử lý",
      value: Number(overview.pending || dashboardStats?.appointments?.pending || 0),
      meta: `${todayAppointments.length} lịch trong hôm nay`,
      icon: AlertTriangle,
      tone: "warning",
    },
  ];

  const summaryRows = [
    ["Doanh thu kỳ", formatMoney(revenueTotal)],
    ["Lịch hoàn tất", String(overview.completed || completedInPeriod || 0)],
    ["Giá trị TB / lịch", formatMoney(avgTicket)],
    ["Tỷ lệ hoàn tất", `${Number(overview.completion_rate || 0).toFixed(1)}%`],
  ];

  const latestRows = mappedAppointments.slice(0, 5);

  const activityRows = mappedAppointments.slice(0, 5).map((item) => ({
    time: item.hour || item.time,
    text: `${item.customer} · ${item.service} · ${item.statusText}`,
    type:
      item.status === "COMPLETED"
        ? "confirm"
        : item.status === "PENDING"
          ? "booking"
          : item.status === "IN_PROGRESS"
            ? "assign"
            : "stock",
  }));

  const normalizedLowStock = lowStock.slice(0, 4).map((item) => {
    const qty = Number(item.quantity || 0);
    const reorder = Math.max(Number(item.reorder_point || item.min_stock_level || 1), 1);
    const percent = Math.min(100, Math.round((qty / reorder) * 100));
    return {
      id: item._id || item.id || item.item_code,
      name: item.product_name || item.item_name || item.name || "Vật tư",
      amount: `Còn ${qty} ${item.unit || ""}`.trim(),
      percent: Math.max(percent, 4),
      tone: qty <= 0 ? "danger" : percent <= 40 ? "danger" : "warning",
    };
  });

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.is_read) {
        await markNotificationAsRead(notif._id);
        setNotifications((current) =>
          current.map((item) => (item._id === notif._id ? { ...item, is_read: true } : item))
        );
      }
    } catch {
      // ignore
    } finally {
      setShowNotifications(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <AdminSidebar activeView="dashboard" onViewChange={onViewChange} />

      <main className="main-content">
        <header className="dashboard-topbar">
          <div>
            <span>Vận hành garage</span>
            <h2>Tổng quan</h2>
          </div>
          <div className="dashboard-topbar-actions">
            <div className="revenue-filters" aria-label="Kỳ thống kê">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={period === option.key ? "active" : ""}
                  onClick={() => setPeriod(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="dashboard-notif-wrap">
              <button
                className="dashboard-refresh-btn"
                type="button"
                onClick={() => setShowNotifications((open) => !open)}
                aria-label="Thông báo"
              >
                <Bell size={16} />
                {unreadCount > 0 && <i className="dashboard-notif-dot" />}
              </button>

              {showNotifications && (
                <div className="dashboard-notif-dropdown">
                  <div className="dashboard-notif-head">
                    <strong>Thông báo</strong>
                    {unreadCount > 0 && (
                      <button type="button" onClick={handleMarkAllRead}>
                        Đánh dấu đã đọc
                      </button>
                    )}
                  </div>
                  <div className="dashboard-notif-list">
                    {notifications.length === 0 && (
                      <p className="dashboard-empty">Chưa có thông báo.</p>
                    )}
                    {notifications.map((notif) => (
                      <button
                        key={notif._id}
                        type="button"
                        className={`dashboard-notif-item ${notif.is_read ? "" : "unread"}`}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <span>{notif.title || "Thông báo"}</span>
                        <p>{notif.message}</p>
                        <small>{formatTimeElapsed(notif.created_at)}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              className="dashboard-refresh-btn"
              type="button"
              onClick={loadDashboard}
              aria-label="Tải lại"
            >
              <RefreshCw size={16} className={loading ? "is-spinning" : ""} />
            </button>
          </div>
        </header>

        <div className="content-body dashboard-overview">
          {error && <div className="dashboard-error">{error}</div>}

          <section className="overview-kpi-grid fade-section">
            {kpis.map((card) => {
              const Icon = card.icon;
              return (
                <article className={`overview-card ${card.tone}`} key={card.title}>
                  <div className="overview-card-top">
                    <span>{card.title}</span>
                    <div className="overview-card-icon">
                      <Icon size={18} />
                    </div>
                  </div>
                  <strong>
                    {loading ? "—" : (
                      <CountUp
                        value={card.value}
                        suffix={card.displaySuffix || ""}
                        decimals={card.decimals || 0}
                      />
                    )}
                  </strong>
                  <p>{card.meta}</p>
                </article>
              );
            })}
          </section>

          <section className="overview-pipeline fade-section section-delay-1" aria-label="Trạng thái lịch hẹn">
            {pipeline.map((item) => (
              <div className={`pipeline-chip ${item.tone}`} key={item.key}>
                <small>{item.label}</small>
                <strong>{loading ? "—" : item.value}</strong>
              </div>
            ))}
            <div className="pipeline-chip success">
              <small>Tỷ lệ hoàn tất</small>
              <strong>
                {loading ? "—" : `${Number(overview.completion_rate || 0).toFixed(0)}%`}
              </strong>
            </div>
          </section>

          <section className="overview-board fade-section section-delay-1">
            <div className="overview-stack">
              <article className="manager-panel revenue-panel">
                <div className="panel-heading">
                  <div>
                    <span>Lịch hẹn & doanh thu</span>
                    <h3>{Number(period) > 14 ? "Biểu đồ theo tuần" : "Biểu đồ theo ngày"}</h3>
                  </div>
                  <strong>{loading ? "..." : `${periodAppointments.length} lịch`}</strong>
                </div>

                <div className="revenue-content">
                  <div className="revenue-chart" aria-label="Biểu đồ lịch hẹn theo kỳ">
                    {chartBars.map((item, index) => (
                      <div
                        className="revenue-bar"
                        key={item.key}
                        title={`${item.count} lịch · ${formatMoney(item.revenue)}`}
                      >
                        <div className="revenue-bar-track">
                          <div
                            className="revenue-bar-fill"
                            style={{
                              "--bar-height": `${item.height}%`,
                              "--bar-delay": `${index * 40}ms`,
                            }}
                          />
                        </div>
                        <span>{item.label}</span>
                        <em>{item.count}</em>
                      </div>
                    ))}
                  </div>

                  <div className="revenue-table">
                    <div className="revenue-table-head">
                      <span>Chỉ số</span>
                      <span>Giá trị</span>
                    </div>
                    {summaryRows.map(([label, value]) => (
                      <div className="revenue-table-row" key={label}>
                        <span>{label}</span>
                        <strong>{loading ? "—" : value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className="manager-panel latest-appointments-panel">
                <div className="panel-heading">
                  <div>
                    <span>Lịch hẹn</span>
                    <h3>Mới nhất</h3>
                  </div>
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => onViewChange?.("calendar")}
                  >
                    Xem tất cả
                  </button>
                </div>

                <div className="latest-table">
                  <div className="latest-table-head">
                    <span>Mã</span>
                    <span>Khách hàng</span>
                    <span>Dịch vụ</span>
                    <span>Thời gian</span>
                    <span>Trạng thái</span>
                  </div>

                  {loading && <div className="dashboard-empty">Đang tải lịch hẹn...</div>}
                  {!loading && latestRows.length === 0 && (
                    <div className="dashboard-empty">Chưa có lịch hẹn.</div>
                  )}
                  {!loading &&
                    latestRows.map((appointment) => (
                      <div className="latest-table-row" key={appointment.rawId || appointment.id}>
                        <strong>{String(appointment.id).replace(/^#/, "")}</strong>
                        <span>{appointment.customer}</span>
                        <span>{appointment.service}</span>
                        <span>
                          {appointment.time} {appointment.hour}
                        </span>
                        <em className={`manager-status ${statusClass(appointment.status)}`}>
                          {appointment.statusText}
                        </em>
                      </div>
                    ))}
                </div>
              </article>
            </div>

            <div className="overview-stack">
              <article className="manager-panel low-stock-panel">
                <div className="panel-heading">
                  <div>
                    <span>Kho vật tư</span>
                    <h3>Sắp hết hàng</h3>
                  </div>
                  <Package size={18} />
                </div>

                <div className="dashboard-mini-stats">
                  <div>
                    <small>Sắp hết</small>
                    <strong>{invOverview.low_stock_items ?? normalizedLowStock.length ?? 0}</strong>
                  </div>
                  <div>
                    <small>Hết hàng</small>
                    <strong>{invOverview.out_of_stock_items ?? 0}</strong>
                  </div>
                </div>

                <div className="compact-list">
                  {loading && <p className="dashboard-empty">Đang tải kho...</p>}
                  {!loading && normalizedLowStock.length === 0 && (
                    <p className="dashboard-empty">Không có vật tư dưới ngưỡng cảnh báo.</p>
                  )}
                  {!loading &&
                    normalizedLowStock.map((item) => (
                      <div className={`stock-row ${item.tone}`} key={item.id}>
                        <div className="stock-row-main">
                          <Package size={15} />
                          <div>
                            <span>{item.name}</span>
                            <small>{item.percent}% điểm đặt lại</small>
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

                <button
                  className="dashboard-link-btn"
                  type="button"
                  onClick={() => onViewChange?.("inventory")}
                >
                  Xem kho <ArrowRight size={14} />
                </button>
              </article>

              <article className="manager-panel activity-panel">
                <div className="panel-heading">
                  <div>
                    <span>Nhật ký</span>
                    <h3>Hoạt động gần đây</h3>
                  </div>
                  <Activity size={18} />
                </div>

                <div className="dashboard-today-card">
                  <div>
                    <small>Lịch hôm nay</small>
                    <strong>{todayAppointments.length}</strong>
                  </div>
                  <CheckCircle2 size={18} />
                </div>

                <div className="activity-timeline">
                  {loading && <p className="dashboard-empty">Đang tải...</p>}
                  {!loading && activityRows.length === 0 && (
                    <p className="dashboard-empty">Chưa có hoạt động.</p>
                  )}
                  {!loading &&
                    activityRows.map((item) => (
                      <div className={`activity-row ${item.type}`} key={`${item.time}-${item.text}`}>
                        <time>{item.time}</time>
                        <span className="activity-dot" />
                        <p>{item.text}</p>
                      </div>
                    ))}
                </div>

                <div className="dashboard-quick-links">
                  <button type="button" onClick={() => onViewChange?.("calendar")}>
                    <Calendar size={14} /> Lịch hẹn
                  </button>
                  <button type="button" onClick={() => onViewChange?.("customers")}>
                    <Users size={14} /> Khách
                  </button>
                  <button type="button" onClick={() => onViewChange?.("inventory")}>
                    <Package size={14} /> Kho
                  </button>
                </div>
              </article>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
