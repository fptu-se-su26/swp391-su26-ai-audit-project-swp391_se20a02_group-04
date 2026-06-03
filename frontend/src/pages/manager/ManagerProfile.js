import React, { useState, useEffect } from "react";
import {
  User,
  Lock,
  Bell,
  Activity,
  Mail,
  Phone,
  MapPin,
  Save,
  Eye,
  EyeOff,
  Check,
  Shield,
  Camera,
  Calendar,
  Users,
  Wrench,
  Settings
} from "lucide-react";
import "../../styles/manager/ManagerProfile.css";
import { profileService } from "../../services/profileService";

const activityLogs = [
  {
    id: 1,
    action: "Phân công KTV Thắng",
    target: "Bảo dưỡng BMW R1250GS (#MC-99281)",
    time: "10 phút trước",
    icon: Users,
    color: "log-green",
  },
  {
    id: 2,
    action: "Xác nhận lịch hẹn #MC-99275",
    target: "Khách hàng: Trần Thị Hồng • Ducati Panigale V4",
    time: "30 phút trước",
    icon: Calendar,
    color: "log-blue",
  },
  {
    id: 3,
    action: "Điều chỉnh trạng thái Kệ 04",
    target: "Hoàng Kim Sơn tiếp quản kệ sửa chữa",
    time: "1 giờ trước",
    icon: Wrench,
    color: "log-orange",
  },
  {
    id: 4,
    action: "Cập nhật lịch trực tuần mới",
    target: "Phân bổ 4 kỹ thuật viên chính ca sáng",
    time: "Hôm qua",
    icon: Settings,
    color: "log-purple",
  },
];

const ManagerProfile = () => {
  const [activeTab, setActiveTab] = useState("info");
  const [isSaving, setIsSaving] = useState(false);
  const [isUsingMock, setIsUsingMock] = useState(false);

  // Profile Info State
  const [profile, setProfile] = useState({
    fullname: "Nguyễn Văn Nam",
    email: "nam.nguyen@motocore.vn",
    phone: "0901 234 567",
    branch: "Cơ sở Cầu Giấy - Hà Nội",
    role: "Quản lý Cửa hàng (Store Manager)",
    joinedDate: "10/02/2024",
    bio: "Hơn 5 năm kinh nghiệm quản lý vận hành dịch vụ sửa chữa mô tô phân khối lớn. Luôn cam kết chất lượng dịch vụ tốt nhất.",
    avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%23fff7ed"/><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="%23ff6b00"/></svg>',
  });

  useEffect(() => {
    const fetchManagerData = async () => {
      try {
        const res = await profileService.getMe();
        if (res && res.success && res.data) {
          const apiUser = res.data.user || res.data;
          setProfile((prev) => ({
            ...prev,
            fullname: apiUser.full_name || apiUser.fullname || prev.fullname,
            email: apiUser.email || prev.email,
            phone: apiUser.phone || prev.phone,
          }));
          setIsUsingMock(false);
        }
      } catch (err) {
        console.log("Could not load API manager profile, using default data:", err.message);
        setIsUsingMock(true);
      }
    };
    fetchManagerData();
  }, []);

  // Password State
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  // Show/Hide Password State
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Notifications Toggle State
  const [notifications, setNotifications] = useState({
    bookingEmail: true,
    weeklyReport: true,
    staffAlert: false,
  });

  // Toast Notification State
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 3000);
  };

  const handleInfoChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
  };

  const toggleShowPassword = (field) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleNotificationToggle = (field) => {
    setNotifications((prev) => {
      const updated = { ...prev, [field]: !prev[field] };
      showToast("Cập nhật cấu hình thông báo thành công!");
      return updated;
    });
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (!profile.fullname.trim() || !profile.email.trim() || !profile.phone.trim()) {
      showToast("Vui lòng điền đầy đủ các thông tin bắt buộc!", "error");
      return;
    }

    setIsSaving(true);
    try {
      if (!isUsingMock) {
        await profileService.updateProfile({
          fullname: profile.fullname,
          phone: profile.phone
        });
      }
      setTimeout(() => {
        setIsSaving(false);
        showToast("Đã lưu thông tin hồ sơ thành công!");
      }, 800);
    } catch (err) {
      setIsSaving(false);
      showToast(err.message || "Không thể cập nhật hồ sơ!", "error");
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      showToast("Vui lòng nhập đầy đủ các trường mật khẩu!", "error");
      return;
    }

    if (passwords.new.length < 6) {
      showToast("Mật khẩu mới phải có tối thiểu 6 ký tự!", "error");
      return;
    }

    if (passwords.new !== passwords.confirm) {
      showToast("Mật khẩu xác nhận không trùng khớp!", "error");
      return;
    }

    setIsSaving(true);
    try {
      if (!isUsingMock) {
        await profileService.changePassword({
          current: passwords.current,
          new: passwords.new
        });
      }
      setTimeout(() => {
        setIsSaving(false);
        showToast("Đã thay đổi mật khẩu tài khoản thành công!");
        setPasswords({ current: "", new: "", confirm: "" });
      }, 800);
    } catch (err) {
      setIsSaving(false);
      showToast(err.message || "Lỗi thay đổi mật khẩu!", "error");
    }
  };

  const handleAvatarClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
          setProfile((prev) => ({ ...prev, avatar: readerEvent.target.result }));
          showToast("Đã cập nhật ảnh đại diện thành công!");
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  return (
    <>
      {/* Toast Notification */}
      {toast.show && (
        <div className={`custom-toast ${toast.type}`}>
          <div className="toast-content">
            <div className="toast-icon-wrapper">
              <Check className="toast-icon" />
            </div>
            <p>{toast.message}</p>
          </div>
        </div>
      )}

      <div className="page-header-row">
        <div>
          <h2 className="page-title">Hồ sơ Quản lý</h2>
          <p className="page-subtitle">Quản lý thông tin tài khoản cá nhân và cấu hình bảo mật.</p>
        </div>
      </div>

      <div className="profile-grid">
        {/* Left Card: Overview */}
        <div className="overview-card">
          <div className="avatar-section">
            <div className="avatar-large-container">
              <img src={profile.avatar} alt="Avatar" className="avatar-large" />
              <button className="avatar-overlay" onClick={handleAvatarClick} title="Thay ảnh đại diện">
                <Camera size={18} />
              </button>
            </div>
            <h3 className="admin-name">{profile.fullname}</h3>
            <span className="role-badge">
              <Shield size={12} className="mr-1" /> {profile.role}
            </span>
            <p className="admin-meta">Ngày tham gia: {profile.joinedDate}</p>
          </div>

          <div className="overview-divider" />

          <div className="stats-mini-grid">
            <div className="stat-mini">
              <span className="stat-label">Hiệu suất</span>
              <span className="stat-value text-green">A+</span>
            </div>
            <div className="stat-mini">
              <span className="stat-label">Phân công</span>
              <span className="stat-value text-orange">348 ca</span>
            </div>
            <div className="stat-mini">
              <span className="stat-label">Chi nhánh</span>
              <span className="stat-value">Hà Nội</span>
            </div>
          </div>

          <div className="bio-section">
            <h4>Giới thiệu</h4>
            <p>{profile.bio}</p>
          </div>
        </div>

        {/* Right Card: Tabs */}
        <div className="tabs-container">
          <div className="tabs-header">
            <button
              className={`tab-btn ${activeTab === "info" ? "active" : ""}`}
              onClick={() => setActiveTab("info")}
            >
              <User size={16} />
              <span>Thông tin cá nhân</span>
            </button>
            <button
              className={`tab-btn ${activeTab === "password" ? "active" : ""}`}
              onClick={() => setActiveTab("password")}
            >
              <Lock size={16} />
              <span>Bảo mật</span>
            </button>
            <button
              className={`tab-btn ${activeTab === "notifications" ? "active" : ""}`}
              onClick={() => setActiveTab("notifications")}
            >
              <Bell size={16} />
              <span>Cài đặt thông báo</span>
            </button>
            <button
              className={`tab-btn ${activeTab === "logs" ? "active" : ""}`}
              onClick={() => setActiveTab("logs")}
            >
              <Activity size={16} />
              <span>Nhật ký hoạt động</span>
            </button>
          </div>

          <div className="tabs-content">
            {activeTab === "info" && (
              <form onSubmit={handleSaveInfo} className="tab-pane">
                <div className="section-title-inside">
                  <h3>Cập nhật thông tin</h3>
                  <p>Quản lý thông tin liên hệ và giới thiệu bản thân hiển thị trên hệ thống.</p>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="fullname">Họ và tên *</label>
                    <div className="input-with-icon">
                      <User size={16} className="input-icon" />
                      <input
                        type="text"
                        id="fullname"
                        name="fullname"
                        value={profile.fullname}
                        onChange={handleInfoChange}
                        placeholder="Họ và tên"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email liên hệ *</label>
                    <div className="input-with-icon">
                      <Mail size={16} className="input-icon" />
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={profile.email}
                        onChange={handleInfoChange}
                        placeholder="Email"
                        disabled
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Số điện thoại *</label>
                    <div className="input-with-icon">
                      <Phone size={16} className="input-icon" />
                      <input
                        type="text"
                        id="phone"
                        name="phone"
                        value={profile.phone}
                        onChange={handleInfoChange}
                        placeholder="Số điện thoại"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="branch">Chi nhánh phụ trách</label>
                    <div className="input-with-icon">
                      <MapPin size={16} className="input-icon" />
                      <input
                        type="text"
                        id="branch"
                        name="branch"
                        value={profile.branch}
                        onChange={handleInfoChange}
                        placeholder="Chi nhánh"
                        disabled
                      />
                    </div>
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="bio">Mô tả giới thiệu</label>
                    <textarea
                      id="bio"
                      name="bio"
                      value={profile.bio}
                      onChange={handleInfoChange}
                      rows={4}
                      placeholder="Mô tả giới thiệu về kinh nghiệm, phong cách làm việc..."
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-save" disabled={isSaving}>
                    <Save size={16} />
                    {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            )}

            {activeTab === "password" && (
              <form onSubmit={handleSavePassword} className="tab-pane">
                <div className="section-title-inside">
                  <h3>Đổi mật khẩu tài khoản</h3>
                  <p>Mật khẩu mới cần tối thiểu 6 ký tự để duy trì độ bảo mật cao.</p>
                </div>

                <div className="form-column">
                  <div className="form-group">
                    <label htmlFor="current">Mật khẩu hiện tại *</label>
                    <div className="input-with-icon">
                      <Lock size={16} className="input-icon" />
                      <input
                        type={showPassword.current ? "text" : "password"}
                        id="current"
                        name="current"
                        value={passwords.current}
                        onChange={handlePasswordChange}
                        placeholder="Mật khẩu hiện tại"
                      />
                      <button
                        type="button"
                        className="btn-toggle-eye"
                        onClick={() => toggleShowPassword("current")}
                      >
                        {showPassword.current ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="new">Mật khẩu mới *</label>
                    <div className="input-with-icon">
                      <Lock size={16} className="input-icon" />
                      <input
                        type={showPassword.new ? "text" : "password"}
                        id="new"
                        name="new"
                        value={passwords.new}
                        onChange={handlePasswordChange}
                        placeholder="Mật khẩu mới"
                      />
                      <button
                        type="button"
                        className="btn-toggle-eye"
                        onClick={() => toggleShowPassword("new")}
                      >
                        {showPassword.new ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirm">Xác nhận mật khẩu mới *</label>
                    <div className="input-with-icon">
                      <Lock size={16} className="input-icon" />
                      <input
                        type={showPassword.confirm ? "text" : "password"}
                        id="confirm"
                        name="confirm"
                        value={passwords.confirm}
                        onChange={handlePasswordChange}
                        placeholder="Xác nhận mật khẩu mới"
                      />
                      <button
                        type="button"
                        className="btn-toggle-eye"
                        onClick={() => toggleShowPassword("confirm")}
                      >
                        {showPassword.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-save" disabled={isSaving}>
                    <Save size={16} />
                    {isSaving ? "Đang lưu..." : "Cập nhật mật khẩu"}
                  </button>
                </div>
              </form>
            )}

            {activeTab === "notifications" && (
              <div className="tab-pane">
                <div className="section-title-inside">
                  <h3>Cấu hình nhận thông báo</h3>
                  <p>Lựa chọn hình thức nhận các cập nhật vận hành từ hệ thống.</p>
                </div>

                <div className="toggles-list">
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <h4>Thông báo Email đặt lịch</h4>
                      <p>Nhận email tự động khi có khách hàng đặt lịch hẹn mới tại cửa hàng.</p>
                    </div>
                    <button
                      className={`switch-btn ${notifications.bookingEmail ? "checked" : ""}`}
                      onClick={() => handleNotificationToggle("bookingEmail")}
                    >
                      <span className="switch-thumb" />
                    </button>
                  </div>

                  <div className="toggle-item">
                    <div className="toggle-info">
                      <h4>Thống kê báo cáo doanh thu tuần</h4>
                      <p>Gửi tóm tắt báo cáo doanh thu và hiệu suất kỹ thuật viên vào sáng thứ hai hàng tuần.</p>
                    </div>
                    <button
                      className={`switch-btn ${notifications.weeklyReport ? "checked" : ""}`}
                      onClick={() => handleNotificationToggle("weeklyReport")}
                    >
                      <span className="switch-thumb" />
                    </button>
                  </div>

                  <div className="toggle-item">
                    <div className="toggle-info">
                      <h4>Cảnh báo điểm danh & chuyên cần</h4>
                      <p>Cảnh báo ngay lập tức nếu KTV trễ ca trực hoặc thiếu nhân sự trong khung giờ cao điểm.</p>
                    </div>
                    <button
                      className={`switch-btn ${notifications.staffAlert ? "checked" : ""}`}
                      onClick={() => handleNotificationToggle("staffAlert")}
                    >
                      <span className="switch-thumb" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "logs" && (
              <div className="tab-pane">
                <div className="section-title-inside">
                  <h3>Nhật ký hoạt động gần đây</h3>
                  <p>Danh sách các hoạt động quản lý được ghi lại trên tài khoản của bạn.</p>
                </div>

                <div className="timeline">
                  {activityLogs.map((log) => {
                    const LogIcon = log.icon;
                    return (
                      <div className="timeline-item" key={log.id}>
                        <div className={`timeline-badge ${log.color}`}>
                          <LogIcon size={16} />
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-header-row">
                            <h4>{log.action}</h4>
                            <span className="timeline-time">{log.time}</span>
                          </div>
                          <p className="timeline-desc">{log.target}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ManagerProfile;
