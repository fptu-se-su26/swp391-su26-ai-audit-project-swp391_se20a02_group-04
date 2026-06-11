import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { clearAuthSession, getAuthSession } from "../../services/authApi";

export function Icon({ name, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

export function Sidebar() {
  const navigate = useNavigate();
  const { user } = getAuthSession();
  const navItems = [
    { icon: "dashboard", label: "Tổng quan", to: "/staff/dashboard" },
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
  return (
    <header className="topbar">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {actions && (
        <div className="topbar-actions">
          <Link className="secondary-button large" to="/staff/attendance">
            <Icon name="logout" />
            Kết thúc ca
          </Link>
          <Link className="primary-button large" to="/staff/attendance">
            <Icon name="login" />
            Vào ca
          </Link>
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

function getPrimaryAction(job) {
  if (job.statusKey === "assigned") {
    return { label: "Bắt đầu", to: `/staff/jobs/${job.id}/start`, className: "primary-button" };
  }

  if (job.statusKey === "in_progress") {
    return { label: "Hoàn thành", to: `/staff/jobs/${job.id}/complete`, className: "primary-button success" };
  }

  return { label: "Chi tiết", to: `/staff/jobs/${job.id}`, className: "primary-button dark" };
}

function getSecondaryAction(job) {
  if (job.statusKey === "in_progress") {
    return { label: "Thêm vật tư", to: `/staff/jobs/${job.id}/materials` };
  }

  return { label: "Chi tiết", to: `/staff/jobs/${job.id}` };
}

export function JobCard({ job, compact = false }) {
  const primaryAction = getPrimaryAction(job);
  const secondaryAction = getSecondaryAction(job);

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

export function QuickNote() {
  const [note, setNote] = useState(localStorage.getItem("staffQuickNote") || "");
  const [message, setMessage] = useState("");

  const handleSave = () => {
    localStorage.setItem("staffQuickNote", note);
    setMessage("Đã lưu ghi chú nhanh trên trình duyệt.");
    window.setTimeout(() => setMessage(""), 2200);
  };

  return (
    <section className="panel">
      <h3>
        <Icon name="edit_note" />
        Ghi chú kỹ thuật
      </h3>
      <label htmlFor="technical-note">Ghi chú nhanh</label>
      <textarea
        id="technical-note"
        onChange={(event) => setNote(event.target.value)}
        placeholder="Nhập tình trạng xe, khuyến nghị thay thế hoặc lưu ý cho quản lý..."
        value={note}
      />
      {message && <p className="form-message success">{message}</p>}
      <button className="dark-button full" onClick={handleSave} type="button">
        Lưu ghi chú
      </button>
    </section>
  );
}
