import React, { useState, useEffect } from "react";
import { Icon, PageHeader } from "./StaffComponents";
import "../../styles/staff/StaffProfile.css";
import { profileService } from "../../services/profileService";

const activityTimeline = [
  { id: 1, action: "Hoàn thành bảo dưỡng BMW S1000RR", note: "Thay nước làm mát & lọc gió K&N", time: "15:30 Hôm nay", icon: "check_circle", type: "job" },
  { id: 2, action: "Check-in vào ca sáng", note: "Lúc 07:22 (Đúng giờ)", time: "07:22 Hôm nay", icon: "login", type: "attendance" },
  { id: 3, action: "Yêu cầu xuất kho vật tư", note: "2L Nhớt Motul 300V & 1 lọc dầu Honda", time: "Hôm qua - 14:15", icon: "inventory_2", type: "inventory" },
  { id: 4, action: "Hoàn thành cân phuộc Ducati Panigale", note: "Thay phớt phuộc & dầu phuộc Öhlins", time: "22/05/2026", icon: "check_circle", type: "job" },
];

export default function StaffProfile() {
  const [activeTab, setActiveTab] = useState("info");
  const [isSaving, setIsSaving] = useState(false);
  const [isUsingMock, setIsUsingMock] = useState(false);

  useEffect(() => {
    const fetchStaffData = async () => {
      try {
        const res = await profileService.getMe();
        if (res && res.success && res.data) {
          const apiUser = res.data.user || res.data;
          setProfile((prev) => ({
            ...prev,
            name: apiUser.full_name || apiUser.fullname || prev.name,
            email: apiUser.email || prev.email,
            phone: apiUser.phone || prev.phone,
          }));
          setIsUsingMock(false);
        }
      } catch (err) {
        console.log("Could not load API staff profile, falling back to mock data:", err.message);
        setIsUsingMock(true);
      }
    };
    fetchStaffData();
  }, []);

  const [profile, setProfile] = useState({
    name: "Trần Minh Khoa",
    code: "ST024",
    phone: "0912 345 678",
    email: "khoa.staff@motocore.vn",
    specialty: "Sửa xe chuyên sâu, Cân vành, Bảo dưỡng phuộc Öhlins",
    shift: "07:30 - 17:30",
    avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%23fff7ed"/><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="%23ff6d1f"/></svg>',
    bio: "Hơn 5 năm kinh nghiệm làm việc với các dòng xe phân khối lớn của Honda, Yamaha, BMW. Có chứng chỉ chuyên gia phuộc Öhlins và phanh Brembo.",
  });

  const [skills, setSkills] = useState([
    { name: "Sửa chữa động cơ PKL", level: 90, icon: "handyman" },
    { name: "Cân vành & Bảo dưỡng phuộc", level: 95, icon: "construction" },
    { name: "Hệ thống phanh Brembo", level: 85, icon: "settings_accessibility" },
    { name: "Chẩn đoán lỗi ECU & Điện tử", level: 75, icon: "electric_bolt" },
    { name: "Rửa xe & Vệ sinh chi tiết", level: 98, icon: "wash" },
  ]);

  const [schedule] = useState([
    { day: "Thứ Hai", shift: "07:30 - 17:30", status: "Đúng giờ", checkIn: "07:22", checkOut: "17:35", type: "on-time" },
    { day: "Thứ Ba", shift: "07:30 - 17:30", status: "Đúng giờ", checkIn: "07:28", checkOut: "17:42", type: "on-time" },
    { day: "Thứ Tư", shift: "07:30 - 17:30", status: "Đi muộn", checkIn: "07:42", checkOut: "17:38", type: "late" },
    { day: "Thứ Năm", shift: "07:30 - 17:30", status: "Đúng giờ", checkIn: "07:25", checkOut: "17:33", type: "on-time" },
    { day: "Thứ Sáu", shift: "07:30 - 17:30", status: "Đúng giờ", checkIn: "07:18", checkOut: "17:45", type: "on-time" },
    { day: "Thứ Bảy", shift: "07:30 - 12:00", status: "Nghỉ phép", checkIn: "--:--", checkOut: "--:--", type: "off" },
    { day: "Chủ Nhật", shift: "Nghỉ tuần", status: "Nghỉ tuần", checkIn: "--:--", checkOut: "--:--", type: "off" },
  ]);

  const [certificates] = useState([
    { title: "BMW Motorrad Certified Service Technician", issuer: "BMW Group Academy Vietnam", date: "Tháng 08/2024", id: "BMW-ST24-99", icon: "workspace_premium" },
    { title: "Suspension Specialist - Öhlins Master Class", issuer: "Öhlins Asia Division", date: "Tháng 12/2025", id: "OHL-MC-8812", icon: "verified" },
    { title: "Brembo High Performance Brake Systems Specialist", issuer: "Brembo Italy Academy", date: "Tháng 02/2026", id: "BRM-HP-2210", icon: "stars" },
  ]);

  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
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
          showToast("Cập nhật ảnh đại diện thành công!");
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profile.name.trim() || !profile.phone.trim() || !profile.email.trim()) {
      showToast("Vui lòng điền đầy đủ các thông tin bắt buộc!", "error");
      return;
    }

    setIsSaving(true);
    try {
      if (!isUsingMock) {
        await profileService.updateProfile({
          fullname: profile.name,
          phone: profile.phone
        });
      }
      setTimeout(() => {
        setIsSaving(false);
        showToast("Cập nhật hồ sơ cá nhân thành công!");
      }, 1000);
    } catch (err) {
      setIsSaving(false);
      showToast(err.message || "Không thể cập nhật hồ sơ lên máy chủ!", "error");
    }
  };

  return (
    <>
      <PageHeader title="Hồ sơ nhân viên" subtitle="Thông tin cá nhân, kỹ năng và hiệu suất làm việc" actions={false} />
      
      {/* Dynamic Toast Notification */}
      {toast.show && (
        <div className={`custom-toast ${toast.type}`}>
          <div className="toast-content">
            <span className="material-symbols-outlined toast-icon-large">check_circle</span>
            <p>{toast.message}</p>
          </div>
        </div>
      )}

      <div className="page-grid profile-grid">
        {/* Left Column: Overview Profile Card */}
        <section className="profile-card">
          <div className="profile-cover">
            <div className="profile-avatar-large-container">
              <img src={profile.avatar} alt="Staff Avatar" className="staff-avatar-img" />
              <button className="avatar-upload-overlay" onClick={handleAvatarClick} title="Thay ảnh đại diện">
                <span className="material-symbols-outlined">photo_camera</span>
              </button>
            </div>
          </div>
          
          <h3 className="staff-display-name">{profile.name}</h3>
          <p className="staff-role-display">
            <span className="material-symbols-outlined inline-icon">engineering</span>
            Nhân viên kỹ thuật - ID: {profile.code}
          </p>
          
          <div className="profile-badges">
            <span>Rửa xe</span>
            <span>Sửa cơ bản</span>
            <span>Thay nhớt</span>
            <span>Cân phuộc</span>
          </div>
          
          <div className="profile-score">
            <div>
              <strong>91%</strong>
              <span>Hiệu suất</span>
            </div>
            <div>
              <strong>4.8</strong>
              <span>Đánh giá</span>
            </div>
            <div>
              <strong>126</strong>
              <span>Việc xong</span>
            </div>
          </div>

          <div className="staff-brief-bio">
            <h4>Giới thiệu kỹ thuật</h4>
            <p>{profile.bio}</p>
          </div>
        </section>

        {/* Right Column: Dynamic Tabs Container */}
        <section className="panel wide-panel staff-tabs-panel">
          {/* Tab Navigation Menu */}
          <div className="staff-tabs-menu">
            <button
              className={`staff-tab-btn ${activeTab === "info" ? "active" : ""}`}
              onClick={() => setActiveTab("info")}
            >
              <Icon name="person" />
              <span>Liên hệ</span>
            </button>
            <button
              className={`staff-tab-btn ${activeTab === "skills" ? "active" : ""}`}
              onClick={() => setActiveTab("skills")}
            >
              <Icon name="construction" />
              <span>Tay nghề</span>
            </button>
            <button
              className={`staff-tab-btn ${activeTab === "schedule" ? "active" : ""}`}
              onClick={() => setActiveTab("schedule")}
            >
              <Icon name="calendar_month" />
              <span>Lịch trực</span>
            </button>
            <button
              className={`staff-tab-btn ${activeTab === "certificates" ? "active" : ""}`}
              onClick={() => setActiveTab("certificates")}
            >
              <Icon name="workspace_premium" />
              <span>Chứng chỉ</span>
            </button>
          </div>

          {/* Tab Contents */}
          <div className="staff-tab-content">
            {/* Tab 1: Info Form */}
            {activeTab === "info" && (
              <form onSubmit={handleUpdateProfile} className="staff-pane-fade">
                <div className="tab-pane-title">
                  <h3>Cập nhật thông tin liên hệ</h3>
                  <p>Quản lý số điện thoại, email và chuyên môn kỹ thuật để nhận phân công.</p>
                </div>
                
                <div className="form-grid">
                  <label className="staff-form-label">
                    Họ tên *
                    <input
                      name="name"
                      value={profile.name}
                      onChange={handleInputChange}
                    />
                  </label>
                  <label className="staff-form-label">
                    Mã nhân viên (Cố định)
                    <input
                      name="code"
                      value={profile.code}
                      disabled
                      className="disabled-input"
                    />
                  </label>
                  <label className="staff-form-label">
                    Số điện thoại *
                    <input
                      name="phone"
                      value={profile.phone}
                      onChange={handleInputChange}
                    />
                  </label>
                  <label className="staff-form-label">
                    Email *
                    <input
                      name="email"
                      value={profile.email}
                      onChange={handleInputChange}
                    />
                  </label>
                  <label className="staff-form-label full-width-label">
                    Chuyên môn kỹ thuật
                    <input
                      name="specialty"
                      value={profile.specialty}
                      onChange={handleInputChange}
                    />
                  </label>
                  <label className="staff-form-label full-width-label">
                    Giới thiệu bản thân
                    <textarea
                      name="bio"
                      value={profile.bio}
                      onChange={handleInputChange}
                      rows={4}
                      className="staff-textarea"
                    />
                  </label>
                </div>
                
                <div className="staff-form-actions">
                  <button className="primary-button staff-submit-btn" type="submit" disabled={isSaving}>
                    <Icon name="save" />
                    <span>{isSaving ? "Đang cập nhật..." : "Cập nhật hồ sơ"}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Skills Progress */}
            {activeTab === "skills" && (
              <div className="staff-pane-fade">
                <div className="tab-pane-title">
                  <h3>Đánh giá tay nghề & Chuyên môn</h3>
                  <p>Mức độ thành thạo các kỹ năng sửa chữa, bảo dưỡng do quản lý garage đánh giá định kỳ.</p>
                </div>

                <div className="staff-skills-list">
                  {skills.map((skill) => (
                    <div className="staff-skill-item" key={skill.name}>
                      <div className="staff-skill-head">
                        <div className="skill-title-icon">
                          <span className="material-symbols-outlined skill-icon-colored">{skill.icon}</span>
                          <span>{skill.name}</span>
                        </div>
                        <span className="skill-level-text">{skill.level}%</span>
                      </div>
                      <div className="skill-progress-bar-container">
                        <div
                          className="skill-progress-bar-fill"
                          style={{ width: `${skill.level}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Weekly Schedule */}
            {activeTab === "schedule" && (
              <div className="staff-pane-fade">
                <div className="tab-pane-title">
                  <h3>Lịch làm việc & Ca trực tuần này</h3>
                  <p>Lịch trực cố định và chi tiết giờ chấm công thực tế của ca làm việc.</p>
                </div>

                <div className="staff-schedule-grid">
                  <div className="schedule-header-row">
                    <span>Thứ</span>
                    <span>Ca làm việc</span>
                    <span>Check-In</span>
                    <span>Check-Out</span>
                    <span>Trạng thái</span>
                  </div>
                  <div className="schedule-body">
                    {schedule.map((item) => (
                      <div className={`schedule-body-row ${item.type}`} key={item.day}>
                        <strong className="day-name">{item.day}</strong>
                        <span>{item.shift}</span>
                        <span>{item.checkIn}</span>
                        <span>{item.checkOut}</span>
                        <span className={`schedule-badge ${item.type}`}>{item.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="schedule-summary-metrics">
                  <div className="metric-box">
                    <span className="material-symbols-outlined metric-icon text-green">task_alt</span>
                    <div>
                      <h5>Đúng giờ</h5>
                      <p>96% ca trực</p>
                    </div>
                  </div>
                  <div className="metric-box">
                    <span className="material-symbols-outlined metric-icon text-orange">pace</span>
                    <div>
                      <h5>Tổng giờ làm</h5>
                      <p>44.5 giờ / tuần</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Certificates list */}
            {activeTab === "certificates" && (
              <div className="staff-pane-fade">
                <div className="tab-pane-title">
                  <h3>Chứng chỉ & Đào tạo hoàn thành</h3>
                  <p>Các chứng nhận tay nghề do các hãng xe và trung tâm đào tạo ủy quyền cấp phép.</p>
                </div>

                <div className="staff-certs-grid">
                  {certificates.map((cert) => (
                    <div className="staff-cert-card" key={cert.id}>
                      <div className="cert-badge-icon">
                        <span className="material-symbols-outlined">{cert.icon}</span>
                      </div>
                      <div className="cert-info">
                        <h4>{cert.title}</h4>
                        <p className="cert-issuer">{cert.issuer}</p>
                        <div className="cert-footer-row">
                          <span>Cấp ngày: {cert.date}</span>
                          <span className="cert-code">Mã: {cert.id}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Technical Activity Logs section */}
        <section className="panel wide-panel full-width-panel staff-recent-activity">
          <h3>
            <Icon name="history" />
            Hoạt động kỹ thuật gần đây
          </h3>
          <div className="staff-timeline-list">
            {activityTimeline.map((activity) => (
              <div className="staff-timeline-item" key={activity.id}>
                <span className={`material-symbols-outlined timeline-icon-circle ${activity.type}`}>
                  {activity.icon}
                </span>
                <div className="timeline-card-content">
                  <div className="timeline-card-header">
                    <h4>{activity.action}</h4>
                    <span className="activity-time-stamp">{activity.time}</span>
                  </div>
                  <p>{activity.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
