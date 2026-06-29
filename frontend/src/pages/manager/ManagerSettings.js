import React, { useState } from "react";
import {
  Settings,
  Save,
  Building,
  Sliders,
  Bell,
  ShieldCheck,
  HelpCircle,
  Database,
  Lock,
  Globe,
  Clock,
  Sparkles
} from "lucide-react";
import "../../styles/manager/ManagerSettings.css";

export default function ManagerSettings() {
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Form states
  const [generalForm, setGeneralForm] = useState({
    garageName: "MotoCare Auto Service",
    address: "Ngũ Hành Sơn, Đà Nẵng",
    hotline: "1900 8386",
    email: "contact@motocare",
    openHour: "08:00",
    closeHour: "18:30"
  });

  const [bookingForm, setBookingForm] = useState({
    maxSlotsPerHour: 6,
    repairBays: 10,
    timeInterval: 30, // minutes
    autoAssignTech: true,
    allowCancelHours: 2 // hours before
  });

  const [notifForm, setNotifForm] = useState({
    notifyNewBooking: true,
    notifyCancel: true,
    sendEmailCustomer: true,
    sendSmsTech: false
  });

  const handleGeneralSave = (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");
    setTimeout(() => {
      setLoading(false);
      setSuccessMsg("Đã lưu cấu hình thông tin Garage thành công!");
      setTimeout(() => setSuccessMsg(""), 3500);
    }, 800);
  };

  const handleBookingSave = (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");
    setTimeout(() => {
      setLoading(false);
      setSuccessMsg("Đã lưu thiết lập đặt lịch & phân kệ thành công!");
      setTimeout(() => setSuccessMsg(""), 3500);
    }, 800);
  };

  return (
    <div className="manager-settings-container">
      {/* Title */}
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Cài đặt Hệ thống</h2>
          <p className="page-subtitle">Cấu hình thông tin vận hành garage, quản lý luồng đặt lịch hẹn trực tuyến và bảo mật hệ thống.</p>
        </div>
      </div>

      {successMsg && <div className="manager-alert success">{successMsg}</div>}

      <div className="settings-split-layout">
        {/* Left Side: Tabs List */}
        <div className="settings-nav-card">
          <button
            className={`setting-nav-btn ${activeTab === "general" ? "active" : ""}`}
            onClick={() => setActiveTab("general")}
          >
            <Building size={16} />
            <span>Thông tin Garage</span>
          </button>
          <button
            className={`setting-nav-btn ${activeTab === "bookings" ? "active" : ""}`}
            onClick={() => setActiveTab("bookings")}
          >
            <Sliders size={16} />
            <span>Thiết lập Đặt lịch</span>
          </button>
          <button
            className={`setting-nav-btn ${activeTab === "notifications" ? "active" : ""}`}
            onClick={() => setActiveTab("notifications")}
          >
            <Bell size={16} />
            <span>Thông báo & Remind</span>
          </button>
          <button
            className={`setting-nav-btn ${activeTab === "security" ? "active" : ""}`}
            onClick={() => setActiveTab("security")}
          >
            <ShieldCheck size={16} />
            <span>Sao lưu & Bảo mật</span>
          </button>
        </div>

        {/* Right Side: Forms */}
        <div className="settings-form-card">
          {activeTab === "general" && (
            <form onSubmit={handleGeneralSave}>
              <h3 className="settings-section-title">Thông tin chung Garage</h3>
              <p className="settings-section-desc">Cập nhật thông tin liên hệ và giờ mở cửa chính thức được hiển thị cho khách hàng đặt lịch.</p>

              <div className="form-grid">
                <div className="form-group full">
                  <label className="input-label">Tên Garage / Chi nhánh</label>
                  <input
                    type="text"
                    value={generalForm.garageName}
                    onChange={(e) => setGeneralForm({ ...generalForm, garageName: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group full">
                  <label className="input-label">Địa chỉ</label>
                  <input
                    type="text"
                    value={generalForm.address}
                    onChange={(e) => setGeneralForm({ ...generalForm, address: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">Hotline liên hệ</label>
                  <input
                    type="text"
                    value={generalForm.hotline}
                    onChange={(e) => setGeneralForm({ ...generalForm, hotline: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">Email hỗ trợ</label>
                  <input
                    type="email"
                    value={generalForm.email}
                    onChange={(e) => setGeneralForm({ ...generalForm, email: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">Giờ mở cửa</label>
                  <input
                    type="time"
                    value={generalForm.openHour}
                    onChange={(e) => setGeneralForm({ ...generalForm, openHour: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">Giờ đóng cửa</label>
                  <input
                    type="time"
                    value={generalForm.closeHour}
                    onChange={(e) => setGeneralForm({ ...generalForm, closeHour: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-footer">
                <button type="submit" className="save-settings-btn" disabled={loading}>
                  <Save size={16} /> {loading ? "Đang lưu..." : "Lưu cấu hình"}
                </button>
              </div>
            </form>
          )}

          {activeTab === "bookings" && (
            <form onSubmit={handleBookingSave}>
              <h3 className="settings-section-title">Thiết lập luồng Đặt lịch & Phân kệ</h3>
              <p className="settings-section-desc">Cấu hình thuật toán điều phối, công suất tối đa cho phép đặt trực tuyến của garage.</p>

              <div className="form-grid">
                <div className="form-group">
                  <label className="input-label">Số lịch hẹn tối đa / giờ</label>
                  <input
                    type="number"
                    value={bookingForm.maxSlotsPerHour}
                    onChange={(e) => setBookingForm({ ...bookingForm, maxSlotsPerHour: parseInt(e.target.value) })}
                    className="form-input"
                    min="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">Số lượng kệ sửa chữa (bays)</label>
                  <input
                    type="number"
                    value={bookingForm.repairBays}
                    className="form-input"
                    disabled
                  />
                  <small style={{ color: "#94a3b8", display: "block", marginTop: "4px" }}>
                    Liên hệ quản trị viên (Admin) để tăng số kệ.
                  </small>
                </div>

                <div className="form-group">
                  <label className="input-label">Khoảng cách lịch hẹn (phút)</label>
                  <select
                    value={bookingForm.timeInterval}
                    onChange={(e) => setBookingForm({ ...bookingForm, timeInterval: parseInt(e.target.value) })}
                    className="form-select"
                  >
                    <option value={15}>15 phút</option>
                    <option value={30}>30 phút</option>
                    <option value={45}>45 phút</option>
                    <option value={60}>60 phút</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="input-label">Hạn chót hủy lịch (tiếng trước khi đến)</label>
                  <input
                    type="number"
                    value={bookingForm.allowCancelHours}
                    onChange={(e) => setBookingForm({ ...bookingForm, allowCancelHours: parseInt(e.target.value) })}
                    className="form-input"
                    min="0"
                    required
                  />
                </div>

                <div className="form-group full">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={bookingForm.autoAssignTech}
                      onChange={(e) => setBookingForm({ ...bookingForm, autoAssignTech: e.target.checked })}
                    />
                    <span className="checkbox-label">Tự động phân công Kỹ thuật viên rảnh nhất khi khách đặt lịch hẹn</span>
                  </label>
                </div>
              </div>

              <div className="form-footer">
                <button type="submit" className="save-settings-btn" disabled={loading}>
                  <Save size={16} /> {loading ? "Đang lưu..." : "Lưu cấu hình"}
                </button>
              </div>
            </form>
          )}

          {activeTab === "notifications" && (
            <form onSubmit={handleBookingSave}>
              <h3 className="settings-section-title">Thông báo & Nhắc nhở</h3>
              <p className="settings-section-desc">Quản lý cách thức hệ thống gửi email và tin nhắn cảnh báo cho quản lý và nhân sự.</p>

              <div className="form-grid">
                <div className="form-group full">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={notifForm.notifyNewBooking}
                      onChange={(e) => setNotifForm({ ...notifForm, notifyNewBooking: e.target.checked })}
                    />
                    <span className="checkbox-label">Gửi email cảnh báo cho Manager khi có lịch đặt mới</span>
                  </label>
                </div>

                <div className="form-group full">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={notifForm.notifyCancel}
                      onChange={(e) => setNotifForm({ ...notifForm, notifyCancel: e.target.checked })}
                    />
                    <span className="checkbox-label">Thông báo cho quản lý khi khách hàng hủy lịch</span>
                  </label>
                </div>

                <div className="form-group full">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={notifForm.sendEmailCustomer}
                      onChange={(e) => setNotifForm({ ...notifForm, sendEmailCustomer: e.target.checked })}
                    />
                    <span className="checkbox-label">Tự động gửi email xác nhận đặt lịch &amp; biên lai thanh toán cho khách hàng</span>
                  </label>
                </div>

                <div className="form-group full">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={notifForm.sendSmsTech}
                      onChange={(e) => setNotifForm({ ...notifForm, sendSmsTech: e.target.checked })}
                    />
                    <span className="checkbox-label">Gửi SMS / Zalo nhắc việc cho Kỹ thuật viên khi được phân kệ sửa xe</span>
                  </label>
                </div>
              </div>

              <div className="form-footer">
                <button type="submit" className="save-settings-btn" disabled={loading}>
                  <Save size={16} /> {loading ? "Đang lưu..." : "Lưu cấu hình"}
                </button>
              </div>
            </form>
          )}

          {activeTab === "security" && (
            <div>
              <h3 className="settings-section-title">Sao lưu & Bảo mật Hệ thống</h3>
              <p className="settings-section-desc">Thực hiện các tác vụ quản trị cơ sở dữ liệu và cấu hình phân quyền truy cập hệ thống.</p>

              <div className="security-actions-list">
                <div className="sec-action-row">
                  <div>
                    <strong>Sao lưu cơ sở dữ liệu tức thời (Backup Database)</strong>
                    <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>Tạo file nén backup toàn bộ dữ liệu MongoDB của garage và tải về local.</p>
                  </div>
                  <button type="button" className="sec-btn-action">
                    <Database size={14} style={{ marginRight: "6px" }} /> Sao lưu ngay
                  </button>
                </div>

                <div className="sec-action-row">
                  <div>
                    <strong>Khóa luồng đăng ký tài khoản nhân sự mới</strong>
                    <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>Khi bật, chỉ Admin mới có quyền tạo thêm tài khoản Staff/Manager.</p>
                  </div>
                  <button type="button" className="sec-btn-action danger">
                    <Lock size={14} style={{ marginRight: "6px" }} /> Khóa đăng ký
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
