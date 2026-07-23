import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import "../../styles/staff/StaffCommon.css";
import {
  getNotifications,
  markAllAsRead as markAllNotificationsAsRead,
  markAsRead as markNotificationAsRead,
} from "../../services/notificationApi";
import { Sidebar, Icon } from "./StaffComponents";
import StaffAttendance from "./StaffAttendance";
import StaffDashboard from "./StaffDashboard";
import StaffJobDetail, { StaffJobComplete, StaffJobMaterials, StaffJobStart } from "./StaffJobDetail";
import StaffJobPayment from "./StaffJobPayment";
import StaffJobs from "./StaffJobs";
import StaffProfile from "./StaffProfile";
import StaffSchedule from "./StaffSchedule";

function formatTimeElapsed(dateStr) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày trước`;
}

function getAppointmentIdFromNotification(notif = {}) {
  const raw = notif.appointment_id;
  if (!raw) return notif.metadata?.appointment_id || "";
  if (typeof raw === "string") return raw;
  return raw._id || raw.id || "";
}

export default function StaffLayout() {
  const navigate = useNavigate();
  const [notificationsList, setNotificationsList] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);

  const loadNotifications = async () => {
    try {
      const res = await getNotifications({ limit: 15 });
      if (res?.success && res.data) {
        setNotificationsList(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to load staff notifications:", err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotificationsMenu && !event.target.closest(".staff-floating-notif-wrapper")) {
        setShowNotificationsMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotificationsMenu]);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setUnreadCount(0);
      setNotificationsList((prev) => prev.map((item) => ({ ...item, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.is_read) {
        await markNotificationAsRead(notif._id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotificationsList((prev) =>
          prev.map((item) => (item._id === notif._id ? { ...item, is_read: true } : item))
        );
      }
      setShowNotificationsMenu(false);

      const appointmentId = getAppointmentIdFromNotification(notif);
      if (appointmentId) {
        navigate(`/staff/jobs/${appointmentId}`);
      } else {
        navigate("/staff/jobs");
      }
    } catch (err) {
      console.error("Failed to open staff notification:", err);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StaffDashboard />} />
          <Route path="assignments" element={<Navigate to="../jobs" replace />} />
          <Route path="schedule" element={<StaffSchedule />} />
          <Route path="jobs" element={<StaffJobs />} />
          <Route path="jobs/:jobId" element={<StaffJobDetail />} />
          <Route path="jobs/:jobId/detail" element={<StaffJobDetail />} />
          <Route path="jobs/:jobId/start" element={<StaffJobStart />} />
          <Route path="jobs/:jobId/materials" element={<StaffJobMaterials />} />
          <Route path="jobs/:jobId/complete" element={<StaffJobComplete />} />
          <Route path="jobs/:jobId/payment" element={<StaffJobPayment />} />
          <Route path="attendance" element={<StaffAttendance />} />
          <Route path="profile" element={<StaffProfile />} />
        </Routes>
      </main>

      <div className="staff-floating-notif-wrapper">
        <button
          aria-label="Thông báo công việc"
          className="staff-floating-notif-btn"
          onClick={() => setShowNotificationsMenu((open) => !open)}
          type="button"
        >
          <Icon name="notifications" />
          {unreadCount > 0 && <span className="staff-floating-badge">{unreadCount}</span>}
        </button>

        {showNotificationsMenu && (
          <div className="staff-floating-notif-dropdown">
            <div className="staff-notif-dropdown-header">
              <h3>Thông báo</h3>
              {unreadCount > 0 && (
                <button className="staff-mark-all-btn" onClick={handleMarkAllAsRead} type="button">
                  Đánh dấu đã đọc
                </button>
              )}
            </div>
            <div className="staff-notif-dropdown-divider" />
            <div className="staff-notifications-list">
              {notificationsList.length === 0 ? (
                <div className="staff-no-notifications">Chưa có thông báo công việc</div>
              ) : (
                notificationsList.map((notif) => (
                  <button
                    className={`staff-notification-item ${notif.is_read ? "" : "unread"}`}
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    type="button"
                  >
                    <div className="staff-notif-card-header">
                      <span className="staff-notif-title">{notif.title}</span>
                      {!notif.is_read && <span className="staff-unread-dot" />}
                    </div>
                    <p className="staff-notif-message">{notif.message}</p>
                    <small className="staff-notif-time">{formatTimeElapsed(notif.created_at)}</small>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
