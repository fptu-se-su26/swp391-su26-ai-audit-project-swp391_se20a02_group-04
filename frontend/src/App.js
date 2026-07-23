
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCalendar from './pages/admin/AdminCalendar';
import AdminProfile from './pages/admin/AdminProfile';
import AdminServices from './pages/admin/AdminServices';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminUsers from './pages/admin/AdminUsers';
import AdminInventory from './pages/admin/AdminInventory';
import AdminAI from './pages/admin/AdminAI';
import AdminReminders from './pages/admin/AdminReminders';
import './App.css';
import { Bell } from 'lucide-react';
import { getNotifications, markAsRead as markNotificationAsRead, markAllAsRead as markAllNotificationsAsRead } from './services/notificationApi';

const ADMIN_PAGES = new Set([
  'dashboard',
  'calendar',
  'services',
  'reminders',
  'customers',
  'users',
  'profile',
  'inventory',
  'ai'
]);

const getAdminPageFromPath = (pathname = '') => {
  const [, role, page] = pathname.split('/');
  if (role !== 'admin') return 'dashboard';
  if (page === 'appointments') return 'calendar';
  if (page && ADMIN_PAGES.has(page)) return page;
  return 'dashboard';
};

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(getAdminPageFromPath(location.pathname));

  // Notification States
  const [notificationsList, setNotificationsList] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);

  // Fetch notifications
  const loadNotifications = async () => {
    try {
      const res = await getNotifications({ limit: 15 });
      if (res && res.success && res.data) {
        setNotificationsList(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setUnreadCount(0);
      setNotificationsList(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.is_read) {
        await markNotificationAsRead(notif._id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotificationsList(prev => prev.map(n => n._id === notif._id ? { ...n, is_read: true } : n));
      }
      setShowNotificationsMenu(false);

      if (notif.appointment_id) {
        handlePageChange("calendar");
      }
    } catch (err) {
      console.error("Failed to handle notification click:", err);
    }
  };

  // Close notifications dropdown clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showNotificationsMenu && !e.target.closest(".floating-notif-wrapper")) {
        setShowNotificationsMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotificationsMenu]);

  // Load and poll notifications
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeElapsed = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return `${diffDays} ngày trước`;
  };

  useEffect(() => {
    setCurrentPage(getAdminPageFromPath(location.pathname));
  }, [location.pathname]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    navigate(page === 'dashboard' ? '/admin/dashboard' : `/admin/${page}`);
  };

  const renderPage = () => {
    switch (currentPage) {

      case 'dashboard':
        return <AdminDashboard onViewChange={handlePageChange} />;
      case 'calendar':
        return <AdminCalendar onViewChange={handlePageChange} />;
      case 'services':
        return <AdminServices onViewChange={handlePageChange} />;
      case 'customers':
        return <AdminCustomers onViewChange={handlePageChange} />;
      case 'users':
        return <AdminUsers onViewChange={handlePageChange} />;
      case 'profile':
        return <AdminProfile onViewChange={handlePageChange} />;
      case 'inventory':
        return <AdminInventory onViewChange={handlePageChange} />;
      case 'ai':
        return <AdminAI onViewChange={handlePageChange} />;
      case 'reminders':
        return <AdminReminders onViewChange={handlePageChange} />;
      default:
        return <AdminDashboard onViewChange={handlePageChange} />;

    }
  };

  if (!ADMIN_PAGES.has(currentPage)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <div className="App">
      {renderPage()}

      {/* Floating Notification Button overlay for Admin */}
      <div className="floating-notif-wrapper">
        <button 
          className="floating-notif-btn"
          onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
          aria-label="Thông báo"
        >
          <Bell size={24} />
          {unreadCount > 0 && <span className="floating-badge">{unreadCount}</span>}
        </button>

        {showNotificationsMenu && (
          <div className="floating-notif-dropdown">
            <div className="dropdown-header">
              <h3>Thông báo mới</h3>
              {unreadCount > 0 && (
                <button className="mark-all-btn" onClick={handleMarkAllAsRead}>
                  Đánh dấu đã đọc
                </button>
              )}
            </div>
            <div className="dropdown-divider" />
            <div className="notifications-list">
              {notificationsList.length === 0 ? (
                <div className="no-notifications">Không có thông báo nào</div>
              ) : (
                notificationsList.map((notif) => (
                  <div 
                    key={notif._id} 
                    className={`notification-item-card ${!notif.is_read ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="notif-card-header">
                      <span className="notif-title">{notif.title}</span>
                      {!notif.is_read && <span className="unread-dot" />}
                    </div>
                    <p className="notif-message">{notif.message}</p>
                    <small className="notif-time">{formatTimeElapsed(notif.created_at)}</small>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
