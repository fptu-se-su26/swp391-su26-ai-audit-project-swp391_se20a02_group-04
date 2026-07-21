import React, { useEffect, useMemo, useState } from "react";
import {
  checkInStaff,
  checkOutStaff,
  getAttendanceHistory,
  getAttendanceSummary,
  getTodayAttendance,
} from "../../services/staffAppointmentApi";
import { Icon, PageHeader } from "./StaffComponents";
import "../../styles/staff/StaffAttendance.css";

const STATUS_META = {
  NOT_CHECKED_IN: {
    label: "Chưa check-in",
    tone: "waiting",
    icon: "schedule",
    title: "Sẵn sàng bắt đầu ngày làm việc",
    description: "Bạn chưa check-in hôm nay. Bấm Check-in để hệ thống ghi nhận giờ bắt đầu làm việc.",
  },
  CHECKED_IN: {
    label: "Đang làm việc",
    tone: "active",
    icon: "pending_actions",
    title: "Bạn đang trong ca",
    description: "Hệ thống đang ghi nhận thời gian làm việc. Bấm Check-out khi bạn kết thúc ngày làm việc.",
  },
  CHECKED_OUT: {
    label: "Đã check-out",
    tone: "done",
    icon: "task_alt",
    title: "Chấm công hôm nay đã hoàn tất",
    description: "Bạn đã check-out hôm nay. Hai thao tác check-in và check-out đã được khóa cho ngày này.",
  },
};

const HISTORY_STATUS = {
  CHECKED_IN: { label: "Đang làm", className: "status-yellow", icon: "pending_actions" },
  IN_SHIFT: { label: "Đang làm", className: "status-yellow", icon: "pending_actions" },
  CHECKED_OUT: { label: "Hoàn tất", className: "status-green", icon: "task_alt" },
  COMPLETED: { label: "Hoàn tất", className: "status-green", icon: "task_alt" },
};

function formatDate(value) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatShortDate(value) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatTime(value) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatHours(value) {
  const totalMinutes = Math.round(Number(value || 0) * 60);
  if (!totalMinutes) return "--";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) return `${minutes} phút`;
  return minutes ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
}

function translateAttendanceError(message) {
  const translations = {
    "Route not found": "Không tìm thấy API chấm công. Hãy khởi động lại backend rồi thử lại.",
    "You have already checked in today": "Bạn đã check-in hôm nay, không thể check-in lại.",
    "You are already checked in": "Bạn đã check-in hôm nay, không thể check-in lại.",
    "Shift has already been completed today": "Bạn đã check-out hôm nay, không thể check-in lại.",
    "You have not checked in today": "Bạn chưa check-in hôm nay nên không thể check-out.",
    "No active shift found for today": "Bạn chưa check-in hôm nay nên không thể check-out.",
    "You have already checked out today": "Bạn đã check-out hôm nay, không thể check-out lại.",
    "Shift is not active": "Bạn đã check-out hôm nay, không thể check-out lại.",
    "Attendance record is not ready for check-out": "Trạng thái chấm công hiện tại không thể check-out.",
    "No token provided. Please login.": "Vui lòng đăng nhập để chấm công.",
    "Access denied. Required roles: STAFF": "Chỉ tài khoản STAFF được chấm công.",
  };

  return translations[message] || message || "Không thể xử lý chấm công. Vui lòng thử lại.";
}

export default function StaffAttendance() {
  const [attendance, setAttendance] = useState(null);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const status = attendance?.status || "NOT_CHECKED_IN";
  const meta = STATUS_META[status] || STATUS_META.NOT_CHECKED_IN;
  const canCheckIn = status === "NOT_CHECKED_IN";
  const canCheckOut = status === "CHECKED_IN";

  const details = useMemo(
    () => [
      { label: "Trạng thái", value: meta.label, icon: meta.icon },
      { label: "Giờ check-in", value: formatTime(attendance?.check_in_time), icon: "login" },
      { label: "Giờ check-out", value: formatTime(attendance?.check_out_time), icon: "logout" },
      {
        label: "Tổng giờ làm",
        value: status === "CHECKED_OUT" ? formatHours(attendance?.total_hours) : status === "CHECKED_IN" ? "Đang tính" : "--",
        icon: "timer",
      },
    ],
    [attendance, meta, status]
  );

  const summaryCards = useMemo(
    () => [
      { label: "Tổng ca 30 ngày", value: summary?.total_shifts ?? 0, icon: "calendar_month" },
      { label: "Ca hoàn tất", value: summary?.completed_shifts ?? 0, icon: "task_alt" },
      { label: "Tổng giờ 30 ngày", value: formatHours(summary?.total_hours), icon: "timer" },
    ],
    [summary]
  );

  const loadAttendanceData = async ({ showLoading = true, clearNotice = false } = {}) => {
    if (showLoading) {
      setIsLoading(true);
    }
    if (clearNotice) {
      setMessage("");
    }
    setError("");

    try {
      const [todayResponse, historyResponse, summaryResponse] = await Promise.all([
        getTodayAttendance(),
        getAttendanceHistory({ page: 1, limit: 7 }),
        getAttendanceSummary({ period: 30 }),
      ]);

      setAttendance(todayResponse.data?.attendance || null);
      setHistory(historyResponse.data?.records || []);
      setSummary(summaryResponse.data?.overview || null);
    } catch (err) {
      setError(translateAttendanceError(err.message));
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadAttendanceData();
  }, []);

  const handleCheckIn = async () => {
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await checkInStaff();
      setAttendance(response.data?.attendance || null);
      setMessage("Check-in thành công.");
      await loadAttendanceData({ showLoading: false });
    } catch (err) {
      setError(translateAttendanceError(err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await checkOutStaff();
      setAttendance(response.data?.attendance || null);
      setMessage("Check-out thành công.");
      await loadAttendanceData({ showLoading: false });
    } catch (err) {
      setError(translateAttendanceError(err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Chấm công"
        subtitle="Check-in, check-out và lịch sử điểm danh — không liên quan đến nhận/xử lý đơn sửa xe"
      />

      {isLoading ? (
        <div className="attendance-loading state-box">
          <div>
            <strong>Đang tải chấm công</strong>
            <p>Hệ thống đang lấy trạng thái chấm công hôm nay từ máy chủ.</p>
          </div>
        </div>
      ) : (
        <div className="attendance-page">
          <section className={`attendance-hero attendance-hero-${meta.tone}`}>
            <div className="attendance-hero-main">
              <span className={`attendance-status-pill ${meta.tone}`}>
                <Icon name={meta.icon} />
                {meta.label}
              </span>
              <h3>{meta.title}</h3>
              <strong>{formatDate(attendance?.work_date)}</strong>
              <p>{meta.description}</p>
            </div>

            <div className="attendance-actions" aria-label="Thao tác chấm công">
              <button
                className="primary-button large"
                disabled={isSubmitting || !canCheckIn}
                onClick={handleCheckIn}
                type="button"
              >
                <Icon name="login" />
                {isSubmitting && canCheckIn ? "Đang check-in..." : "Check-in"}
              </button>
              <button
                className="secondary-button large"
                disabled={isSubmitting || !canCheckOut}
                onClick={handleCheckOut}
                type="button"
              >
                <Icon name="logout" />
                {isSubmitting && canCheckOut ? "Đang check-out..." : "Check-out"}
              </button>
            </div>
          </section>

          {(message || error) && (
            <div className={`attendance-message ${error ? "error" : "success"}`} role="status" aria-live="polite">
              <Icon name={error ? "error" : "check_circle"} />
              <span>{error || message}</span>
            </div>
          )}

          <section className="panel wide-panel attendance-summary-panel">
            <div className="attendance-panel-heading">
              <div>
                <span>Hôm nay</span>
                <h3>Trạng thái chấm công</h3>
              </div>
              <button
                className="attendance-refresh"
                disabled={isSubmitting}
                onClick={() => loadAttendanceData({ clearNotice: true })}
                type="button"
              >
                <Icon name="refresh" />
                Tải lại
              </button>
            </div>

            <div className="attendance-detail-grid">
              {details.map((item) => (
                <article className="attendance-detail-card" key={item.label}>
                  <div className="attendance-detail-icon">
                    <Icon name={item.icon} />
                  </div>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </section>

          <section className="panel wide-panel attendance-summary-panel">
            <div className="attendance-panel-heading">
              <div>
                <span>30 ngày gần đây</span>
                <h3>Tổng quan ca làm</h3>
              </div>
            </div>

            <div className="attendance-detail-grid summary-grid">
              {summaryCards.map((item) => (
                <article className="attendance-detail-card compact" key={item.label}>
                  <div className="attendance-detail-icon">
                    <Icon name={item.icon} />
                  </div>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </section>

          <section className="history-panel attendance-history-panel">
            <div className="panel-head">
              <h3>Lịch sử chấm công gần đây</h3>
            </div>
            {history.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>Check-in</th>
                      <th>Check-out</th>
                      <th>Tổng giờ</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((record) => {
                      const historyMeta = HISTORY_STATUS[record.status] || HISTORY_STATUS.CHECKED_IN;
                      return (
                        <tr key={record.attendance_id || `${record.staff_id}-${record.work_date}`}>
                          <td>{formatShortDate(record.work_date)}</td>
                          <td>{formatTime(record.check_in_time)}</td>
                          <td>{formatTime(record.check_out_time)}</td>
                          <td>{record.status === "CHECKED_OUT" || record.status === "COMPLETED" ? formatHours(record.total_hours) : "Đang tính"}</td>
                          <td>
                            <span className={`table-status ${historyMeta.className}`}>
                              <Icon name={historyMeta.icon} />
                              {historyMeta.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="state-box compact-state">
                <div>
                  <strong>Chưa có lịch sử chấm công</strong>
                  <p>Các ca làm sau khi check-in sẽ xuất hiện tại đây.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
