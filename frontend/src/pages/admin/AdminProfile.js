import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  User,
  Camera,
  Lock,
  Mail,
  Phone,
  Save,
  Eye,
  EyeOff,
  Check,
  Shield,
  Activity,
  AlertCircle,
  RefreshCw,
  X,
  BadgeCheck,
} from "lucide-react";
import AdminSidebar from "../../components/AdminSidebar";
import { profileService } from "../../services/profileService";
import { getAuthSession } from "../../services/authApi";
import "../../styles/admin/AdminDashboard.css";
import "../../styles/admin/AdminProfile.css";

const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%23fff7ed"/><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="%23e4282b"/></svg>';

const ACTION_LABELS = {
  PROFILE_UPDATE: "Cập nhật hồ sơ",
  PASSWORD_CHANGE: "Đổi mật khẩu",
  LOGIN: "Đăng nhập",
  LOGOUT: "Đăng xuất",
  LOGIN_FAILED: "Đăng nhập thất bại",
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRoleLabel(roles = []) {
  const names = roles
    .map((role) => (typeof role === "string" ? role : role?.name || role?.role_name || ""))
    .filter(Boolean)
    .map((role) => role.toUpperCase());

  if (names.includes("ADMIN")) return "Quản trị viên";
  if (names.includes("MANAGER")) return "Quản lý garage";
  if (names.includes("STAFF")) return "Nhân viên kỹ thuật";
  return "Người dùng";
}

function normalizePhone(value = "") {
  return String(value).replace(/\s+/g, "").trim();
}

export default function AdminProfile({ onViewChange }) {
  const [activeTab, setActiveTab] = useState("info");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [roles, setRoles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [profile, setProfile] = useState({
    fullname: "",
    email: "",
    phone: "",
    bio: "",
    avatar: DEFAULT_AVATAR,
    joinedDate: "",
    lastLogin: "",
    verified: false,
  });

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3200);
  };

  const applyUser = useCallback((apiUser = {}, apiRoles = []) => {
    setRoles(apiRoles);
    setProfile({
      fullname: apiUser.full_name || apiUser.fullname || "",
      email: apiUser.email || "",
      phone: apiUser.phone || "",
      bio: apiUser.specialization || "",
      avatar: apiUser.avatar_url || DEFAULT_AVATAR,
      joinedDate: formatDate(apiUser.created_at),
      lastLogin: formatDateTime(apiUser.last_login),
      verified: Boolean(apiUser.verified),
    });
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await profileService.getMe();
      const apiUser = res.data?.user || res.user || {};
      const apiRoles = res.data?.roles || res.roles || getAuthSession().roles || [];
      applyUser(apiUser, apiRoles);
    } catch (err) {
      setError(err.message || "Không thể tải hồ sơ");
    } finally {
      setLoading(false);
    }
  }, [applyUser]);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await profileService.getActivityLogs(1, 20);
      setLogs(res.data?.logs || res.logs || []);
    } catch (err) {
      setLogs([]);
      if (activeTab === "logs") {
        showToast(err.message || "Không tải được nhật ký", "error");
      }
    } finally {
      setLogsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (activeTab === "logs") loadLogs();
  }, [activeTab, loadLogs]);

  const roleLabel = useMemo(() => getRoleLabel(roles), [roles]);

  const passwordStrength = useMemo(() => {
    const value = passwords.new || "";
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/[a-z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[@$!%*?&#]/.test(value)) score += 1;
    return score;
  }, [passwords.new]);

  const handleInfoChange = (event) => {
    const { name, value } = event.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveInfo = async (event) => {
    event.preventDefault();
    const phone = normalizePhone(profile.phone);

    if (!profile.fullname.trim() || !phone) {
      showToast("Vui lòng nhập họ tên và số điện thoại.", "error");
      return;
    }

    if (!/^(0|\+84)[0-9]{9,10}$/.test(phone)) {
      showToast("Số điện thoại không hợp lệ (VD: 0901234567).", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await profileService.updateProfile({
        fullname: profile.fullname.trim(),
        phone,
        bio: profile.bio.trim(),
        avatar:
          profile.avatar?.startsWith("data:image/") || profile.avatar?.startsWith("http")
            ? profile.avatar
            : undefined,
      });

      const apiUser = res.data?.user || {};
      applyUser(apiUser, roles);

      const sessionUser = getAuthSession().user || {};
      localStorage.setItem(
        "authUser",
        JSON.stringify({
          ...sessionUser,
          ...apiUser,
          full_name: apiUser.full_name || profile.fullname,
          phone: apiUser.phone || phone,
        })
      );

      showToast("Đã lưu hồ sơ thành công.");
    } catch (err) {
      showToast(err.message || "Không thể cập nhật hồ sơ.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async (event) => {
    event.preventDefault();

    if (!passwords.current || !passwords.new || !passwords.confirm) {
      showToast("Vui lòng nhập đầy đủ mật khẩu.", "error");
      return;
    }

    if (passwords.new !== passwords.confirm) {
      showToast("Mật khẩu xác nhận không khớp.", "error");
      return;
    }

    if (passwordStrength < 5) {
      showToast(
        "Mật khẩu mới cần tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt (@$!%*?&#).",
        "error"
      );
      return;
    }

    setSaving(true);
    try {
      await profileService.changePassword({
        current: passwords.current,
        new: passwords.new,
        confirm: passwords.confirm,
      });
      setPasswords({ current: "", new: "", confirm: "" });
      showToast("Đã đổi mật khẩu thành công.");
    } catch (err) {
      showToast(err.message || "Không thể đổi mật khẩu.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 900 * 1024) {
        showToast("Ảnh đại diện nên nhỏ hơn 900KB.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        setProfile((prev) => ({ ...prev, avatar: readerEvent.target.result }));
        showToast("Ảnh đã chọn. Nhấn Lưu thay đổi để cập nhật.", "success");
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <div className="profile-layout dashboard-layout">
      {toast.show && (
        <div className={`profile-toast ${toast.type}`}>
          {toast.type === "error" ? <AlertCircle size={16} /> : <Check size={16} />}
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast({ show: false, message: "", type: "success" })}>
            <X size={14} />
          </button>
        </div>
      )}

      <AdminSidebar activeView="profile" onViewChange={onViewChange} />

      <main className="main-content">
        <header className="profile-topbar">
          <div>
            <span>Tài khoản quản trị</span>
            <h2>Hồ sơ</h2>
          </div>
          <button className="profile-icon-btn" type="button" onClick={loadProfile} aria-label="Tải lại">
            <RefreshCw size={16} className={loading ? "is-spinning" : ""} />
          </button>
        </header>

        <div className="profile-body">
          {error && (
            <div className="profile-error">
              <AlertCircle size={16} />
              <span>{error}</span>
              <button type="button" onClick={loadProfile}>
                Thử lại
              </button>
            </div>
          )}

          <section className="profile-identity-card">
            <div className="profile-identity-main">
              <div className="profile-avatar-wrap">
                <img src={profile.avatar || DEFAULT_AVATAR} alt={profile.fullname || "Avatar"} />
                <button type="button" className="profile-avatar-btn" onClick={handleAvatarClick} title="Đổi ảnh">
                  <Camera size={15} />
                </button>
              </div>

              <div className="profile-identity-copy">
                <h3>{loading ? "Đang tải..." : profile.fullname || "Chưa có tên"}</h3>
                <div className="profile-identity-tags">
                  <span className="profile-role-badge">
                    <Shield size={12} /> {roleLabel}
                  </span>
                  <span className={`profile-verify-badge ${profile.verified ? "ok" : "warn"}`}>
                    <BadgeCheck size={12} />
                    {profile.verified ? "Email đã xác thực" : "Email chưa xác thực"}
                  </span>
                </div>
                <p>{profile.bio || "Chưa có giới thiệu chuyên môn."}</p>
              </div>
            </div>

            <div className="profile-identity-stats" aria-label="Thông tin tài khoản">
              <div>
                <small>Email</small>
                <strong title={profile.email}>{profile.email || "—"}</strong>
              </div>
              <div>
                <small>Thành viên từ</small>
                <strong>{profile.joinedDate}</strong>
              </div>
              <div>
                <small>Đăng nhập gần nhất</small>
                <strong>{profile.lastLogin}</strong>
              </div>
            </div>
          </section>

          <section className="profile-panel">
            <div className="profile-tabs">
              {[
                ["info", User, "Thông tin"],
                ["password", Lock, "Bảo mật"],
                ["logs", Activity, "Nhật ký"],
              ].map(([key, Icon, label]) => (
                <button
                  key={key}
                  type="button"
                  className={activeTab === key ? "active" : ""}
                  onClick={() => setActiveTab(key)}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            <div className="profile-panel-body">
              {activeTab === "info" && (
                <form className="profile-form" onSubmit={handleSaveInfo}>
                  <div className="profile-section-title">
                    <h3>Cập nhật thông tin</h3>
                    <p>Chỉnh sửa thông tin hiển thị trên hệ thống MOTOCORE.</p>
                  </div>

                  <div className="profile-form-grid">
                    <label className="profile-field">
                      <span>Họ và tên *</span>
                      <div className="profile-input">
                        <User size={15} />
                        <input
                          name="fullname"
                          value={profile.fullname}
                          onChange={handleInfoChange}
                          placeholder="Nhập họ và tên"
                          disabled={loading || saving}
                        />
                      </div>
                    </label>

                    <label className="profile-field">
                      <span>Email</span>
                      <div className="profile-input is-readonly">
                        <Mail size={15} />
                        <input value={profile.email} readOnly />
                      </div>
                    </label>

                    <label className="profile-field">
                      <span>Số điện thoại *</span>
                      <div className="profile-input">
                        <Phone size={15} />
                        <input
                          name="phone"
                          value={profile.phone}
                          onChange={handleInfoChange}
                          placeholder="0901234567"
                          disabled={loading || saving}
                        />
                      </div>
                    </label>

                    <label className="profile-field full">
                      <span>Giới thiệu / chuyên môn</span>
                      <textarea
                        name="bio"
                        value={profile.bio}
                        onChange={handleInfoChange}
                        rows={4}
                        placeholder="Mô tả ngắn về vai trò và kinh nghiệm của bạn..."
                        disabled={loading || saving}
                        maxLength={120}
                      />
                      <em>{profile.bio.length}/120</em>
                    </label>
                  </div>

                  <div className="profile-form-actions">
                    <button type="submit" className="profile-save-btn" disabled={loading || saving}>
                      <Save size={15} />
                      {saving ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === "password" && (
                <form className="profile-form" onSubmit={handleSavePassword}>
                  <div className="profile-section-title">
                    <h3>Đổi mật khẩu</h3>
                    <p>Mật khẩu tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.</p>
                  </div>

                  <div className="profile-form-column">
                    {[
                      ["current", "Mật khẩu hiện tại"],
                      ["new", "Mật khẩu mới"],
                      ["confirm", "Xác nhận mật khẩu mới"],
                    ].map(([name, label]) => (
                      <label className="profile-field" key={name}>
                        <span>{label} *</span>
                        <div className="profile-input">
                          <Lock size={15} />
                          <input
                            type={showPassword[name] ? "text" : "password"}
                            name={name}
                            value={passwords[name]}
                            onChange={handlePasswordChange}
                            placeholder={label}
                            disabled={saving}
                          />
                          <button
                            type="button"
                            className="profile-eye-btn"
                            onClick={() =>
                              setShowPassword((prev) => ({ ...prev, [name]: !prev[name] }))
                            }
                          >
                            {showPassword[name] ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </label>
                    ))}

                    <div className="password-strength">
                      <div className={`bar level-${passwordStrength}`} />
                      <small>
                        Độ mạnh:{" "}
                        {passwordStrength < 3 ? "Yếu" : passwordStrength < 5 ? "Trung bình" : "Mạnh"}
                      </small>
                    </div>
                  </div>

                  <div className="profile-form-actions">
                    <button type="submit" className="profile-save-btn" disabled={saving}>
                      <Save size={15} />
                      {saving ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === "logs" && (
                <div className="profile-form">
                  <div className="profile-section-title">
                    <h3>Nhật ký hoạt động</h3>
                    <p>Các thao tác gần đây của tài khoản này trên hệ thống.</p>
                  </div>

                  {logsLoading && <p className="profile-empty">Đang tải nhật ký...</p>}

                  {!logsLoading && logs.length === 0 && (
                    <div className="profile-empty-state">
                      <Activity size={22} />
                      <p>Chưa có nhật ký hoạt động.</p>
                    </div>
                  )}

                  <div className="profile-timeline">
                    {!logsLoading &&
                      logs.map((log) => (
                        <article
                          key={log._id || `${log.action}-${log.created_at}`}
                          className="profile-log-item"
                        >
                          <div className={`profile-log-dot ${String(log.status || "").toLowerCase()}`} />
                          <div>
                            <div className="profile-log-head">
                              <strong>{ACTION_LABELS[log.action] || log.action || "Hoạt động"}</strong>
                              <span>{formatDateTime(log.created_at)}</span>
                            </div>
                            <p>
                              Trạng thái: {log.status === "SUCCESS" ? "Thành công" : log.status || "—"}
                              {log.ip_address ? ` · IP ${log.ip_address}` : ""}
                            </p>
                          </div>
                        </article>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
