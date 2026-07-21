import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  cancelAppointment,
  getMyAppointmentById,
  getMyAppointments,
  reviewAppointment,
} from "../../services/appointmentApi";
import { clearAuthSession } from "../../services/authApi";
import { profileService } from "../../services/profileService";
import "../../styles/customer/UserProfile.css";
import CustomerChatWidget from "../../components/CustomerChatWidget";

function MaterialIcon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

const avatarFallback =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%23fff7ed"/><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="%23a04100"/></svg>';

const tabs = [
  { id: "info", icon: "person", label: "Thông tin" },
  { id: "password", icon: "lock", label: "Bảo mật" },
  { id: "appointments", icon: "event_available", label: "Lịch hẹn" },
  { id: "garage", icon: "two_wheeler", label: "Tình trạng xe" },
  { id: "vouchers", icon: "confirmation_number", label: "Ưu đãi" },
  { id: "logs", icon: "history", label: "Nhật ký" },
];

const fallbackAppointments = [
  {
    _id: "demo-appointment-1",
    appointment_code: "APT-20260528-01",
    appointment_date: "2026-05-30",
    time_slot: "09:30",
    status: "CONFIRMED",
    garage_branch: "MOTOCORE Mỹ Đình",
    service: {
      type: "MAINTENANCE",
      name: "Bảo dưỡng định kỳ",
      description: "Kiểm tra tổng quát, vệ sinh lọc gió, cân chỉnh phanh.",
      estimated_price: 280000,
      estimated_duration_minutes: 75,
    },
    vehicle: {
      brand: "Honda",
      model: "CBR650R",
      license_plate: "29A1-999.88",
      odometer: 12500,
    },
    customer_note: "Kiểm tra thêm tiếng kêu ở phanh trước.",
    staff_notes: "Đã tiếp nhận, chờ phân công kỹ thuật viên.",
    created_at: "2026-05-27T08:20:00.000Z",
  },
  {
    _id: "demo-ppointment-2",
    appointment_code: "APT-20260521-014",
    appointment_date: "2026-05-21",
    time_slot: "15:00",
    status: "COMPLETED",
    garage_branch: "MOTOCORE Cầu Giấy",
    service: {
      type: "WASH",
      name: "Rửa xe cao cấp",
      description: "Rửa bọt tuyết, vệ sinh mâm, chăm sóc nhựa nhám.",
      estimated_price: 80000,
      estimated_duration_minutes: 45,
    },
    vehicle: {
      brand: "Ducati",
      model: "Monster 821",
      license_plate: "29A1-123.45",
      odometer: 8700,
    },
    customer_note: "Rửa kỹ phần mâm sau.",
    staff_notes: "Hoàn thành và bàn giao xe sạch.",
    completed_at: "2026-05-21T09:30:00.000Z",
  },
];

function getStatusLabel(status) {
  const labels = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    IN_PROGRESS: "Đang xử lý",
    COMPLETED: "Hoàn thành",
    PAID: "Đã thanh toán",
    CANCELLED: "Đã hủy",
    REJECTED: "Từ chối",
    NO_SHOW: "Không đến",
  };

  return labels[status] || status || "Chưa rõ";
}

const APPOINTMENT_STATUS_FILTERS = [
  { value: "ALL", label: "Tất cả" },
  { value: "PENDING", label: "Chờ xác nhận" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "IN_PROGRESS", label: "Đang xử lý" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "PAID", label: "Đã thanh toán" },
  { value: "CANCELLED", label: "Đã hủy" },
];

function matchesAppointmentStatusFilter(status, filter) {
  if (filter === "ALL") return true;
  if (filter === "COMPLETED") return status === "COMPLETED" || status === "PAID";
  if (filter === "CANCELLED") return status === "CANCELLED" || status === "REJECTED" || status === "NO_SHOW";
  return status === filter;
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
    NO_SHOW: "cancelled",
  };

  return classes[status] || "pending";
}

function canReviewAppointment(appointment) {
  if (!appointment) return false;
  if (!["COMPLETED", "PAID"].includes(appointment.status)) return false;
  return !(Number(appointment.review?.rating) >= 1);
}

function hasAppointmentReview(appointment) {
  return Number(appointment?.review?.rating) >= 1;
}

function getAppointmentCode(appointment) {
  return appointment?.appointment_code || appointment?.code || appointment?._id || "Chưa có mã";
}

function getAppointmentService(appointment) {
  return appointment?.service?.name || appointment?.service || "Dịch vụ chưa xác định";
}

function formatAppointmentTime(appointment) {
  const date = appointment?.appointment_date || "";
  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return appointment?.time_slot || "Chưa có lịch";
  }

  return `${day}/${month}/${year} - ${appointment?.time_slot || appointment?.start_time || ""}`;
}

function formatCreatedDate(appointment) {
  const rawDate = appointment?.created_at || appointment?.createdAt || appointment?.created_date;

  if (!rawDate) {
    return "Chưa có ngày tạo";
  }

  return new Date(rawDate).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getServiceTypeLabel(appointment) {
  const serviceType = appointment?.service?.type || appointment?.service_type || "";
  const labels = {
    WASH: "Rửa xe",
    MAINTENANCE: "Bảo dưỡng",
    REPAIR: "Sửa xe",
  };

  return labels[serviceType.toUpperCase?.()] || serviceType || "Chưa xác định";
}

function getGarageBranch(appointment) {
  return (
    appointment?.garage_branch ||
    appointment?.branch?.name ||
    appointment?.garage?.name ||
    appointment?.location?.name ||
    "MOTOCORE Mỹ Đình"
  );
}

function formatMoney(value) {
  if (value === undefined || value === null || value === "") {
    return "Báo giá sau kiểm tra";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function UserProfile() {
  const [activeTab, setActiveTab] = useState("info");
  const [isSaving, setIsSaving] = useState(false);
  const [isApiLoading, setIsApiLoading] = useState(true);
  const [isUsingMock, setIsUsingMock] = useState(false);
  const [isAppointmentsLoading, setIsAppointmentsLoading] = useState(false);
  const [isAppointmentDetailLoading, setIsAppointmentDetailLoading] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const location = useLocation();

  const [user, setUser] = useState({
    fullname: "Nguyễn Hoàng Nam",
    email: "namnh.customer@gmail.com",
    phone: "0966 888 999",
    address: "18 Phạm Hùng, Mỹ Đình, Hà Nội",
    dob: "12/08/1998",
    avatar: avatarFallback,
    memberTier: "Gold Member",
    memberPoints: 450,
  });

  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [newBike, setNewBike] = useState({ brand: "", model: "", plate: "", year: "", color: "" });
  const [showAddBike, setShowAddBike] = useState(false);

  const [bikes, setBikes] = useState([
    { brand: "Honda", model: "CBR650R", plate: "29A1-999.88", year: "2023", color: "Đỏ đen" },
    { brand: "Ducati", model: "Monster 821", plate: "29A1-123.45", year: "2022", color: "Vàng cát" },
  ]);
  const [selectedBike, setSelectedBike] = useState(null);
  const bikeAppointments = selectedBike
  ? fallbackAppointments.filter(
      (appointment) =>
        appointment.vehicle?.license_plate === selectedBike.plate
    )
  : [];

  const [vouchers] = useState([
    { code: "MOTOCORE15", desc: "Giảm 15% gói rửa xe cao cấp", expiry: "30/06/2026", status: "Còn hiệu lực" },
    { code: "LUBEMOTUL", desc: "Tặng lon nhớt Motul 300V khi bảo dưỡng toàn diện", expiry: "15/07/2026", status: "Còn hiệu lực" },
  ]);

  const [logs, setLogs] = useState([
    { action: "Cập nhật thông tin tài khoản", status: "SUCCESS", time: "16:05 hôm nay" },
    { action: "Đặt lịch hẹn #APT-20260521-014", status: "SUCCESS", time: "21/05/2026" },
    { action: "Thay đổi mật khẩu tài khoản", status: "SUCCESS", time: "10/05/2026" },
  ]);
  const [appointments, setAppointments] = useState(fallbackAppointments);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [appointmentView, setAppointmentView] = useState("list");
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState("ALL");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const activeTabLabel = useMemo(
    () => tabs.find((tab) => tab.id === activeTab)?.label || "Thông tin",
    [activeTab]
  );

  const appointmentFilterCounts = useMemo(() => {
    const counts = { ALL: appointments.length };
    APPOINTMENT_STATUS_FILTERS.forEach((filter) => {
      if (filter.value === "ALL") return;
      counts[filter.value] = appointments.filter((item) =>
        matchesAppointmentStatusFilter(item.status, filter.value)
      ).length;
    });
    return counts;
  }, [appointments]);

  const filteredAppointments = useMemo(
    () =>
      appointments.filter((item) =>
        matchesAppointmentStatusFilter(item.status, appointmentStatusFilter)
      ),
    [appointments, appointmentStatusFilter]
  );

  useEffect(() => {
    if (!selectedAppointment) return;
    const stillVisible = filteredAppointments.some(
      (item) => item._id === selectedAppointment._id || item.appointment_code === selectedAppointment.appointment_code
    );
    if (!stillVisible) {
      setSelectedAppointment(null);
      setAppointmentView("list");
    }
  }, [filteredAppointments, selectedAppointment]);

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get("tab");
    if (tabs.some((item) => item.id === tab)) {
      setActiveTab(tab);
      if (tab === "appointments") {
        setAppointmentView("list");
      }
    }
  }, [location]);

  useEffect(() => {
    const fetchProfileData = async () => {
      setIsApiLoading(true);
      try {
        const res = await profileService.getMe();
        if (res?.success && res.data) {
          const apiUser = res.data.user || res.data;
          setUser((prev) => ({
            ...prev,
            fullname: apiUser.full_name || apiUser.fullname || prev.fullname,
            email: apiUser.email || prev.email,
            phone: apiUser.phone || prev.phone,
          }));
          setIsUsingMock(false);
        }
      } catch (err) {
        console.log("Could not load API profile, falling back to mock data:", err.message);
        setIsUsingMock(true);
      } finally {
        setIsApiLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (showUserMenu && !event.target.closest(".booking-actions")) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showUserMenu]);

  useEffect(() => {
    if (activeTab !== "logs" || isUsingMock) {
      return;
    }

    const fetchLogs = async () => {
      try {
        const res = await profileService.getActivityLogs(1, 10);
        if (res?.success && res.data?.logs) {
          setLogs(
            res.data.logs.map((item) => ({
              action:
                item.action === "PROFILE_UPDATE"
                  ? "Cập nhật thông tin tài khoản"
                  : item.action === "PASSWORD_CHANGE"
                    ? "Thay đổi mật khẩu tài khoản"
                    : item.action,
              status: item.status,
              time: new Date(item.created_at || item.timestamp).toLocaleString("vi-VN"),
            }))
          );
        }
      } catch (err) {
        console.warn("Failed to fetch logs, keeping fallback logs:", err.message);
      }
    };

    fetchLogs();
  }, [activeTab, isUsingMock]);

  useEffect(() => {
    if (activeTab !== "appointments") {
      return;
    }

    const fetchAppointments = async () => {
      setIsAppointmentsLoading(true);
      try {
        const res = await getMyAppointments({ page: 1, limit: 10 });
        const nextAppointments = res.data?.appointments || [];

        if (nextAppointments.length) {
          setAppointments(nextAppointments);
          setSelectedAppointment((prev) =>
            prev && nextAppointments.some((item) => item._id === prev._id) ? prev : null
          );
        }
      } catch (err) {
        console.warn("Failed to fetch appointments, keeping fallback appointments:", err.message);
      } finally {
        setIsAppointmentsLoading(false);
      }
    };

    fetchAppointments();
  }, [activeTab]);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 2800);
  };

  const handleLogout = () => {
    clearAuthSession();
    setShowUserMenu(false);
  };

  const handleInfoChange = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleAvatarClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        setUser((prev) => ({ ...prev, avatar: readerEvent.target.result }));
        showToast("Đã cập nhật ảnh đại diện.");
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (!user.fullname.trim() || !user.phone.trim()) {
      showToast("Vui lòng nhập đầy đủ họ tên và số điện thoại.", "error");
      return;
    }

    setIsSaving(true);
    try {
      if (!isUsingMock) {
        await profileService.updateProfile({ fullname: user.fullname, phone: user.phone });
      }
      showToast("Đã lưu thông tin hồ sơ.");
    } catch (err) {
      showToast(err.message || "Không thể cập nhật hồ sơ trên máy chủ.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      showToast("Vui lòng nhập đầy đủ các ô mật khẩu.", "error");
      return;
    }

    if (passwords.new.length < 6) {
      showToast("Mật khẩu mới phải từ 6 ký tự trở lên.", "error");
      return;
    }

    if (passwords.new !== passwords.confirm) {
      showToast("Mật khẩu xác nhận không khớp.", "error");
      return;
    }

    setIsSaving(true);
    try {
      if (!isUsingMock) {
        await profileService.changePassword({ current: passwords.current, new: passwords.new });
      }
      showToast("Đã đổi mật khẩu tài khoản.");
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (err) {
      showToast(err.message || "Sai mật khẩu hiện tại hoặc lỗi kết nối.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBike = (e) => {
    e.preventDefault();
    if (!newBike.brand || !newBike.model || !newBike.plate) {
      showToast("Vui lòng điền hãng xe, dòng xe và biển số.", "error");
      return;
    }

    setBikes((prev) => [...prev, newBike]);
    setNewBike({ brand: "", model: "", plate: "", year: "", color: "" });
    setShowAddBike(false);
    showToast("Đã thêm xe vào nhà xe cá nhân.");
  };

  const handleSelectAppointment = async (appointment) => {
    setSelectedAppointment(appointment);
    setAppointmentView("detail");
    setReviewRating(Number(appointment?.review?.rating) || 0);
    setReviewHover(0);
    setReviewComment(appointment?.review?.comment || "");

    if (!appointment?._id || appointment._id.startsWith("demo-")) {
      return;
    }

    setIsAppointmentDetailLoading(true);
    try {
      const res = await getMyAppointmentById(appointment._id);
      if (res.data?.appointment) {
        const detail = res.data.appointment;
        setSelectedAppointment(detail);
        setReviewRating(Number(detail.review?.rating) || 0);
        setReviewComment(detail.review?.comment || "");
      }
    } catch (err) {
      showToast(err.message || "Không thể tải chi tiết lịch hẹn.", "error");
    } finally {
      setIsAppointmentDetailLoading(false);
    }
  };

  const applyReviewedAppointment = (reviewedAppointment) => {
    setAppointments((prev) =>
      prev.map((item) =>
        item._id === reviewedAppointment._id || item.appointment_code === reviewedAppointment.appointment_code
          ? { ...item, ...reviewedAppointment }
          : item
      )
    );
    setSelectedAppointment((prev) =>
      prev && (prev._id === reviewedAppointment._id || prev.appointment_code === reviewedAppointment.appointment_code)
        ? { ...prev, ...reviewedAppointment }
        : prev
    );
  };

  const handleSubmitReview = async (event) => {
    event.preventDefault();
    if (!selectedAppointment) return;

    if (!canReviewAppointment(selectedAppointment)) {
      showToast("Chỉ đánh giá được sau khi đơn hoàn thành và chưa đánh giá trước đó.", "error");
      return;
    }

    if (reviewRating < 1 || reviewRating > 5) {
      showToast("Vui lòng chọn số sao từ 1 đến 5.", "error");
      return;
    }

    if (!selectedAppointment._id || selectedAppointment._id.startsWith("demo-")) {
      const demoReview = {
        ...selectedAppointment,
        review: {
          rating: reviewRating,
          comment: reviewComment.trim() || null,
          created_at: new Date().toISOString(),
        },
      };
      applyReviewedAppointment(demoReview);
      showToast("Đã gửi đánh giá dịch vụ (demo).");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const res = await reviewAppointment(selectedAppointment._id, {
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      if (res.data?.appointment) {
        applyReviewedAppointment(res.data.appointment);
      }
      showToast("Cảm ơn bạn đã đánh giá dịch vụ.");
    } catch (err) {
      showToast(err.message || "Không thể gửi đánh giá.", "error");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!appointmentId || appointmentId.startsWith("demo-")) {
      showToast("Lịch hẹn demo không thể hủy trên máy chủ.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const res = await cancelAppointment(appointmentId, "Khách hàng hủy từ trang hồ sơ");
      const cancelledAppointment = res.data?.appointment;
      setAppointments((prev) =>
        prev.map((item) =>
          item._id === appointmentId ? { ...item, status: "CANCELLED", ...cancelledAppointment } : item
        )
      );
      setSelectedAppointment((prev) =>
        prev?._id === appointmentId ? { ...prev, status: "CANCELLED", ...cancelledAppointment } : prev
      );
      showToast("Đã hủy lịch hẹn.");
    } catch (err) {
      showToast(err.message || "Không thể hủy lịch hẹn.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackToAppointmentList = () => {
    setAppointmentView("list");
    setSelectedAppointment(null);
  };

  return (
    <div className="user-profile-page">
      {toast.show && (
        <div className={`custom-toast ${toast.type}`}>
          <div className="toast-content">
            <MaterialIcon>{toast.type === "error" ? "error" : "task_alt"}</MaterialIcon>
            <p>{toast.message}</p>
          </div>
        </div>
      )}

      <header className="booking-header">
        <a className="booking-logo" href="/home">
          MOTOCORE
        </a>
        <nav className="booking-nav" aria-label="Điều hướng tài khoản">
          <a href="/home">Trang chủ</a>
          <a href="/services">Dịch vụ</a>
          <a href="/booking">Lịch hẹn</a>
          <a href="/about">Về chúng tôi</a>
        </nav>
        <div className="booking-actions">
          <button className="icon-button" type="button" aria-label="Tìm kiếm">
            <MaterialIcon>search</MaterialIcon>
          </button>
          <a className="booking-contact-button" href="/booking">
            Đặt lịch ngay
          </a>
          <button className="user-menu-trigger" type="button" aria-label="Menu" onClick={() => setShowUserMenu(!showUserMenu)}>
            <MaterialIcon>menu</MaterialIcon>
          </button>

          {showUserMenu && (
            <div className="user-dropdown-menu">
              <a href="/profile?tab=info" className="dropdown-user-info" onClick={() => setShowUserMenu(false)}>
                <div className="dropdown-avatar">
                  <img src={user.avatar} alt="Ảnh đại diện" />
                </div>
                <div className="dropdown-user-details">
                  <strong>{user.fullname}</strong>
                  <span>{user.email}</span>
                </div>
              </a>
              <div className="dropdown-divider" />
              <a href="/profile?tab=info" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                <MaterialIcon>person</MaterialIcon>
                <span>Hồ sơ cá nhân</span>
              </a>
              <a href="/profile?tab=garage" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                <MaterialIcon>two_wheeler</MaterialIcon>
                <span>Tình trạng xe của tôi</span>
              </a>
              <a href="/profile?tab=appointments" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                <MaterialIcon>event_available</MaterialIcon>
                <span>Lịch hẹn của tôi</span>
              </a>
              <a href="/support" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                <MaterialIcon>chat</MaterialIcon>
                <span>Chat hỗ trợ</span>
              </a>
              <div className="dropdown-divider" />
              <a href="/home" className="dropdown-item text-danger" onClick={handleLogout}>
                <MaterialIcon>logout</MaterialIcon>
                <span>Đăng xuất</span>
              </a>
            </div>
          )}
        </div>
      </header>

      <main className="profile-main">
        <section className="profile-content-grid">
          <aside className="user-overview-card">
            <div className="user-avatar-section">
              <div className="user-avatar-container">
                <img src={user.avatar} alt="Ảnh đại diện" className="user-avatar-img" />
                <button className="user-avatar-overlay" onClick={handleAvatarClick} type="button" title="Thay đổi ảnh đại diện">
                  <MaterialIcon>photo_camera</MaterialIcon>
                </button>
              </div>
              <h2>{user.fullname}</h2>
              <span className="member-badge">
                <MaterialIcon>stars</MaterialIcon>
                {user.memberTier}
              </span>
              <p className="user-points">Điểm tích lũy: <strong>{user.memberPoints} pts</strong></p>
            </div>

            <div className="user-mini-stats">
              <div>
                <span>Xe</span>
                <strong>{bikes.length}</strong>
              </div>
              <div>
                <span>Ưu đãi</span>
                <strong>{vouchers.length}</strong>
              </div>
              <div>
                <span>Đơn xong</span>
                <strong>{appointments.filter((item) => item.status === "COMPLETED" || item.status === "PAID").length}</strong>
              </div>
            </div>

            <div className="profile-contact-card">
              <div>
                <MaterialIcon>mail</MaterialIcon>
                <span>{user.email}</span>
              </div>
              <div>
                <MaterialIcon>call</MaterialIcon>
                <span>{user.phone}</span>
              </div>
              <div>
                <MaterialIcon>location_on</MaterialIcon>
                <span>{user.address}</span>
              </div>
            </div>

            <a href="/support" className="booking-contact-button" style={{ display: "inline-flex", justifyContent: "center", width: "100%", marginTop: 12, textDecoration: "none" }}>
              Chat hỗ trợ garage
            </a>

            <div className="membership-perks">
              <h3>Đặc quyền hạng vàng</h3>
              <ul>
                <li>Giảm 10% dịch vụ rửa xe</li>
                <li>Ưu tiên đặt ca giờ cao điểm</li>
                <li>Miễn phí kiểm tra điện và ốc định kỳ</li>
              </ul>
            </div>
          </aside>

          <section className="user-tabs-card">
            <div className="user-tabs-menu" aria-label="Nhóm thông tin hồ sơ">
              {tabs.map((tab) => (
                <button
                  className={`user-tab-btn ${activeTab === tab.id ? "active" : ""}`}
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === "appointments") {
                      setAppointmentView("list");
                    }
                  }}
                  type="button"
                >
                  <MaterialIcon>{tab.icon}</MaterialIcon>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="user-tabs-content">
              <div className="profile-section-heading">
                <span>{activeTabLabel}</span>
                <h2>
                  {activeTab === "info" && "Thông tin cá nhân"}
                  {activeTab === "password" && "Mật khẩu và bảo mật"}
                  {activeTab === "appointments" && "Lịch hẹn của tôi"}
                  {activeTab === "garage" && "Nhà xe cá nhân"}
                  {activeTab === "vouchers" && "Ưu đãi thành viên"}
                  {activeTab === "logs" && "Nhật ký tài khoản"}
                </h2>
              </div>
            

              {activeTab === "info" && (
                <form onSubmit={handleSaveInfo} className="pane-fade-animation">
                  <p className="profile-panel-note">Thông tin này được dùng khi garage gọi xác nhận lịch hẹn và bàn giao xe.</p>
                  <div className="user-form-grid">
                    <label className="user-input-label">
                      Họ và tên *
                      <input name="fullname" type="text" value={user.fullname} onChange={handleInfoChange} />
                    </label>
                    <label className="user-input-label">
                      Email
                      <input name="email" type="email" value={user.email} disabled className="input-disabled" />
                    </label>
                    <label className="user-input-label">
                      Số điện thoại *
                      <input name="phone" type="tel" value={user.phone} onChange={handleInfoChange} />
                    </label>
                    <label className="user-input-label">
                      Ngày sinh
                      <input name="dob" type="text" value={user.dob} onChange={handleInfoChange} placeholder="DD/MM/YYYY" />
                    </label>
                    <label className="user-input-label span-2">
                      Địa chỉ thường trú
                      <input name="address" type="text" value={user.address} onChange={handleInfoChange} />
                    </label>
                  </div>
                  <div className="user-form-actions">
                    <button className="user-btn-save" type="submit" disabled={isSaving}>
                      <MaterialIcon>save</MaterialIcon>
                      <span>{isSaving ? "Đang lưu..." : "Lưu thay đổi"}</span>
                    </button>
                  </div>
                </form>
              )}

              {activeTab === "password" && (
                <form onSubmit={handleSavePassword} className="pane-fade-animation">
                  <p className="profile-panel-note">Đặt mật khẩu riêng, dễ nhớ với bạn nhưng khó đoán với người khác.</p>
                  <div className="user-form-column">
                    {[
                      ["current", "Mật khẩu hiện tại *"],
                      ["new", "Mật khẩu mới *"],
                      ["confirm", "Nhập lại mật khẩu mới *"],
                    ].map(([field, label]) => (
                      <label className="user-input-label" key={field}>
                        {label}
                        <div className="user-pass-wrapper">
                          <input
                            name={field}
                            type={showPassword[field] ? "text" : "password"}
                            value={passwords[field]}
                            onChange={handlePasswordChange}
                            placeholder={field === "new" ? "Tối thiểu 6 ký tự" : ""}
                          />
                          <button type="button" className="btn-eye-toggle" onClick={() => togglePasswordVisibility(field)}>
                            <MaterialIcon>{showPassword[field] ? "visibility_off" : "visibility"}</MaterialIcon>
                          </button>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="user-form-actions">
                    <button className="user-btn-save" type="submit" disabled={isSaving}>
                      <MaterialIcon>lock_reset</MaterialIcon>
                      <span>{isSaving ? "Đang cập nhật..." : "Đổi mật khẩu"}</span>
                    </button>
                  </div>
                </form>
              )}

              {activeTab === "appointments" && (
                <div className="pane-fade-animation">
                  <div className="profile-panel-toolbar">
                    <p className="profile-panel-note">Theo dõi trạng thái lịch hẹn, xe đã đặt, dịch vụ đã chọn và ghi chú xử lý từ garage.</p>
                    <a className="user-btn-add-bike" href="/booking">
                      <MaterialIcon>add</MaterialIcon>
                      <span>Đặt lịch mới</span>
                    </a>
                  </div>

                  <div className={`appointments-workspace ${appointmentView === "detail" ? "show-detail" : "show-list"}`}>
                    <div className="appointments-list-panel">
                      <div className="appointments-list-heading">
                        <h3>Danh sách lịch hẹn</h3>
                        {isAppointmentsLoading && <span>Đang tải...</span>}
                      </div>

                      <div className="appointment-status-filters" role="tablist" aria-label="Lọc theo trạng thái">
                        {APPOINTMENT_STATUS_FILTERS.map((filter) => {
                          const count = appointmentFilterCounts[filter.value] ?? 0;
                          if (filter.value !== "ALL" && count === 0) return null;
                          return (
                            <button
                              aria-selected={appointmentStatusFilter === filter.value}
                              className={`appointment-filter-chip ${appointmentStatusFilter === filter.value ? "active" : ""}`}
                              key={filter.value}
                              onClick={() => setAppointmentStatusFilter(filter.value)}
                              type="button"
                            >
                              {filter.label}
                              <em>{count}</em>
                            </button>
                          );
                        })}
                      </div>

                      {appointments.length === 0 ? (
                        <div className="appointment-empty-state">
                          <MaterialIcon>event_busy</MaterialIcon>
                          <strong>Chưa có lịch hẹn</strong>
                          <span>Bạn có thể đặt lịch mới để garage chuẩn bị dịch vụ trước.</span>
                        </div>
                      ) : filteredAppointments.length === 0 ? (
                        <div className="appointment-empty-state">
                          <MaterialIcon>filter_alt_off</MaterialIcon>
                          <strong>Không có lịch phù hợp</strong>
                          <span>Không có đơn nào ở trạng thái đã chọn. Thử bộ lọc khác.</span>
                        </div>
                      ) : (
                        filteredAppointments.map((appointment) => (
                          <button
                            className={`appointment-row ${selectedAppointment?._id === appointment._id ? "active" : ""}`}
                            key={appointment._id || appointment.appointment_code}
                            onClick={() => handleSelectAppointment(appointment)}
                            type="button"
                          >
                            <span className={`appointment-status-dot ${getStatusClass(appointment.status)}`} />
                            <span className="appointment-row-content">
                              <span className="appointment-code-line">
                                <span>
                                  <small>Mã đơn</small>
                                  <strong>{getAppointmentCode(appointment)}</strong>
                                </span>
                                <span className={`appointment-status status-${getStatusClass(appointment.status)}`}>
                                  {getStatusLabel(appointment.status)}
                                </span>
                              </span>
                              <span className="appointment-meta-grid">
                                <span>
                                  <small>Ngày tạo đơn</small>
                                  <strong>{formatCreatedDate(appointment)}</strong>
                                </span>
                                <span>
                                  <small>Loại dịch vụ</small>
                                  <strong>{getServiceTypeLabel(appointment)}</strong>
                                </span>
                                <span>
                                  <small>Thời gian hẹn</small>
                                  <strong>{formatAppointmentTime(appointment)}</strong>
                                </span>
                              </span>
                              {hasAppointmentReview(appointment) && (
                                <span className="appointment-reviewed-tag">
                                  <MaterialIcon>star</MaterialIcon>
                                  Đã đánh giá {appointment.review.rating}/5
                                </span>
                              )}
                            </span>
                          </button>
                        ))
                      )}
                    </div>

                    <div className="appointment-detail-panel">
                      {selectedAppointment ? (
                        <>
                          <div className="appointment-detail-top">
                            <div>
                              <button className="appointment-back-button" onClick={handleBackToAppointmentList} type="button">
                                <MaterialIcon>arrow_back</MaterialIcon>
                                <span>Quay lại danh sách</span>
                              </button>
                              <span className="profile-eyebrow">Chi tiết đơn đặt lịch</span>
                              <h3>{getAppointmentCode(selectedAppointment)}</h3>
                              <p>{formatAppointmentTime(selectedAppointment)}</p>
                            </div>
                            <span className={`appointment-status status-${getStatusClass(selectedAppointment.status)}`}>
                              {getStatusLabel(selectedAppointment.status)}
                            </span>
                          </div>

                          {isAppointmentDetailLoading && (
                            <div className="appointment-detail-loading">
                              <MaterialIcon className="spin">progress_activity</MaterialIcon>
                              <span>Đang tải chi tiết...</span>
                            </div>
                          )}

                          <div className="appointment-detail-grid">
                            <div className="appointment-detail-block">
                              <span>Dịch vụ</span>
                              <strong>{getAppointmentService(selectedAppointment)}</strong>
                              <p>{selectedAppointment.service?.description || selectedAppointment.service?.repair_issue || "Chưa có mô tả dịch vụ."}</p>
                            </div>
                            <div className="appointment-detail-block">
                              <span>Chi phí dự kiến</span>
                              <strong>{formatMoney(selectedAppointment.service?.estimated_price)}</strong>
                              <p>{selectedAppointment.service?.estimated_duration_minutes || selectedAppointment.estimated_duration || 60} phút xử lý dự kiến</p>
                            </div>
                            <div className="appointment-detail-block">
                              <span>Thông tin xe</span>
                              <strong>
                                {selectedAppointment.vehicle?.brand || selectedAppointment.vehicle_info?.brand || "Chưa rõ hãng"}{" "}
                                {selectedAppointment.vehicle?.model || selectedAppointment.vehicle_info?.model || ""}
                              </strong>
                              <p>
                                Biển số: {selectedAppointment.vehicle?.license_plate || selectedAppointment.vehicle_info?.license_plate || "Chưa có"}
                                {selectedAppointment.vehicle?.odometer ? ` · ${selectedAppointment.vehicle.odometer} km` : ""}
                              </p>
                            </div>
                            <div className="appointment-detail-block">
                              <span>Liên hệ</span>
                              <strong>{selectedAppointment.customer_snapshot?.full_name || user.fullname}</strong>
                              <p>{selectedAppointment.customer_snapshot?.phone || user.phone}</p>
                            </div>
                          </div>

                          <div className="appointment-note-grid">
                            <div>
                              <span>Ghi chú khách hàng</span>
                              <p>{selectedAppointment.customer_note || selectedAppointment.customer_notes || "Không có ghi chú thêm."}</p>
                            </div>
                            <div>
                              <span>Ghi chú garage</span>
                              <p>{selectedAppointment.staff_notes || "Garage chưa cập nhật ghi chú xử lý."}</p>
                            </div>
                          </div>

                          {["PENDING", "CONFIRMED"].includes(selectedAppointment.status) && (
                            <div className="appointment-detail-actions">
                              <button
                                className="appointment-cancel-button"
                                disabled={isSaving}
                                onClick={() => handleCancelAppointment(selectedAppointment._id)}
                                type="button"
                              >
                                <MaterialIcon>event_busy</MaterialIcon>
                                <span>{isSaving ? "Đang hủy..." : "Hủy lịch hẹn"}</span>
                              </button>
                            </div>
                          )}

                          {(canReviewAppointment(selectedAppointment) || hasAppointmentReview(selectedAppointment)) && (
                            <section className="appointment-review-panel">
                              <div className="appointment-review-heading">
                                <MaterialIcon>star</MaterialIcon>
                                <div>
                                  <h4>{hasAppointmentReview(selectedAppointment) ? "Đánh giá của bạn" : "Đánh giá dịch vụ"}</h4>
                                  <p>
                                    {hasAppointmentReview(selectedAppointment)
                                      ? "Cảm ơn bạn đã góp ý cho garage."
                                      : "Chỉ mở sau khi đơn hoàn thành. Chọn số sao và gửi nhận xét."}
                                  </p>
                                </div>
                              </div>

                              {hasAppointmentReview(selectedAppointment) ? (
                                <div className="appointment-review-readonly">
                                  <div className="appointment-star-row" aria-label={`${selectedAppointment.review.rating} sao`}>
                                    {[1, 2, 3, 4, 5].map((value) => (
                                      <MaterialIcon
                                        key={value}
                                        className={value <= selectedAppointment.review.rating ? "filled" : ""}
                                      >
                                        star
                                      </MaterialIcon>
                                    ))}
                                  </div>
                                  <p>{selectedAppointment.review.comment || "Không có nhận xét thêm."}</p>
                                </div>
                              ) : (
                                <form className="appointment-review-form" onSubmit={handleSubmitReview}>
                                  <div className="appointment-star-row" role="radiogroup" aria-label="Chọn số sao">
                                    {[1, 2, 3, 4, 5].map((value) => {
                                      const active = value <= (reviewHover || reviewRating);
                                      return (
                                        <button
                                          aria-checked={reviewRating === value}
                                          aria-label={`${value} sao`}
                                          className={`appointment-star-button ${active ? "active" : ""}`}
                                          key={value}
                                          onClick={() => setReviewRating(value)}
                                          onMouseEnter={() => setReviewHover(value)}
                                          onMouseLeave={() => setReviewHover(0)}
                                          role="radio"
                                          type="button"
                                        >
                                          <MaterialIcon>star</MaterialIcon>
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <label htmlFor="appointment-review-comment">Nhận xét (tuỳ chọn)</label>
                                  <textarea
                                    id="appointment-review-comment"
                                    maxLength={1000}
                                    onChange={(event) => setReviewComment(event.target.value)}
                                    placeholder="Chất lượng sửa chữa, thái độ nhân viên, thời gian chờ..."
                                    rows={3}
                                    value={reviewComment}
                                  />
                                  <button className="appointment-review-submit" disabled={isSubmittingReview} type="submit">
                                    <MaterialIcon>rate_review</MaterialIcon>
                                    <span>{isSubmittingReview ? "Đang gửi..." : "Gửi đánh giá"}</span>
                                  </button>
                                </form>
                              )}
                            </section>
                          )}
                        </>
                      ) : (
                        <div className="appointment-empty-state">
                          <MaterialIcon>event_note</MaterialIcon>
                          <strong>Chọn một lịch hẹn</strong>
                          <span>Chi tiết đơn đặt lịch sẽ hiển thị tại đây.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "garage" && (
  <div className="pane-fade-animation">
    <div className="profile-panel-toolbar">
      <p className="profile-panel-note">
        Lưu sẵn xe của bạn để đặt lịch nhanh hơn ở những lần tiếp theo.
      </p>

      <button
        className="user-btn-add-bike"
        onClick={() => setShowAddBike(!showAddBike)}
        type="button"
      >
        <MaterialIcon>{showAddBike ? "close" : "add"}</MaterialIcon>
        <span>{showAddBike ? "Đóng" : "Thêm xe"}</span>
      </button>
    </div>

    {/* FORM thêm xe */}
    {showAddBike && (
      <form onSubmit={handleAddBike} className="add-bike-inline-form">
        <div className="user-form-grid">
          <label>
            Hãng xe *
            <input
              value={newBike.brand}
              onChange={(e) =>
                setNewBike({ ...newBike, brand: e.target.value })
              }
            />
          </label>

          <label>
            Dòng xe *
            <input
              value={newBike.model}
              onChange={(e) =>
                setNewBike({ ...newBike, model: e.target.value })
              }
            />
          </label>

          <label>
            Biển số *
            <input
              value={newBike.plate}
              onChange={(e) =>
                setNewBike({ ...newBike, plate: e.target.value })
              }
            />
          </label>

          <label>
            Màu sắc
            <input
              value={newBike.color}
              onChange={(e) =>
                setNewBike({ ...newBike, color: e.target.value })
              }
            />
          </label>

          <label>
            Năm sản xuất
            <input
              value={newBike.year}
              onChange={(e) =>
                setNewBike({ ...newBike, year: e.target.value })
              }
            />
          </label>
        </div>

        <button type="submit" className="user-submit-bike-btn">
          <MaterialIcon>check_circle</MaterialIcon>
          Lưu xe
        </button>
      </form>
    )}

    {/* LIST XE */}
    <div className="bikes-grid-layout">
      {bikes.map((bike) => (
        <article
          key={bike.plate}
          className={`bike-card-item ${
            selectedBike?.plate === bike.plate ? "active" : ""
          }`}
          onClick={() => setSelectedBike(bike)}
        >
          <div className="bike-icon-box">
            <MaterialIcon>two_wheeler</MaterialIcon>
          </div>

          <div className="bike-details-info">
            <h3>
              {bike.brand} {bike.model}
            </h3>
            <p>{bike.plate}</p>

            <div>
              <span>{bike.color || "Chưa chọn màu"}</span>
              <span>{bike.year || "Chưa rõ đời xe"}</span>
            </div>
          </div>
        </article>
      ))}
    </div>

    {/* DETAIL XE */}
    {selectedBike && (
      <div className="bike-detail-wrapper">
        <h3>
          {selectedBike.brand} {selectedBike.model}
        </h3>

        {bikeAppointments?.length > 0 ? (
          bikeAppointments.map((appointment) => (
            <div key={appointment._id}>
              <p>Mã lịch: {appointment.appointment_code}</p>
              <p>Dịch vụ: {appointment.service?.name}</p>
              <p>Ngày: {appointment.appointment_date}</p>
            </div>
          ))
        ) : (
          <p>Xe này chưa có lịch sử.</p>
        )}
      </div>
    )}
  </div>
)}


   {activeTab === "vouchers" && (
                <div className="pane-fade-animation">
                  <p className="profile-panel-note">Các ưu đãi đang có thể dùng khi đặt lịch tại MOTOCORE.</p>
                  <div className="vouchers-grid-layout">
                    {vouchers.map((voucher) => (
                      <article className="voucher-card-item" key={voucher.code}>
                        <div className="voucher-logo-area">
                          <MaterialIcon>confirmation_number</MaterialIcon>
                        </div>
                        <div className="voucher-details-area">
                          <div className="voucher-header-line">
                            <span className="voucher-badge-code">{voucher.code}</span>
                            <span className="voucher-status-text">{voucher.status}</span>
                          </div>
                          <h3>{voucher.desc}</h3>
                          <p>Hạn dùng: {voucher.expiry}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "logs" && (
                <div className="pane-fade-animation">
                  <p className="profile-panel-note">Theo dõi những thay đổi quan trọng liên quan tới tài khoản của bạn.</p>
                  <div className="user-timeline-list">
                    {logs.map((log, idx) => (
                      <article className="user-timeline-item" key={`${log.action}-${idx}`}>
                        <span className="user-timeline-icon">
                          <MaterialIcon>{log.action.toLowerCase().includes("mật khẩu") ? "lock" : "settings"}</MaterialIcon>
                        </span>
                        <div className="user-timeline-card">
                          <div className="user-timeline-header">
                            <h3>{log.action}</h3>
                            <span>{log.time}</span>
                          </div>
                          <span className={`log-status-badge ${log.status.toLowerCase()}`}>
                            {log.status === "SUCCESS" ? "Thành công" : "Thất bại"}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </section>
      </main>
      <CustomerChatWidget />
    </div>
  );
};

