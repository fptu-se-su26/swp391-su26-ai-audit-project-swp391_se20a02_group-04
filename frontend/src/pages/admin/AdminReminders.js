import React, { useCallback, useEffect, useState } from "react";
import {
  BellRing,
  RefreshCw,
  Send,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock3,
  X,
} from "lucide-react";
import AdminSidebar from "../../components/AdminSidebar";
import { adminReminderApi } from "../../services/adminReminderApi";
import "../../styles/admin/AdminDashboard.css";
import "../../styles/admin/AdminReminders.css";

const STATUS_LABEL = {
  SENT: { label: "Đã gửi", tone: "success" },
  FAILED: { label: "Lỗi", tone: "danger" },
  PENDING: { label: "Chờ", tone: "warning" },
  SKIPPED: { label: "Bỏ qua", tone: "neutral" },
};

const CHANNEL_LABEL = {
  EMAIL: "Email",
  IN_APP: "Thông báo in-app",
  BOTH: "Email + In-app",
  NONE: "Không gửi",
};

const TRIGGER_LABEL = {
  CRON: "Tự động (job hệ thống)",
  MANUAL: "Gửi tay bởi admin",
};

function formatDate(value) {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DeliveryPill({ ok, label }) {
  return (
    <span className={`reminder-delivery-pill ${ok ? "ok" : "off"}`}>
      {ok ? "✓" : "–"} {label}
    </span>
  );
}

export default function AdminReminders({ onViewChange }) {
  const [dueItems, setDueItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [dueCount, setDueCount] = useState(0);
  const [today, setToday] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedHistory, setSelectedHistory] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dueRes, historyRes] = await Promise.all([
        adminReminderApi.listDue({ lookbackDays: 7 }),
        adminReminderApi.listHistory({ status: statusFilter, page: 1, limit: 30 }),
      ]);

      setDueItems(dueRes.data?.items || []);
      setDueCount(dueRes.data?.due_count || 0);
      setToday(dueRes.data?.today || "");
      setHistory(historyRes.data?.items || []);
    } catch (err) {
      setError(err.message || "Không tải được dữ liệu nhắc bảo dưỡng.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedHistory) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setSelectedHistory(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedHistory]);

  const handlePreview = async () => {
    setRunning(true);
    setNotice("");
    setError("");
    try {
      const res = await adminReminderApi.run({ dryRun: true, lookbackDays: 7 });
      setNotice(res.message || `Preview: ${res.data?.due_count || 0} khách đến hạn`);
      setDueItems(res.data?.items || []);
      setDueCount(res.data?.due_count || 0);
    } catch (err) {
      setError(err.message || "Không chạy được preview.");
    } finally {
      setRunning(false);
    }
  };

  const handleSend = async () => {
    if (!window.confirm(`Gửi nhắc bảo dưỡng cho ${dueCount || "các"} khách đến hạn?`)) {
      return;
    }
    setRunning(true);
    setNotice("");
    setError("");
    try {
      const res = await adminReminderApi.run({ dryRun: false, lookbackDays: 7 });
      setNotice(res.message || "Đã chạy job nhắc bảo dưỡng.");
      await loadData();
    } catch (err) {
      setError(err.message || "Không gửi được nhắc.");
    } finally {
      setRunning(false);
    }
  };

  const selectedMeta = selectedHistory
    ? STATUS_LABEL[selectedHistory.status] || STATUS_LABEL.PENDING
    : null;
  const selectedVehicle = selectedHistory?.vehicle_snapshot || {};
  const selectedVehicleLabel =
    [selectedVehicle.brand, selectedVehicle.model].filter(Boolean).join(" ") || "—";

  return (
    <div className="dashboard-layout reminder-layout">
      <AdminSidebar activeView="reminders" onViewChange={onViewChange} />
      <main className="main-content reminder-main">
        <header className="reminder-header">
          <div>
            <p className="admin-eyebrow">Vận hành</p>
            <h1>Nhắc bảo dưỡng định kỳ</h1>
          </div>
          <div className="reminder-actions">
            <button type="button" className="btn-secondary" onClick={loadData} disabled={loading || running}>
              <RefreshCw size={16} /> Làm mới
            </button>
            <button type="button" className="btn-secondary" onClick={handlePreview} disabled={running}>
              <Eye size={16} /> Preview
            </button>
            <button type="button" className="btn-primary" onClick={handleSend} disabled={running || dueCount === 0}>
              <Send size={16} /> Gửi nhắc ({dueCount})
            </button>
          </div>
        </header>

        {error ? (
          <div className="reminder-banner danger">
            <AlertCircle size={18} /> {error}
          </div>
        ) : null}
        {notice ? (
          <div className="reminder-banner success">
            <CheckCircle2 size={18} /> {notice}
          </div>
        ) : null}

        <section className="reminder-stats">
          <article className="reminder-stat">
            <BellRing size={20} />
            <div>
              <strong>{dueCount}</strong>
              <span>Đến hạn hôm nay</span>
            </div>
          </article>
          <article className="reminder-stat">
            <Clock3 size={20} />
            <div>
              <strong>{today ? formatDate(today) : "—"}</strong>
              <span>Ngày hệ thống</span>
            </div>
          </article>
          <article className="reminder-stat">
            <CheckCircle2 size={20} />
            <div>
              <strong>{history.filter((row) => row.status === "SENT").length}</strong>
              <span>Đã gửi (trang này)</span>
            </div>
          </article>
        </section>

        <section className="reminder-panel">
          <div className="reminder-panel-head">
            <h2>Khách đến hạn (7 ngày gần nhất)</h2>
            <span>{dueItems.length} dòng</span>
          </div>
          {loading ? (
            <p className="reminder-empty">Đang tải…</p>
          ) : dueItems.length === 0 ? (
            <p className="reminder-empty">
              Không có khách đến hạn. Bật nhắc trên từng dịch vụ (Admin → Dịch vụ → Reminder days).
            </p>
          ) : (
            <div className="reminder-table-wrap">
              <table className="reminder-table">
                <thead>
                  <tr>
                    <th>Khách</th>
                    <th>Dịch vụ</th>
                    <th>Xe</th>
                    <th>Làm gần nhất</th>
                    <th>Đến hạn</th>
                    <th>Chu kỳ</th>
                  </tr>
                </thead>
                <tbody>
                  {dueItems.map((item) => (
                    <tr key={String(item.appointment_id)}>
                      <td>
                        <strong>{item.customer?.full_name || "—"}</strong>
                        <div className="muted">{item.customer?.email || "—"}</div>
                      </td>
                      <td>{item.service_name}</td>
                      <td>
                        {[item.vehicle?.brand, item.vehicle?.model].filter(Boolean).join(" ") || "—"}
                        <div className="muted">{item.vehicle?.license_plate || ""}</div>
                      </td>
                      <td>{formatDate(item.completed_date)}</td>
                      <td>{formatDate(item.due_date)}</td>
                      <td>
                        {item.reminder_days} ngày
                        {item.reminder_mileage ? (
                          <div className="muted">~{Number(item.reminder_mileage).toLocaleString("vi-VN")} km</div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="reminder-panel">
          <div className="reminder-panel-head">
            <h2>Lịch sử gửi</h2>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Lọc trạng thái"
            >
              <option value="">Tất cả</option>
              <option value="SENT">Đã gửi</option>
              <option value="FAILED">Lỗi</option>
              <option value="PENDING">Chờ</option>
              <option value="SKIPPED">Bỏ qua</option>
            </select>
          </div>
          {history.length === 0 ? (
            <p className="reminder-empty">Chưa có lịch sử gửi nhắc.</p>
          ) : (
            <div className="reminder-table-wrap">
              <table className="reminder-table">
                <thead>
                  <tr>
                    <th>Khách</th>
                    <th>Dịch vụ</th>
                    <th>Đến hạn</th>
                    <th>Kênh</th>
                    <th>Trạng thái</th>
                    <th>Gửi lúc</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => {
                    const meta = STATUS_LABEL[row.status] || STATUS_LABEL.PENDING;
                    return (
                      <tr
                        key={String(row._id)}
                        className="reminder-row-clickable"
                        onClick={() => setSelectedHistory(row)}
                      >
                        <td>
                          <strong>{row.customer_id?.full_name || "—"}</strong>
                          <div className="muted">{row.customer_id?.email || ""}</div>
                        </td>
                        <td>{row.service_name}</td>
                        <td>{formatDate(row.due_date)}</td>
                        <td>{CHANNEL_LABEL[row.channel] || row.channel || "—"}</td>
                        <td>
                          <span className={`reminder-chip ${meta.tone}`}>{meta.label}</span>
                        </td>
                        <td>{formatDate(row.sent_at || row.created_at)}</td>
                        <td>
                          <button
                            type="button"
                            className="reminder-detail-btn"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedHistory(row);
                            }}
                          >
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {selectedHistory ? (
        <div
          className="reminder-modal-backdrop"
          onClick={() => setSelectedHistory(null)}
          role="presentation"
        >
          <div
            className="reminder-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reminder-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="reminder-modal-head">
              <div className="reminder-modal-title-block">
                <div className="reminder-modal-title-row">
                  <p className="admin-eyebrow">Chi tiết lịch sử gửi</p>
                  <span className={`reminder-chip ${selectedMeta.tone}`}>{selectedMeta.label}</span>
                </div>
                <h2 id="reminder-detail-title">{selectedHistory.service_name || "Nhắc bảo dưỡng"}</h2>
                <p className="reminder-modal-subtitle">
                  {TRIGGER_LABEL[selectedHistory.triggered_by] || "—"}
                  {" · "}
                  {formatDate(selectedHistory.sent_at || selectedHistory.created_at)}
                </p>
              </div>
              <button
                type="button"
                className="reminder-modal-close"
                onClick={() => setSelectedHistory(null)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="reminder-modal-body">
              <section className="reminder-detail-section">
                <h3>Khách hàng</h3>
                <div className="reminder-detail-hero">
                  <strong>{selectedHistory.customer_id?.full_name || "—"}</strong>
                  <span>{selectedHistory.customer_id?.email || "Không có email"}</span>
                  <span>{selectedHistory.customer_id?.phone || "Không có SĐT"}</span>
                </div>
              </section>

              <section className="reminder-detail-section">
                <h3>Dịch vụ & xe</h3>
                <div className="reminder-detail-grid">
                  <div className="reminder-detail-field">
                    <span>Mã lịch gốc</span>
                    <strong>
                      {selectedHistory.appointment_id?.appointment_code ||
                        (selectedHistory.appointment_id?._id
                          ? String(selectedHistory.appointment_id._id).slice(-8)
                          : "—")}
                    </strong>
                  </div>
                  <div className="reminder-detail-field">
                    <span>Ngày đến hạn</span>
                    <strong>{formatDate(selectedHistory.due_date)}</strong>
                  </div>
                  <div className="reminder-detail-field">
                    <span>Xe</span>
                    <strong>{selectedVehicleLabel}</strong>
                    <em>{selectedVehicle.license_plate || "Chưa có biển số"}</em>
                  </div>
                  <div className="reminder-detail-field">
                    <span>Chu kỳ nhắc</span>
                    <strong>
                      {selectedHistory.reminder_days
                        ? `${selectedHistory.reminder_days} ngày`
                        : "—"}
                    </strong>
                    {selectedHistory.reminder_mileage ? (
                      <em>~{Number(selectedHistory.reminder_mileage).toLocaleString("vi-VN")} km</em>
                    ) : null}
                    {typeof selectedVehicle.odometer === "number" && selectedVehicle.odometer > 0 ? (
                      <em>Số km lúc làm: {selectedVehicle.odometer.toLocaleString("vi-VN")} km</em>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="reminder-detail-section">
                <h3>Kênh gửi</h3>
                <div className="reminder-delivery-row">
                  <DeliveryPill ok={Boolean(selectedHistory.email_sent)} label="Email" />
                  <DeliveryPill ok={Boolean(selectedHistory.notification_sent)} label="In-app" />
                  <span className="reminder-channel-note">
                    {CHANNEL_LABEL[selectedHistory.channel] || selectedHistory.channel || "—"}
                  </span>
                </div>
              </section>

              {selectedHistory.error_message ? (
                <section className="reminder-detail-section reminder-detail-error">
                  <h3>Lỗi gửi</h3>
                  <p>{selectedHistory.error_message}</p>
                </section>
              ) : null}
            </div>

            <div className="reminder-modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedHistory(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
