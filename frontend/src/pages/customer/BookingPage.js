import React, { useCallback, useEffect, useMemo, useState } from "react";
import { cancelAppointment, createAppointment, getMyAppointments } from "../../services/appointmentApi";
import "../../styles/customer/BookingPage.css";
import { clearAuthSession } from "../../services/authApi";
import { profileService } from "../../services/profileService";
import { getNotifications, markAsRead as markNotificationAsRead, markAllAsRead as markAllNotificationsAsRead } from "../../services/notificationApi";
import CustomerChatWidget from "../../components/CustomerChatWidget";

const washPackages = [
  {
    id: "wash-basic",
    name: "Rửa xe máy cơ bản",
    price: "40.000đ",
    duration: "25 phút",
    description: "Rửa thân vỏ, vành, sên/lốp và lau khô nhanh.",
  },
  {
    id: "wash-premium",
    name: "Rửa xe máy cao cấp",
    price: "80.000đ",
    duration: "45 phút",
    description: "Bọt tuyết, vệ sinh vành, chăm sóc nhựa nhám và kính chắn gió.",
  },
  {
    id: "engine-clean",
    name: "Vệ sinh động cơ",
    price: "120.000đ",
    duration: "60 phút",
    description: "Làm sạch khoang máy, kiểm tra rò nhớt/xăng cơ bản.",
  },
];

const maintenancePackages = [
  {
    id: "maintenance-basic",
    name: "Bảo dưỡng cơ bản",
    price: "150.000đ",
    duration: "45 phút",
    description: "Kiểm tra nhớt, phanh, lốp, đèn, ắc quy và ốc siết.",
  },
  {
    id: "maintenance-periodic",
    name: "Bảo dưỡng định kỳ",
    price: "280.000đ",
    duration: "75 phút",
    description: "Kiểm tra tổng quát, lọc gió, côn/sên, cân chỉnh phanh.",
  },
  {
    id: "maintenance-full",
    name: "Bảo dưỡng toàn diện",
    price: "450.000đ",
    duration: "120 phút",
    description: "Quy trình chuyên sâu cho xe chạy lâu hoặc chuẩn bị đi xa.",
  },
];

const repairIssues = [
  "Xe khó nổ / chết máy",
  "Phanh kêu hoặc yếu",
  "Động cơ ồn / rung",
  "Điện – đèn – đề",
  "Lốp / săm / vành",
  "Sên, nhông, bố thắng",
  "Thay nhớt / lọc nhớt",
  "Kiểm tra tổng quát",
];

const VEHICLE_BRAND_HINT = "Honda, Yamaha, Suzuki, SYM...";
const VEHICLE_MODEL_HINT = "Vision, Wave, Exciter, Air Blade...";
const LICENSE_PLATE_HINT = "29B1-234.56";

const TIME_SLOTS = ["08:00", "09:30", "10:30", "13:30", "15:00", "16:30", "18:00"];
const morningSlots = TIME_SLOTS.filter((slot) => Number(slot.split(":")[0]) < 12);
const afternoonSlots = TIME_SLOTS.filter((slot) => Number(slot.split(":")[0]) >= 12);

function MaterialIcon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

function toLocalDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTomorrowDateValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toLocalDateValue(date);
}

function getMaxAppointmentDateValue() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return toLocalDateValue(date);
}

function formatDisplayDate(value) {
  if (!value) return "";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function normalizeAppointmentDate(value) {
  if (!value) return "";
  if (value instanceof Date) return toLocalDateValue(value);
  const text = String(value);
  if (text.includes("T")) return text.slice(0, 10);
  return text.slice(0, 10);
}

function formatAppointmentTime(appointment) {
  const date = normalizeAppointmentDate(appointment.appointment_date);
  const [year, month, day] = date.split("-");
  const slot = appointment.time_slot || "";

  if (!year || !month || !day) return slot;
  return `${day}/${month}/${year}${slot ? ` · ${slot}` : ""}`;
}

function getStatusLabel(status) {
  const labels = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    IN_PROGRESS: "Đang sửa",
    COMPLETED: "Hoàn tất",
    PAID: "Đã thanh toán",
    CANCELLED: "Đã hủy",
    REJECTED: "Từ chối",
  };

  return labels[status] || status || "";
}

function getStatusClass(status) {
  const classes = {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    IN_PROGRESS: "progress",
    COMPLETED: "completed",
    PAID: "paid",
    CANCELLED: "cancelled",
    REJECTED: "cancelled",
  };

  return classes[status] || "pending";
}

function getServiceTypeLabel(type) {
  const labels = { WASH: "Rửa xe", MAINTENANCE: "Bảo dưỡng", REPAIR: "Sửa chữa" };
  return labels[String(type || "").toUpperCase()] || "Dịch vụ xe máy";
}

function getAppointmentService(appointment) {
  const type = appointment.service_type || appointment.service?.type || "";
  const packageName = appointment.service?.name || appointment.service_package_name;
  const repair = appointment.repair_issue || appointment.service?.repair_issue;

  if (packageName) return packageName;
  if (repair) return `${getServiceTypeLabel("REPAIR")} · ${repair}`;
  return getServiceTypeLabel(type);
}

function getAppointmentVehicle(appointment) {
  const brand = appointment.vehicle?.brand || appointment.vehicle_brand || appointment.vehicle_info?.brand || "";
  const model = appointment.vehicle?.model || appointment.vehicle_model || appointment.vehicle_info?.model || "";
  const plate = appointment.vehicle?.license_plate || appointment.license_plate || appointment.vehicle_info?.license_plate || "";
  const name = [brand, model].filter(Boolean).join(" ").trim();
  if (name && plate) return `${name} · ${plate}`;
  return name || plate || "Xe máy";
}

function isValidVnPhone(phone) {
  return /^(0|\+84)(3|5|7|8|9)\d{8}$/.test(String(phone || "").replace(/[\s.-]/g, ""));
}

export default function BookingPage() {
  const [serviceType, setServiceType] = useState("wash");
  const [washPackage, setWashPackage] = useState(washPackages[0].id);
  const [maintenancePackage, setMaintenancePackage] = useState(maintenancePackages[0].id);
  const [repairIssue, setRepairIssue] = useState(repairIssues[0]);
  const [daySession, setDaySession] = useState("morning");
  const [timeSlot, setTimeSlot] = useState("");
  const [appointmentDate, setAppointmentDate] = useState(getTomorrowDateValue);

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
      console.log("Not logged in or offline, skipping notifications load");
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
    } catch (err) {
      console.error("Failed to handle notification click:", err);
    }
  };

  // Close customer notifications dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (showNotificationsMenu && !event.target.closest(".customer-notif-wrapper")) {
        setShowNotificationsMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [appointmentsList, setAppointmentsList] = useState([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [cancellingId, setCancellingId] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [user, setUser] = useState({
    fullname: "Nguyễn Hoàng Nam",
    email: "namnh.customer@gmail.com",
    avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%23fff7ed"/><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="%23ff6d1f"/></svg>'
  });

  useEffect(() => {
    setTimeSlot("");
  }, [daySession]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await profileService.getMe();
        if (res && res.success && res.data) {
          const apiUser = res.data.user || res.data;
          setUser({
            fullname: apiUser.full_name || apiUser.fullname || "Nguyễn Hoàng Nam",
            email: apiUser.email || "namnh.customer@gmail.com",
            avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%23fff7ed"/><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="%23ff6d1f"/></svg>'
          });
        }
      } catch (e) {
        console.log("Offline or not logged in, using default profile info");
      }
    };
    fetchUserData();
  }, []);

  const loadMyAppointments = useCallback(async () => {
    setIsLoadingAppointments(true);
    try {
      const response = await getMyAppointments({ page: 1, limit: 5 });
      setAppointmentsList(response.data?.appointments || []);
    } catch {
      setAppointmentsList([]);
    } finally {
      setIsLoadingAppointments(false);
    }
  }, []);

  useEffect(() => {
    loadMyAppointments();
  }, [loadMyAppointments]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (showUserMenu && !event.target.closest(".booking-actions")) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showUserMenu]);

  const selectedService = useMemo(() => {
    if (serviceType === "wash") {
      return washPackages.find((item) => item.id === washPackage) || washPackages[0];
    }

    if (serviceType === "maintenance") {
      return (
        maintenancePackages.find((item) => item.id === maintenancePackage) ||
        maintenancePackages[0]
      );
    }

    return {
      name: `Sửa chữa · ${repairIssue}`,
      price: "Báo giá sau kiểm tra",
      duration: "45–90 phút",
      description: "Kỹ thuật viên kiểm tra xe máy rồi báo giá trước khi sửa.",
    };
  }, [maintenancePackage, repairIssue, serviceType, washPackage]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setIsSubmitting(true);
    setSubmitError("");
    setSubmitResult(null);

    if (!appointmentDate || !timeSlot || typeof timeSlot !== "string") {
      setSubmitError("Vui lòng chọn đầy đủ ngày hẹn và khung giờ.");
      setIsSubmitting(false);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selectedDate = new Date(`${appointmentDate}T00:00:00`);
    selectedDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 1) {
      setSubmitError("Vui lòng đặt lịch từ ngày mai trở đi.");
      setIsSubmitting(false);
      return;
    }

    if (diffDays > 7) {
      setSubmitError("Chỉ có thể đặt lịch trước tối đa 7 ngày.");
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData(formElement);
    const contactPhone = String(formData.get("contact_phone") || "").trim();

    if (contactPhone && !isValidVnPhone(contactPhone)) {
      setSubmitError("Số điện thoại không hợp lệ. Ví dụ: 0912345678");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      service_type: serviceType.toUpperCase(),
      vehicle_brand: formData.get("vehicle_brand"),
      vehicle_model: formData.get("vehicle_model"),
      license_plate: formData.get("license_plate"),
      appointment_date: appointmentDate,
      time_slot: timeSlot,
    };

    const odometer = formData.get("odometer");
    const note = formData.get("note");

    if (odometer !== "") {
      payload.odometer = Number(odometer);
    }

    if (contactPhone) {
      payload.contact_phone = contactPhone;
    }

    if (note) {
      payload.note = note;
    }

    if (serviceType === "wash") {
      payload.service_package = washPackage;
    }

    if (serviceType === "maintenance") {
      payload.service_package = maintenancePackage;
    }

    if (serviceType === "repair") {
      const issueDescription = formData.get("issue_description");
      payload.repair_issue = repairIssue;

      if (issueDescription) {
        payload.issue_description = issueDescription;
      }
    }

    try {
      const response = await createAppointment(payload);
      const appointment = response.data?.appointment;
      setSubmitResult(appointment);
      formElement.reset();
      setWashPackage(washPackages[0].id);
      setMaintenancePackage(maintenancePackages[0].id);
      setRepairIssue(repairIssues[0]);
      setServiceType("wash");
      setAppointmentDate(getTomorrowDateValue());
      setTimeSlot("");
      loadNotifications();
      loadMyAppointments();
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    setShowUserMenu(false);
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!appointmentId) return;
    if (!window.confirm("Hủy lịch hẹn này?")) return;

    setCancellingId(appointmentId);
    try {
      await cancelAppointment(appointmentId, "Khách hủy từ trang đặt lịch");
      await loadMyAppointments();
    } catch (error) {
      setSubmitError(error.message || "Không thể hủy lịch hẹn.");
    } finally {
      setCancellingId("");
    }
  };

  return (
    <div className="booking-page">
      <header className="booking-header">
        <a className="booking-logo" href="/home">
          MOTOCORE
        </a>
        <nav className="booking-nav" aria-label="Điều hướng đặt lịch">
          <a href="/home">Trang chủ</a>
          <a href="/services">Dịch vụ</a>
          <a className="active" href="/booking">
            Lịch hẹn
          </a>
          <a href="/about">Về chúng tôi</a>
        </nav>
        <div className="booking-actions" style={{ position: "relative" }}>
          <a className="booking-contact-button" href="/support">
            Liên hệ garage
          </a>

          {/* Notification Bell Button */}
          <div className="customer-notif-wrapper" style={{ position: "relative", display: "inline-block" }}>
            <button 
              className="icon-button" 
              type="button" 
              aria-label="Thông báo" 
              onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
              style={{ position: "relative" }}
            >
              <MaterialIcon>notifications</MaterialIcon>
              {unreadCount > 0 && (
                <span className="notif-badge-dot" style={{
                  position: "absolute",
                  top: "2px",
                  right: "2px",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#ff6d1f",
                  border: "1.5px solid #ffffff"
                }} />
              )}
            </button>

            {showNotificationsMenu && (
              <div className="customer-notif-dropdown" style={{
                position: "absolute",
                top: "100%",
                right: "0",
                width: "320px",
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                padding: "16px",
                zIndex: "100",
                marginTop: "8px",
                border: "1px solid #f1f5f9"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: "800", color: "#0f172a", margin: 0 }}>Thông báo</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleMarkAllAsRead} 
                      style={{ background: "none", border: "none", color: "#ff6d1f", fontSize: "0.75rem", fontWeight: "750", cursor: "pointer" }}
                    >
                      Đọc tất cả
                    </button>
                  )}
                </div>
                <div style={{ height: "1px", backgroundColor: "#f1f5f9", marginBottom: "12px" }} />
                <div className="customer-notif-list" style={{ maxHeight: "250px", overflowY: "auto" }}>
                  {notificationsList.length === 0 ? (
                    <p style={{ textAlign: "center", fontSize: "0.85rem", color: "#64748b", margin: "16px 0" }}>Chưa có thông báo nào.</p>
                  ) : (
                    notificationsList.map((notif) => (
                      <div 
                        key={notif._id} 
                        onClick={() => handleNotificationClick(notif)}
                        style={{
                          padding: "10px",
                          borderRadius: "8px",
                          marginBottom: "8px",
                          cursor: "pointer",
                          backgroundColor: notif.is_read ? "transparent" : "#fff7ed",
                          border: notif.is_read ? "1px solid transparent" : "1px solid #ffedd5",
                          transition: "all 0.2s ease",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = notif.is_read ? "#f8fafc" : "#fff2e2"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = notif.is_read ? "transparent" : "#fff7ed"}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: "750", color: "#1e293b" }}>{notif.title}</span>
                          {!notif.is_read && <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#ff6d1f", marginTop: "4px" }} />}
                        </div>
                        <p style={{ fontSize: "0.8rem", color: "#475569", margin: 0, lineHeight: "1.4" }}>{notif.message}</p>
                        <small style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px" }}>{formatTimeElapsed(notif.created_at)}</small>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button className="user-menu-trigger" type="button" aria-label="Menu" onClick={() => setShowUserMenu(!showUserMenu)}>
            <MaterialIcon>menu</MaterialIcon>
          </button>

          {showUserMenu && (
            <div className="user-dropdown-menu">
              <a href="/profile?tab=info" className="dropdown-user-info" onClick={() => setShowUserMenu(false)}>
                <div className="dropdown-avatar">
                  <img src={user.avatar} alt="User Avatar" />
                </div>
                <div className="dropdown-user-details">
                  <strong>{user.fullname}</strong>
                  <span>{user.email}</span>
                </div>
              </a>
              <div className="dropdown-divider" />
              <a href="/profile?tab=info" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                <span className="material-symbols-outlined">person</span>
                <span>Hồ sơ cá nhân</span>
              </a>
              <a href="/profile?tab=garage" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                <span className="material-symbols-outlined">two_wheeler</span>
                <span>Nhà xe của tôi</span>
              </a>
              <a href="/profile?tab=appointments" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                <span className="material-symbols-outlined">event_available</span>
                <span>Lịch hẹn của tôi</span>
              </a>
              <div className="dropdown-divider" />
              <a href="/home" className="dropdown-item text-danger" onClick={handleLogout}>
                <span className="material-symbols-outlined">logout</span>
                <span>Đăng xuất</span>
              </a>
            </div>
          )}
        </div>
      </header>

      <main className="booking-main">
        <section className="booking-hero">
          <div>
            <span className="booking-eyebrow">Garage xe máy MOTOCORE</span>
            <h1>Đặt lịch rửa, bảo dưỡng và sửa xe máy</h1>
            <p>
              Chọn dịch vụ, khai báo xe máy và khung giờ đến garage. Cửa hàng xác nhận
              lịch rồi phân công kỹ thuật viên phụ trách.
            </p>
          </div>
          <div className="booking-status-flow">
            <span>Chờ xác nhận</span>
            <MaterialIcon>arrow_forward</MaterialIcon>
            <span>Đã xác nhận</span>
            <MaterialIcon>arrow_forward</MaterialIcon>
            <span>Đang sửa</span>
            <MaterialIcon>arrow_forward</MaterialIcon>
            <span>Hoàn tất</span>
            <MaterialIcon>arrow_forward</MaterialIcon>
            <span>Thanh toán</span>
          </div>
        </section>

        <section className="booking-content">
          <form className="booking-form" onSubmit={handleSubmit}>
            <div className="booking-step-heading">
              <span>01</span>
              <div>
                <h2>Chọn dịch vụ cho xe máy</h2>
                <p>Rửa xe, bảo dưỡng định kỳ hoặc sửa chữa theo tình trạng thực tế.</p>
              </div>
            </div>

            <div className="service-type-grid">
              <button
                className={serviceType === "wash" ? "selected" : ""}
                type="button"
                onClick={() => setServiceType("wash")}
              >
                <MaterialIcon>water_drop</MaterialIcon>
                <strong>Rửa xe</strong>
                <span>Rửa cơ bản, cao cấp, vệ sinh động cơ</span>
              </button>
              <button
                className={serviceType === "maintenance" ? "selected" : ""}
                type="button"
                onClick={() => setServiceType("maintenance")}
              >
                <MaterialIcon>oil_barrel</MaterialIcon>
                <strong>Bảo dưỡng</strong>
                <span>Nhớt, phanh, sên, lọc gió, kiểm tra tổng</span>
              </button>
              <button
                className={serviceType === "repair" ? "selected" : ""}
                type="button"
                onClick={() => setServiceType("repair")}
              >
                <MaterialIcon>build</MaterialIcon>
                <strong>Sửa chữa</strong>
                <span>Chẩn đoán lỗi, thay phụ tùng, xử lý kỹ thuật</span>
              </button>
            </div>

            {serviceType === "wash" ? (
              <div className="booking-group">
                <label>Chọn gói rửa xe máy</label>
                <div className="package-grid">
                  {washPackages.map((item) => (
                    <button
                      className={washPackage === item.id ? "selected" : ""}
                      key={item.id}
                      type="button"
                      onClick={() => setWashPackage(item.id)}
                    >
                      <strong>{item.name}</strong>
                      <span>{item.description}</span>
                      <small>
                        {item.price} • {item.duration}
                      </small>
                    </button>
                  ))}
                </div>
              </div>
            ) : serviceType === "maintenance" ? (
              <div className="booking-group">
                <label>Chọn gói bảo dưỡng</label>
                <div className="package-grid">
                  {maintenancePackages.map((item) => (
                    <button
                      className={maintenancePackage === item.id ? "selected" : ""}
                      key={item.id}
                      type="button"
                      onClick={() => setMaintenancePackage(item.id)}
                    >
                      <strong>{item.name}</strong>
                      <span>{item.description}</span>
                      <small>
                        {item.price} • {item.duration}
                      </small>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="booking-group">
                <label>Tình trạng / lỗi thường gặp</label>
                <div className="issue-grid">
                  {repairIssues.map((issue) => (
                    <button
                      className={repairIssue === issue ? "selected" : ""}
                      key={issue}
                      type="button"
                      onClick={() => setRepairIssue(issue)}
                    >
                      {issue}
                    </button>
                  ))}
                </div>
                <textarea
                  name="issue_description"
                  placeholder="Mô tả thêm: tiếng kêu, lúc nào bị, xe số hay tay ga..."
                  rows="4"
                />
              </div>
            )}

            <div className="booking-step-heading">
              <span>02</span>
              <div>
                <h2>Thông tin xe máy</h2>
                <p>Giúp kỹ thuật viên chuẩn bị đúng dụng cụ và phụ tùng.</p>
              </div>
            </div>

            <div className="booking-fields-grid">
              <label>
                Hãng xe
                <input name="vehicle_brand" placeholder={VEHICLE_BRAND_HINT} required type="text" />
              </label>
              <label>
                Dòng xe
                <input name="vehicle_model" placeholder={VEHICLE_MODEL_HINT} required type="text" />
              </label>
              <label>
                Biển số
                <input name="license_plate" placeholder={LICENSE_PLATE_HINT} required type="text" />
              </label>
              <label>
                Số km hiện tại
                <input max="999999" min="0" name="odometer" placeholder="12500" type="number" />
              </label>
              <label>
                Số điện thoại liên hệ
                <input name="contact_phone" placeholder="0912345678" type="tel" />
              </label>
            </div>

            <div className="booking-step-heading">
              <span>03</span>
              <div>
                <h2>Chọn ngày giờ đến garage</h2>
                <p>Lịch mới ở trạng thái chờ xác nhận cho đến khi cửa hàng duyệt.</p>
              </div>
            </div>

            <div className="booking-fields-grid booking-date-grid">
              <label>
                Ngày hẹn
                <input
                  min={getTomorrowDateValue()}
                  max={getMaxAppointmentDateValue()}
                  onChange={(event) => setAppointmentDate(event.target.value)}
                  required
                  type="date"
                  value={appointmentDate}
                />
              </label>

              <label>
                Chọn Buổi
                <select value={daySession} onChange={(event) => setDaySession(event.target.value)}>
                  <option value="morning">Buổi sáng (08:00 – 10:30)</option>
                  <option value="afternoon">Buổi chiều (13:30 – 18:00)</option>
                </select>
              </label>

              <label>
                Khung giờ
                <select value={timeSlot} onChange={(event) => setTimeSlot(event.target.value)} required>
                  <option value="">-- Chọn giờ --</option>
                  {daySession === "morning"
                    ? morningSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)
                    : afternoonSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)
                  }
                </select>
              </label>
            </div>

            <label className="booking-note">
              Ghi chú cho kỹ thuật viên
              <textarea name="note" placeholder="Ví dụ: xe tay ga, cần lấy trong ngày, gọi trước khi sửa..." rows="4" />
            </label>

            {submitError && (
              <div className="booking-alert booking-alert-error">
                <MaterialIcon>error</MaterialIcon>
                <span>{submitError}</span>
              </div>
            )}

            <button className="booking-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Đang gửi lịch..." : "Xác nhận đặt lịch"}
              <MaterialIcon>check_circle</MaterialIcon>
            </button>
          </form>

          <aside className="booking-side">
            <div className="booking-summary">
              <span className="summary-label">Tóm tắt lịch hẹn</span>
              <h2>{selectedService.name}</h2>
              <p>{selectedService.description}</p>
              <div className="summary-list">
                <div>
                  <MaterialIcon>payments</MaterialIcon>
                  <span>{selectedService.price}</span>
                </div>
                <div>
                  <MaterialIcon>schedule</MaterialIcon>
                  <span>{selectedService.duration}</span>
                </div>
                <div>
                  <MaterialIcon>event</MaterialIcon>
                  <span>
                    {appointmentDate ? `${formatDisplayDate(appointmentDate)} · ` : ""}
                    {timeSlot ? `Khung giờ ${timeSlot}` : "Chưa chọn khung giờ"}
                  </span>
                </div>
                <div>
                  <MaterialIcon>pending_actions</MaterialIcon>
                  <span>Sau khi gửi: chờ garage xác nhận</span>
                </div>
              </div>

              {submitResult && (
                <div className="booking-success">
                  <MaterialIcon>task_alt</MaterialIcon>
                  <div>
                    <strong>Đã gửi lịch thành công</strong>
                    <span>
                      {[
                        formatDisplayDate(normalizeAppointmentDate(submitResult.appointment_date)),
                        submitResult.time_slot,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      {". Garage sẽ liên hệ xác nhận."}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="booking-help-card">
              <div className="booking-help-icon">
                <h2>Lịch hẹn gần đây</h2>
                <a href="/profile?tab=appointments">Xem tất cả</a>
              </div>
              {isLoadingAppointments && <p className="appointment-empty">Đang tải lịch hẹn...</p>}

              {!isLoadingAppointments && appointmentsList.length === 0 && (
                <p className="appointment-empty">Chưa có lịch hẹn. Đặt lịch bên trái để bắt đầu.</p>
              )}

              {!isLoadingAppointments && appointmentsList.map((item) => (
                <article className="appointment-item" key={item._id || item.appointment_code}>
                  <div>
                    <strong>{getAppointmentService(item)}</strong>
                    <span>{getAppointmentVehicle(item)}</span>
                    <small>{formatAppointmentTime(item)}</small>
                  </div>
                  <div className="appointment-actions-inline">
                    <em className={`status-${getStatusClass(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </em>
                    {["PENDING", "CONFIRMED"].includes(item.status) && item._id && (
                      <button
                        aria-label="Hủy lịch hẹn"
                        disabled={cancellingId === item._id}
                        onClick={() => handleCancelAppointment(item._id)}
                        type="button"
                      >
                        <MaterialIcon>close</MaterialIcon>
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </section>
      </main>
      <CustomerChatWidget />
    </div>
  );
}