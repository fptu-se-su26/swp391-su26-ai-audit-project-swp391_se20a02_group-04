import React from "react";
import { NavLink } from "react-router-dom";

export function Icon({ name, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

export function Sidebar() {
  const navItems = [
    { icon: "dashboard", label: "Dashboard", to: "/staff/dashboard" },
    { icon: "assignment", label: "Công việc được giao", to: "/staff/jobs" },
    { icon: "inventory_2", label: "Sử dụng vật tư", to: "/staff/materials" },
    { icon: "schedule", label: "Check in/out", to: "/staff/attendance" },
    { icon: "person", label: "Hồ sơ", to: "/staff/profile" }
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
          <p>Trần Minh Khoa</p>
          <span>ID: ST024</span>
        </div>
        <button className="icon-button" type="button" aria-label="Đăng xuất">
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
          <button className="secondary-button large" type="button">
            <Icon name="logout" />
            Check out
          </button>
          <button className="primary-button large" type="button">
            <Icon name="login" />
            Check in ca
          </button>
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

export function JobCard({ job, compact = false }) {
  const primaryAction = job.actions[1];
  const buttonClass = [
    "primary-button",
    primaryAction === "Hoàn thành" ? "success" : "",
    primaryAction === "Gửi quản lý" ? "dark" : ""
  ].join(" ");

  return (
    <article className={`job-card ${compact ? "compact-card" : ""}`}>
      <div className="job-card-head">
        <div>
          <h4>{job.vehicle} - {job.plate}</h4>
          <span>#{job.id}</span>
        </div>
        <span className={`status-pill ${job.statusClass}`}>{job.status}</span>
      </div>

      <div className="job-info">
        <div>
          <Icon name="person" />
          <span>{job.customer} - {job.time}</span>
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
        <button className="secondary-button" type="button">{job.actions[0]}</button>
        <button className={buttonClass} type="button">{primaryAction}</button>
      </div>
    </article>
  );
}

export function InventoryAlert({ item }) {
  const urgent = item.stock <= item.min;

  return (
    <article className="inventory-card">
      <div className="inventory-head">
        <span>{item.code}</span>
        <small className={urgent ? "danger" : "warning"}>{item.status}</small>
      </div>
      <h5>{item.name}</h5>
      <p>
        <Icon name="warehouse" />
        Còn {item.stock} {item.unit}, ngưỡng tối thiểu {item.min} {item.unit}
      </p>
      <button className={urgent ? "primary-button full" : "secondary-button full"} type="button">
        {urgent ? "Báo quản lý" : "Xem tồn kho"}
      </button>
    </article>
  );
}

export function WorkHistory({ rows }) {
  return (
    <section className="history-panel">
      <div className="panel-head">
        <h3>Lịch sử công việc 7 ngày</h3>
        <button type="button">Xem tất cả</button>
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
                <td><strong>{row.jobs}</strong></td>
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

export function ShiftSummary() {
  return (
    <section className="shift-panel">
      <h3>Thống kê ca làm</h3>
      <div className="mini-stats">
        <div>
          <span>Thời gian</span>
          <strong>6h 20m</strong>
        </div>
        <div>
          <span>Hiệu suất</span>
          <strong className="text-green">91%</strong>
        </div>
      </div>
      <div className="checkin-card">
        <div>
          <span>Check in lúc</span>
          <strong>07:45 AM</strong>
        </div>
        <Icon name="schedule" />
      </div>
    </section>
  );
}

export function QuickNote() {
  return (
    <section className="panel">
      <h3>
        <Icon name="edit_note" />
        Ghi chú kỹ thuật
      </h3>
      <label htmlFor="technical-note">Ghi chú nhanh</label>
      <textarea id="technical-note" placeholder="Nhập tình trạng xe, khuyến nghị thay thế, hoặc lưu ý cho quản lý..." />
      <button className="dark-button full" type="button">Lưu ghi chú</button>
    </section>
  );
}
