import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Wrench,
  Users,
  BarChart2,
  Plus,
  HelpCircle,
  Package,
  User,
  Search,
  Bell,
  Shield,
  UserCheck,
  Lock,
  Unlock,
  Ban,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { adminUserService } from "../../services/adminUserService";
import "../../styles/admin/AdminDashboard.css";
import "../../styles/admin/AdminUsers.css";

const ROLE_OPTIONS = [
  ["ADMIN", "Admin"],
  ["MANAGER", "Manager"],
  ["STAFF", "Staff"],
  ["CUSTOMER", "Customer"],
];

const ROLE_PRIORITY = ["ADMIN", "MANAGER", "STAFF", "CUSTOMER"];

const STATUS_LABELS = {
  active: "Đang hoạt động",
  locked: "Đã khóa",
  banned: "Đã ban",
};

function ManagerSidebar({ activeView, onViewChange }) {
  const navItems = [
    ["dashboard", LayoutDashboard, "Tổng quan"],
    ["calendar", Calendar, "Lịch hẹn"],
    ["services", Wrench, "Dịch vụ"],
    ["customers", Users, "Khách hàng"],
    ["users", Shield, "Người dùng"],
    ["inventory", Package, "Kho"],
    ["reports", BarChart2, "Báo cáo"],
    ["profile", User, "Hồ sơ"],
  ];

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-brand">
          <h1>MOTOCORE</h1>
          <p>Quản lý garage</p>
        </div>

        <nav className="sidebar-nav" aria-label="Quản lý garage">
          {navItems.map(([view, Icon, label]) => (
            <a
              className={`nav-item ${activeView === view ? "active" : ""}`}
              href="#"
              key={view}
              onClick={(event) => {
                event.preventDefault();
                onViewChange?.(view);
              }}
            >
              <Icon className="nav-icon" />
              <span>{label}</span>
            </a>
          ))}
        </nav>
      </div>

      <div className="sidebar-footer">
        <button className="btn-primary" type="button" onClick={() => onViewChange?.("calendar")}>
          <Plus className="btn-icon" />
          Đặt lịch mới
        </button>
        <a href="#" className="support-link" onClick={(event) => event.preventDefault()}>
          <HelpCircle className="support-icon" />
          <span>Hỗ trợ</span>
        </a>
      </div>
    </aside>
  );
}

function getPrimaryRole(roles = []) {
  const normalizedRoles = roles
    .map((role) => {
      if (typeof role === "string") return role;
      return role?.role_name || role?.name || "";
    })
    .filter(Boolean)
    .map((role) => role.toUpperCase());

  return ROLE_PRIORITY.find((role) => normalizedRoles.includes(role)) || "CUSTOMER";
}

function getUserStatus(user) {
  if (user.is_active === false) return "banned";

  const lockedUntil = user.account_locked_until ? new Date(user.account_locked_until).getTime() : 0;
  if (lockedUntil && lockedUntil > Date.now()) return "locked";

  return "active";
}

function formatDate(value) {
  if (!value) return "Chưa đăng nhập";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa đăng nhập";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeUser(user) {
  const id = user._id || user.id;
  const role = getPrimaryRole(user.roles);
  const status = getUserStatus(user);

  return {
    id,
    code: `USR-${String(id || "").slice(-6).toUpperCase()}`,
    name: user.full_name || user.fullname || "Chưa có tên",
    email: user.email || "Chưa có email",
    phone: user.phone || "Chưa cập nhật",
    role,
    status,
    verified: Boolean(user.verified),
    lastLogin: formatDate(user.last_login),
  };
}

export default function AdminUsers({ onViewChange }) {
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    role: "all",
    status: "all",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await adminUserService.listUsers({ limit: 100 });
      setUsers((data.users || []).map(normalizeUser));
    } catch (err) {
      setError(err.message || "Không thể tải danh sách người dùng");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const keyword = filters.search.trim().toLowerCase();

    return users.filter((item) => {
      const matchesSearch =
        !keyword ||
        item.name.toLowerCase().includes(keyword) ||
        item.email.toLowerCase().includes(keyword) ||
        item.phone.toLowerCase().includes(keyword) ||
        item.code.toLowerCase().includes(keyword);
      const matchesRole = filters.role === "all" || item.role === filters.role;
      const matchesStatus = filters.status === "all" || item.status === filters.status;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [filters, users]);

  const summary = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((item) => item.status === "active").length,
      restricted: users.filter((item) => item.status !== "active").length,
      staff: users.filter((item) => ["MANAGER", "STAFF"].includes(item.role)).length,
    };
  }, [users]);

  const runAction = async (userId, action) => {
    setBusyId(userId);
    setError("");

    try {
      await action();
      await loadUsers();
    } catch (err) {
      setError(err.message || "Thao tác thất bại");
    } finally {
      setBusyId("");
    }
  };

  const handleRoleChange = (userId, role) => {
    runAction(userId, () => adminUserService.replaceRole(userId, role));
  };

  const handleLockToggle = (user) => {
    if (user.status === "locked") {
      runAction(user.id, () => adminUserService.unlockUser(user.id));
      return;
    }

    if (user.status === "banned") {
      runAction(user.id, () => adminUserService.unbanUser(user.id));
      return;
    }

    runAction(user.id, () => adminUserService.lockUser(user.id));
  };

  const handleBan = (user) => {
    if (!window.confirm(`Ban tài khoản ${user.name}?`)) return;
    runAction(user.id, () => adminUserService.banUser(user.id));
  };

  const handleDelete = (user) => {
    if (!window.confirm(`Xóa vĩnh viễn tài khoản ${user.name}?`)) return;
    runAction(user.id, () => adminUserService.deleteUser(user.id, true));
  };

  return (
    <div className="users-layout dashboard-layout">
      <ManagerSidebar activeView="users" onViewChange={onViewChange} />

      <main className="main-content">
        <header className="users-topbar">
          <div>
            <span>Quản trị tài khoản</span>
            <h2>Người dùng</h2>
          </div>

          <div className="users-topbar-actions">
            <label className="users-search">
              <Search />
              <input
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                type="text"
                placeholder="Tìm tên, email, số điện thoại..."
              />
            </label>
            <button className="users-icon-btn" type="button" onClick={loadUsers} aria-label="Tải lại">
              <RefreshCw />
            </button>
            <button className="users-icon-btn" type="button" aria-label="Thông báo">
              <Bell />
            </button>
          </div>
        </header>

        <div className="users-body">
          <section className="users-command-panel">
            <div className="users-command-copy">
              <span>Quyền truy cập</span>
              <h3>Kiểm soát tài khoản theo vai trò vận hành</h3>
              <p>Đổi role cho nhân sự, khóa tạm thời khi cần xác minh, hoặc ban/xóa tài khoản không còn hợp lệ.</p>
            </div>

            <div className="users-summary-strip" aria-label="Tổng hợp người dùng">
              <div>
                <small>Tổng</small>
                <strong>{summary.total}</strong>
              </div>
              <div>
                <small>Hoạt động</small>
                <strong>{summary.active}</strong>
              </div>
              <div>
                <small>Chặn / ban</small>
                <strong>{summary.restricted}</strong>
              </div>
              <div>
                <small>Nhân sự</small>
                <strong>{summary.staff}</strong>
              </div>
            </div>
          </section>

          <section className="user-filter-panel">
            <select
              value={filters.role}
              onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}
            >
              <option value="all">Tất cả vai trò</option>
              {ROLE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="locked">Đã khóa</option>
              <option value="banned">Đã ban</option>
            </select>
          </section>

          {error && <div className="users-message error">{error}</div>}

          <section className="user-table-card">
            <div className="user-table-header">
              <span>Người dùng</span>
              <span>Liên hệ</span>
              <span>Vai trò</span>
              <span>Trạng thái</span>
              <span>Đăng nhập gần nhất</span>
              <span>Thao tác</span>
            </div>

            <div className="user-table-body">
              {loading && <div className="users-empty">Đang tải danh sách người dùng...</div>}

              {!loading && filteredUsers.length === 0 && (
                <div className="users-empty">Không có người dùng phù hợp bộ lọc.</div>
              )}

              {!loading && filteredUsers.map((item) => {
                const isAdmin = item.role === "ADMIN";
                const isBusy = busyId === item.id;

                return (
                  <article className="user-table-row" key={item.id}>
                    <div className="user-name-cell">
                      <div className="user-avatar">{item.name.charAt(0)}</div>
                      <div>
                        <strong>{item.name}</strong>
                        <p>{item.code}{item.verified ? " · đã xác thực" : " · chưa xác thực"}</p>
                      </div>
                    </div>
                    <div className="user-contact-cell">
                      <strong>{item.email}</strong>
                      <p>{item.phone}</p>
                    </div>
                    <select
                      className="user-role-select"
                      value={item.role}
                      disabled={isAdmin || isBusy}
                      onChange={(event) => handleRoleChange(item.id, event.target.value)}
                    >
                      {ROLE_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <span className={`user-status ${item.status}`}>{STATUS_LABELS[item.status]}</span>
                    <span className="user-last-login">{item.lastLogin}</span>
                    <div className="user-actions">
                      <button
                        disabled={isAdmin || isBusy}
                        type="button"
                        title={item.status === "active" ? "Khóa tài khoản" : "Mở khóa / gỡ ban"}
                        onClick={() => handleLockToggle(item)}
                      >
                        {item.status === "active" ? <Lock size={16} /> : <Unlock size={16} />}
                      </button>
                      <button disabled={isAdmin || isBusy} type="button" title="Ban tài khoản" onClick={() => handleBan(item)}>
                        <Ban size={16} />
                      </button>
                      <button className="danger" disabled={isAdmin || isBusy} type="button" title="Xóa người dùng" onClick={() => handleDelete(item)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
