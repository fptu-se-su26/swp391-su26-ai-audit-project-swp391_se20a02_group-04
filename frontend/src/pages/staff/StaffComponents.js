import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { clearAuthSession, getAuthSession } from "../../services/authApi";
import {
  checkInStaff,
  checkOutStaff,
  getTodayAttendance,
  saveStaffAppointmentNote,
} from "../../services/staffAppointmentApi";
import { getJobRouteId, isJobAssignedToUser } from "./staffAppointmentMapper";

export function Icon({ name, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

export function Sidebar() {
  const navigate = useNavigate();
  const { user } = getAuthSession();
  const navItems = [
    { icon: "dashboard", label: "Tổng quan", to: "/staff/dashboard" },
    { icon: "calendar_month", label: "Lịch làm việc", to: "/staff/schedule" },
    { icon: "assignment", label: "Công việc được giao", to: "/staff/jobs" },
    { icon: "inventory_2", label: "Sử dụng vật tư", to: "/staff/materials" },
    { icon: "schedule", label: "Chấm công", to: "/staff/attendance" },
    { icon: "person", label: "Hồ sơ", to: "/staff/profile" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-main">
        <div className="brand">
          <div className="brand-icon">
            <Icon name="two_wheeler" />
          </div>
          <div>
            <h1>MotoCare Staff</h1>
            <p>Nhân viên kỹ thuật</p>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <NavLink className="nav-link" to={item.to} key={item.label}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="profile">
        <div className="avatar">
          <Icon name="engineering" />
        </div>
        <div className="profile-text">
          <p>{user?.full_name || user?.fullname || user?.email || "Nhân viên"}</p>
          <span>{user?.email || "Tài khoản staff"}</span>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Đăng xuất"
          title="Đăng xuất"
          onClick={() => {
            clearAuthSession();
            navigate("/login", { replace: true });
          }}
        >
          <Icon name="logout" />
        </button>
      </div>
    </aside>
  );
}

export function PageHeader({ title, subtitle, actions = true }) {
  const [attendance, setAttendance] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceMessage, setAttendanceMessage] = useState("");

  React.useEffect(() => {
    if (!actions) return undefined;
    let mounted = true;
    setLoadingAttendance(true);
    getTodayAttendance()
      .then((response) => mounted && setAttendance(response.data?.attendance || null))
      .catch(() => mounted && setAttendance(null))
      .finally(() => mounted && setLoadingAttendance(false));
    return () => { mounted = false; };
  }, [actions]);

  const refreshAttendance = async () => {
    const response = await getTodayAttendance();
    setAttendance(response.data?.attendance || null);
  };

  const handleCheckIn = async () => {
    setLoadingAttendance(true);
    setAttendanceMessage("");
    try {
      const response = await checkInStaff("");
      setAttendance(response.data?.attendance || null);
      setAttendanceMessage("Da vao ca.");
    } catch (error) {
      if (/409|already|da/i.test(error.message || "")) await refreshAttendance().catch(() => {});
      else setAttendanceMessage(error.message || "Khong the vao ca.");
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleCheckOut = async () => {
    if (!window.confirm("Xac nhan ket thuc ca lam?")) return;
    setLoadingAttendance(true);
    setAttendanceMessage("");
    try {
      const response = await checkOutStaff("");
      setAttendance(response.data?.attendance || null);
      setAttendanceMessage("Da ket thuc ca.");
    } catch (error) {
      setAttendanceMessage(error.message || "Khong the ket thuc ca.");
      await refreshAttendance().catch(() => {});
    } finally {
      setLoadingAttendance(false);
    }
  };

  const inShift = attendance?.status === "IN_SHIFT";

  return (
    <header className="topbar">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
        {attendanceMessage && <small className="staff-header-message">{attendanceMessage}</small>}
      </div>
      {actions && (
        <div className="topbar-actions">
          {inShift ? (
            <button className="secondary-button large" disabled={loadingAttendance} onClick={handleCheckOut} type="button">
              <Icon name="logout" />
              Ket thuc ca
            </button>
          ) : (
            <button className="primary-button large" disabled={loadingAttendance} onClick={handleCheckIn} type="button">
              <Icon name="login" />
              Vao ca
            </button>
          )}
        </div>
      )}
    </header>
  );
}
export function StatCard({ icon, label, value, helper, tone }) {
  return (
    <article className="stat-card">
      <div className="stat-head">
        <p>{label}</p>
        <Icon name={icon} className={tone} />
      </div>
      <strong>{value}</strong>
      <span>{helper}</span>
    </article>
  );
}

function buildPrimaryJobAction(job) {
  const { user } = getAuthSession();
  const routeId = getJobRouteId(job);
  const belongsToCurrentStaff = isJobAssignedToUser(job, user);

  if (job.statusKey === "assigned") {
    return { label: "Bắt đầu", to: `/staff/jobs/${routeId}/start`, className: "primary-button" };
  }

  if (job.statusKey === "in_progress" && belongsToCurrentStaff) {
    return { label: "Hoàn thành", to: `/staff/jobs/${routeId}/complete`, className: "primary-button success" };
  }

  return { label: "Chi tiết", to: `/staff/jobs/${routeId}`, className: "primary-button dark" };
}

function buildSecondaryJobAction(job) {
  const routeId = getJobRouteId(job);

  if (job.statusKey === "in_progress") {
    return { label: "Thêm vật tư", to: `/staff/jobs/${routeId}/materials` };
  }

  return { label: "Chi tiết", to: `/staff/jobs/${routeId}` };
}

export function JobCard({ job, compact = false }) {
  const primaryAction = buildPrimaryJobAction(job);
  const secondaryAction = buildSecondaryJobAction(job);

  return (
    <article className={`job-card ${compact ? "compact-card" : ""}`}>
      <div className="job-card-head">
        <div>
          <h4>
            {job.vehicle} - {job.plate}
          </h4>
          <span>#{job.code || job.id}</span>
        </div>
        <span className={`status-pill ${job.statusClass}`}>{job.statusLabel || job.status}</span>
      </div>

      <div className="job-info">
        <div>
          <Icon name="person" />
          <span>
            {job.customer} - {job.time}
          </span>
        </div>
        <div>
          <Icon name={job.serviceIcon} />
          <span>{job.service}</span>
        </div>
        <div>
          <Icon name={job.statusKey === "in_progress" ? "inventory_2" : job.statusKey === "completed" ? "payments" : "sticky_note_2"} />
          <span>{job.note}</span>
        </div>
      </div>

      <div className="job-actions">
        <Link className="secondary-button" to={secondaryAction.to}>
          {secondaryAction.label}
        </Link>
        <Link className={primaryAction.className} to={primaryAction.to}>
          {primaryAction.label}
        </Link>
      </div>
    </article>
  );
}

export function InventoryAlert({ item }) {
  const currentQuantity = item.stock ?? item.quantity ?? 0;
  const threshold = item.min ?? item.reorder_point ?? item.min_stock_level ?? 0;
  const urgent = currentQuantity <= threshold;
  const itemCode = item.code || item.item_code;
  const itemName = item.name || item.item_name;
  const unit = item.unit || "cái";
  const status = item.status || item.stock_status || (urgent ? "Tồn thấp" : "Ổn định");

  return (
    <article className="inventory-card">
      <div className="inventory-head">
        <span>{itemCode}</span>
        <small className={urgent ? "danger" : "warning"}>{status}</small>
      </div>
      <h5>{itemName}</h5>
      <p>
        <Icon name="warehouse" />
        Còn {currentQuantity} {unit}, ngưỡng tối thiểu {threshold} {unit}
      </p>
      <Link className={urgent ? "primary-button full" : "secondary-button full"} to="/staff/materials">
        {urgent ? "Báo quản lý" : "Xem tồn kho"}
      </Link>
    </article>
  );
}

export function WorkHistory({ rows }) {
  return (
    <section className="history-panel">
      <div className="panel-head">
        <h3>Lịch sử công việc 7 ngày</h3>
        <Link to="/staff/jobs">Xem tất cả</Link>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Tổng việc</th>
              <th>Vật tư dùng</th>
              <th>Thời gian</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.date}>
                <td>{row.date}</td>
                <td>
                  <strong>{row.jobs}</strong>
                </td>
                <td>{row.materials}</td>
                <td>{row.duration}</td>
                <td>
                  <span className={`table-status ${row.statusClass}`}>
                    <Icon name={row.icon} />
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatTime(value) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function formatMinutes(minutes = 0) {
  if (!minutes) return "0 phút";
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!hours) return `${remaining} phút`;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}

export function ShiftSummary({ attendanceSummary, todayAttendance }) {
  const activeShift =
    todayAttendance?.status && todayAttendance.status !== "NOT_CHECKED_IN"
      ? todayAttendance
      : attendanceSummary?.active_shift || null;
  const isCheckedIn = activeShift?.status === "CHECKED_IN";
  const totalMinutes = activeShift?.total_minutes ?? Math.round((activeShift?.total_hours || 0) * 60);

  return (
    <section className="shift-panel">
      <h3>Thống kê ca làm</h3>
      {activeShift ? (
        <>
          <div className="mini-stats">
            <div>
              <span>Thời gian hôm nay</span>
              <strong>{isCheckedIn ? "Đang tính" : formatMinutes(totalMinutes)}</strong>
            </div>
            <div>
              <span>Tổng giờ kỳ này</span>
              <strong className="text-green">{attendanceSummary?.total_hours ?? 0}h</strong>
            </div>
          </div>
          <div className="checkin-card">
            <div>
              <span>Vào ca lúc</span>
              <strong>{formatTime(activeShift.check_in_time || activeShift.check_in_at)}</strong>
            </div>
            <Icon name="schedule" />
          </div>
        </>
      ) : (
        <div className="state-box">
          <div>
            <strong>Chưa vào ca</strong>
            <p>Bấm Vào ca ở trang chấm công để bắt đầu ghi nhận thời gian làm việc.</p>
          </div>
        </div>
      )}
    </section>
  );
}

export function QuickNote({ job, onSaved }) {
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setNote(job?.staffNotes || "");
    setMessage("");
    setError("");
  }, [job?.id, job?.staffNotes]);

  const handleSave = async () => {
    setMessage("");
    setError("");

    if (!job) {
      setError("Chua co cong viec de ghi chu.");
      return;
    }

    if (!note.trim()) {
      setError("Vui long nhap ghi chu truoc khi luu.");
      return;
    }

    setSaving(true);
    try {
      await saveStaffAppointmentNote(getJobRouteId(job), note.trim());
      setMessage("Da luu ghi chu ky thuat.");
      onSaved?.();
      window.setTimeout(() => setMessage(""), 2200);
    } catch (err) {
      setError(err.message || "Khong the luu ghi chu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel">
      <h3>
        <Icon name="edit_note" />
        Ghi chu ky thuat
      </h3>
      <label htmlFor="technical-note">Ghi chu nhanh</label>
      <textarea
        disabled={!job || saving}
        id="technical-note"
        onChange={(event) => setNote(event.target.value)}
        placeholder={job ? "Nhap tinh trang xe, khuyen nghi thay the hoac luu y cho quan ly..." : "Chua co cong viec dang lam hoac duoc giao."}
        value={note}
      />
      {message && <p className="form-message success">{message}</p>}
      {error && <p className="form-message error">{error}</p>}
      <button className="dark-button full" disabled={!job || saving} onClick={handleSave} type="button">
        {saving ? "Dang luu..." : "Luu ghi chu"}
      </button>
    </section>
  );
}
