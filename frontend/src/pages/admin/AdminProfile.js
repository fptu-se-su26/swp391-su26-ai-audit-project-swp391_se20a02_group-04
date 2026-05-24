import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Calendar,
  Wrench,
  Users,
  BarChart2,
  Plus,
  HelpCircle,
  Search,
  Bell,
  Settings,
  User,
  Camera,
  Lock,
  Mail,
  Phone,
  MapPin,
  Save,
  Eye,
  EyeOff,
  Check,
  Shield,
  Activity,
  UserCheck,
} from "lucide-react";
import "../../styles/admin/AdminProfile.css";
import { profileService } from "../../services/profileService";

const activityLogs = [
  {
    id: 1,
    action: "Xác nhận lịch hẹn #MC-99275",
    target: "Ducati Panigale V4 • Khách: Trần Thị Hồng",
    time: "14:20 Hôm nay",
    icon: Calendar,
    color: "log-blue",
  },
  {
    id: 2,
    action: "Phân công kỹ thuật viên",
    target: "KTV Thắng đảm nhận BMW R1250GS (#MC-99281)",
    time: "10:15 Hôm nay",
    icon: UserCheck,
    color: "log-green",
  },
  {
    id: 3,
    action: "Cập nhật kho phụ tùng",
    target: "Đã nhập thêm 20 bình Nhớt Motul 300V 10W40",
    time: "Hôm qua - 16:45",
    icon: Wrench,
    color: "log-orange",
  },
  {
    id: 4,
    action: "Thay đổi cài đặt hệ thống",
    target: "Cập nhật thời gian làm việc ngày lễ",
    time: "22/05/2026 - 09:30",
    icon: Settings,
    color: "log-purple",
  },
  {
    id: 5,
    action: "Khởi tạo tài khoản nhân viên mới",
    target: "Đã tạo tài khoản KTV Quốc (Học việc)",
    time: "18/05/2026 - 14:00",
    icon: Users,
    color: "log-teal",
  },
];

const AdminProfile = ({ onViewChange }) => {
  const [activeTab, setActiveTab] = useState("info");
  const [isSaving, setIsSaving] = useState(false);
  const [isUsingMock, setIsUsingMock] = useState(false);

  useEffect(() => {
    const fetchAdminData = async () => {
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
        console.log("Could not load API admin profile, falling back to mock data:", err.message);
        setIsUsingMock(true);
      }
    };
    fetchAdminData();
  }, []);

  // Profile Info State
  const [profile, setProfile] = useState({
    fullname: "Nguyễn Văn A",
    email: "nguyenvana.admin@motocore.vn",
    phone: "0988.777.999",
    branch: "Cơ sở 1 - 268 Cầu Giấy, Hà Nội",
    role: "Quản trị viên cấp cao (Super Admin)",
    joinedDate: "15/01/2024",
    bio: "Hơn 10 năm kinh nghiệm quản lý vận hành garage mô tô phân khối lớn. Đam mê tốc độ và kỹ thuật cơ khí chính xác.",
    avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%23fff7ed"/><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="%23ff6b00"/></svg>',
  });

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
    lowStock: true,
    weeklyReport: false,
    staffAttendance: true,
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
      showToast(`Đã cập nhật cấu hình thông báo thành công!`, "success");
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
      }, 1000);
    } catch (err) {
      setIsSaving(false);
      showToast(err.message || "Không thể cập nhật hồ sơ lên máy chủ!", "error");
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
      }, 1000);
    } catch (err) {
      setIsSaving(false);
      showToast(err.message || "Lỗi thay đổi mật khẩu trên máy chủ!", "error");
    }
  };

  const handleAvatarClick = () => {
    // Simulating file upload trigger
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
    <div className="profile-layout">
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

      {/* Sidebar */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-brand">
            <h1>QUẢN LÝ GARAGE</h1>
            <p>Hệ thống quản lý</p>
          </div>

          <nav className="sidebar-nav">
            <a
              href="#"
              className="nav-item"
              onClick={(event) => {
                event.preventDefault();
                if (onViewChange) onViewChange("dashboard");
              }}
            >
              <LayoutDashboard className="nav-icon" />
              <span>Tổng quan</span>
            </a>
            <a
              href="#"
              className="nav-item"
              onClick={(event) => {
                event.preventDefault();
                if (onViewChange) onViewChange("calendar");
              }}
            >
              <Calendar className="nav-icon" />
              <span>Lịch hẹn</span>
            </a>
            <a href="#" className="nav-item" onClick={(e) => e.preventDefault()}>
              <Wrench className="nav-icon" />
              <span>Dịch vụ</span>
            </a>
            <a href="#" className="nav-item" onClick={(e) => e.preventDefault()}>
              <Users className="nav-icon" />
              <span>Khách hàng</span>
            </a>
            <a href="#" className="nav-item" onClick={(e) => e.preventDefault()}>
              <BarChart2 className="nav-icon" />
              <span>Báo cáo</span>
            </a>
            <a
              href="#"
              className="nav-item active"
              onClick={(event) => {
                event.preventDefault();
                if (onViewChange) onViewChange("profile");
              }}
            >
              <User className="nav-icon" />
              <span>Hồ sơ</span>
            </a>
          </nav>
        </div>

        <div className="sidebar-footer">
          <button className="btn-primary" onClick={() => onViewChange("calendar")}>
            <Plus className="btn-icon" />
            ĐẶT LỊCH MỚI
          </button>
          <a href="#" className="support-link" onClick={(e) => e.preventDefault()}>
            <HelpCircle className="support-icon" />
            <span>Hỗ trợ</span>
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <h2>MOTOCORE</h2>
            <span className="breadcrumb">Hồ sơ quản trị viên</span>
          </div>

          <div className="header-actions">
            <div className="search-container">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="search-input"
                disabled
              />
            </div>
            <div className="header-icons">
              <div className="icon-wrapper">
                <Bell className="header-icon" />
                <span className="badge" />
              </div>
              <Settings className="header-icon active-icon" onClick={() => onViewChange("profile")} />
              <div className="avatar" onClick={() => onViewChange("profile")}>
                <img src={profile.avatar} alt="Ảnh đại diện" />
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="content-body">
          <h2 className="page-title">Hồ sơ cá nhân</h2>

          <div className="profile-grid">
            {/* Left Card: Overview */}
            <div className="overview-card">
              <div className="avatar-section">
                <div className="avatar-large-container">
                  <img src={profile.avatar} alt="Large Avatar" className="avatar-large" />
                  <button className="avatar-overlay" onClick={handleAvatarClick} title="Thay ảnh đại diện">
                    <Camera size={20} />
                  </button>
                </div>
                <h3 className="admin-name">{profile.fullname}</h3>
                <span className="role-badge">
                  <Shield size={12} className="mr-1" /> {profile.role}
                </span>
                <p className="admin-meta">Thành viên từ: {profile.joinedDate}</p>
              </div>

              <div className="overview-divider" />

              <div className="stats-mini-grid">
                <div className="stat-mini">
                  <span className="stat-label">Hoạt động</span>
                  <span className="stat-value text-green">14 Ngày</span>
                </div>
                <div className="stat-mini">
                  <span className="stat-label">Duyệt lịch</span>
                  <span className="stat-value text-orange">186 lần</span>
                </div>
                <div className="stat-mini">
                  <span className="stat-label">Chi nhánh</span>
                  <span className="stat-value">Cầu Giấy</span>
                </div>
              </div>

              <div className="bio-section">
                <h4>Giới thiệu</h4>
                <p>{profile.bio || "Chưa có giới thiệu."}</p>
              </div>
            </div>

            {/* Right Card: Interactive Tabs */}
            <div className="tabs-container">
              {/* Tab Header Navigation */}
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

              {/* Tab Content Panels */}
              <div className="tabs-content">
                {/* Tab 1: Personal Info Form */}
                {activeTab === "info" && (
                  <form onSubmit={handleSaveInfo} className="tab-pane">
                    <div className="section-title-inside">
                      <h3>Cập nhật thông tin</h3>
                      <p>Quản lý và cập nhật thông tin hiển thị trên hệ thống của bạn.</p>
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
                            placeholder="Nhập họ và tên"
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="email">Địa chỉ Email *</label>
                        <div className="input-with-icon">
                          <Mail size={16} className="input-icon" />
                          <input
                            type="email"
                            id="email"
                            name="email"
                            value={profile.email}
                            onChange={handleInfoChange}
                            placeholder="Nhập địa chỉ email"
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
                            placeholder="Nhập số điện thoại"
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="branch">Chi nhánh làm việc</label>
                        <div className="input-with-icon">
                          <MapPin size={16} className="input-icon" />
                          <input
                            type="text"
                            id="branch"
                            name="branch"
                            value={profile.branch}
                            onChange={handleInfoChange}
                            placeholder="Chọn chi nhánh"
                          />
                        </div>
                      </div>

                      <div className="form-group full-width">
                        <label htmlFor="bio">Giới thiệu bản thân</label>
                        <textarea
                          id="bio"
                          name="bio"
                          value={profile.bio}
                          onChange={handleInfoChange}
                          rows={4}
                          placeholder="Viết một vài dòng giới thiệu bản thân..."
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

                {/* Tab 2: Change Password Form */}
                {activeTab === "password" && (
                  <form onSubmit={handleSavePassword} className="tab-pane">
                    <div className="section-title-inside">
                      <h3>Thay đổi mật khẩu</h3>
                      <p>Để đảm bảo an toàn, hãy sử dụng mật khẩu mạnh gồm chữ hoa, chữ thường và chữ số.</p>
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
                            placeholder="Nhập mật khẩu hiện tại"
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
                            placeholder="Tối thiểu 6 ký tự"
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
                            placeholder="Nhập lại mật khẩu mới"
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
                        {isSaving ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                      </button>
                    </div>
                  </form>
                )}

                {/* Tab 3: Notification Toggles */}
                {activeTab === "notifications" && (
                  <div className="tab-pane">
                    <div className="section-title-inside">
                      <h3>Cài đặt thông báo</h3>
                      <p>Chọn các loại cập nhật và cảnh báo bạn muốn nhận qua hệ thống và email.</p>
                    </div>

                    <div className="toggles-list">
                      <div className="toggle-item">
                        <div className="toggle-info">
                          <h4>Email xác nhận lịch đặt mới</h4>
                          <p>Gửi thông báo email tự động mỗi khi có khách hàng đặt lịch hẹn thành công.</p>
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
                          <h4>Cảnh báo phụ tùng sắp hết</h4>
                          <p>Báo cáo tức thời lên màn hình khi phụ tùng trong kho đạt ngưỡng tối thiểu.</p>
                        </div>
                        <button
                          className={`switch-btn ${notifications.lowStock ? "checked" : ""}`}
                          onClick={() => handleNotificationToggle("lowStock")}
                        >
                          <span className="switch-thumb" />
                        </button>
                      </div>

                      <div className="toggle-item">
                        <div className="toggle-info">
                          <h4>Báo cáo doanh thu & hiệu suất hàng tuần</h4>
                          <p>Gửi file thống kê Excel chi tiết vào mỗi sáng thứ Hai hàng tuần.</p>
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
                          <h4>Báo cáo điểm danh nhân viên</h4>
                          <p>Thông báo khi kỹ thuật viên và nhân sự vào ca/tan ca muộn.</p>
                        </div>
                        <button
                          className={`switch-btn ${notifications.staffAttendance ? "checked" : ""}`}
                          onClick={() => handleNotificationToggle("staffAttendance")}
                        >
                          <span className="switch-thumb" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 4: Activity Timeline */}
                {activeTab === "logs" && (
                  <div className="tab-pane">
                    <div className="section-title-inside">
                      <h3>Nhật ký hoạt động</h3>
                      <p>Danh sách các hoạt động quản trị gần nhất do tài khoản của bạn thực hiện.</p>
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
        </div>
      </main>
    </div>
  );
};

export default AdminProfile;
