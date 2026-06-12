import React, { useEffect, useState } from "react";
import { Icon, PageHeader } from "./StaffComponents";
import { profileService } from "../../services/profileService";
import { getStaffProfile, updateStaffProfile } from "../../services/staffAppointmentApi";
import "../../styles/staff/StaffProfile.css";

function pickUser(payload) {
  return payload?.data?.user || payload?.data || payload?.user || {};
}

export default function StaffProfile() {
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    specialization: "",
  });
  const [activityLogs, setActivityLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadProfile = async () => {
    setIsLoading(true);
    setError("");

    try {
      const [profileResponse, logsResponse] = await Promise.allSettled([
        getStaffProfile(),
        profileService.getActivityLogs(1, 10),
      ]);

      if (profileResponse.status === "rejected") {
        throw profileResponse.reason;
      }

      const user = pickUser(profileResponse.value);
      setProfile({
        full_name: user.full_name || user.fullname || "",
        email: user.email || "",
        phone: user.phone || "",
        specialization: user.specialization || "",
      });

      if (logsResponse.status === "fulfilled") {
        const logs = logsResponse.value?.data?.logs || logsResponse.value?.data?.activityLogs || logsResponse.value?.data || [];
        setActivityLogs(Array.isArray(logs) ? logs : []);
      } else {
        setActivityLogs([]);
      }
    } catch (err) {
      setError(err.message || "Không thể tải hồ sơ nhân viên.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!profile.full_name.trim() || !profile.phone.trim()) {
      setError("Vui lòng nhập họ tên và số điện thoại.");
      return;
    }

    setIsSaving(true);
    try {
      await updateStaffProfile({
        full_name: profile.full_name.trim(),
        phone: profile.phone.trim(),
        specialization: profile.specialization.trim(),
      });
      setMessage("Đã cập nhật hồ sơ nhân viên.");
    } catch (err) {
      setError(err.message || "Không thể cập nhật hồ sơ.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Hồ sơ nhân viên" subtitle="Thông tin cá nhân và hoạt động tài khoản từ hệ thống" actions={false} />

      {isLoading && (
        <div className="state-box">
          <div>
            <strong>Đang tải hồ sơ</strong>
            <p>Hệ thống đang lấy thông tin tài khoản nhân viên từ máy chủ.</p>
          </div>
        </div>
      )}

      {!isLoading && error && !profile.email && (
        <div className="state-box error">
          <div>
            <strong>Không thể tải hồ sơ</strong>
            <p>{error}</p>
            <div className="state-actions">
              <button className="secondary-button" onClick={loadProfile} type="button">
                Thử lại
              </button>
            </div>
          </div>
        </div>
      )}

      {!isLoading && profile.email && (
        <div className="page-grid profile-grid">
          <section className="profile-card">
            <div className="profile-cover">
              <div className="profile-avatar-large-container">
                <span className="material-symbols-outlined staff-avatar-img">engineering</span>
              </div>
            </div>
            <h3 className="staff-display-name">{profile.full_name || "Nhân viên kỹ thuật"}</h3>
            <p className="staff-role-display">
              <span className="material-symbols-outlined inline-icon">engineering</span>
              Nhân viên kỹ thuật
            </p>
            <div className="staff-brief-bio">
              <h4>Thông tin tài khoản</h4>
              <p>Email: {profile.email}</p>
              <p>Số điện thoại: {profile.phone || "Chưa cập nhật"}</p>
            </div>
          </section>

          <section className="panel wide-panel staff-tabs-panel">
            <form onSubmit={handleSubmit} className="staff-pane-fade">
              <div className="tab-pane-title">
                <h3>Cập nhật thông tin liên hệ</h3>
                <p>Thông tin này được lưu trực tiếp vào tài khoản backend của nhân viên.</p>
              </div>

              {message && <p className="form-message success">{message}</p>}
              {error && <p className="form-message error">{error}</p>}

              <div className="form-grid">
                <label className="staff-form-label">
                  Họ tên *
                  <input name="full_name" onChange={handleChange} value={profile.full_name} />
                </label>
                <label className="staff-form-label">
                  Email
                  <input name="email" value={profile.email} disabled className="disabled-input" />
                </label>
                <label className="staff-form-label">
                  Số điện thoại *
                  <input name="phone" onChange={handleChange} value={profile.phone} />
                </label>
                <label className="staff-form-label">
                  Chuyen mon
                  <input name="specialization" onChange={handleChange} value={profile.specialization} />
                </label>
              </div>

              <div className="staff-form-actions">
                <button className="primary-button staff-submit-btn" type="submit" disabled={isSaving}>
                  <Icon name="save" />
                  <span>{isSaving ? "Đang cập nhật..." : "Cập nhật hồ sơ"}</span>
                </button>
              </div>
            </form>
          </section>

          <section className="panel wide-panel full-width-panel staff-recent-activity">
            <h3>
              <Icon name="history" />
              Hoạt động gần đây
            </h3>
            {activityLogs.length > 0 ? (
              <div className="staff-timeline-list">
                {activityLogs.map((activity, index) => (
                  <div className="staff-timeline-item" key={activity._id || activity.id || index}>
                    <span className="material-symbols-outlined timeline-icon-circle job">history</span>
                    <div className="timeline-card-content">
                      <div className="timeline-card-header">
                        <h4>{activity.action || "Hoạt động tài khoản"}</h4>
                        <span className="activity-time-stamp">{activity.created_at || activity.createdAt || ""}</span>
                      </div>
                      <p>{activity.status || activity.note || activity.message || "Đã ghi nhận trong hệ thống."}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="state-box">
                <div>
                  <strong>Chưa có hoạt động</strong>
                  <p>Không có log hoạt động từ backend cho tài khoản này.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
