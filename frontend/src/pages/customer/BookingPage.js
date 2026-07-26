import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cancelAppointment, createAppointment, getMyAppointments } from "../../services/appointmentApi";
import { getBookableServices } from "../../services/catalogServiceApi";
import "../../styles/customer/BookingPage.css";
import { clearAuthSession } from "../../services/authApi";
import { profileService } from "../../services/profileService";
import { getNotifications, markAsRead as markNotificationAsRead, markAllAsRead as markAllNotificationsAsRead } from "../../services/notificationApi";
import CustomerChatWidget from "../../components/CustomerChatWidget";

const UNKNOWN_REPAIR_OPTION = {
  id: "repair-unknown-issue",
  name: "Không rõ lỗi / Cần kiểm tra",
  price: "Báo giá sau kiểm tra",
  duration: "45–90 phút",
  description:
    "Chưa biết xe hư gì? Đặt lịch trước, kỹ thuật viên kiểm tra rồi mới chẩn đoán lỗi và báo giá công.",
  fromCatalog: false,
  isUnknownIssue: true,
};

function withUnknownRepairOption(packages = []) {
  const withoutDuplicate = packages.filter(
    (item) => item.id !== UNKNOWN_REPAIR_OPTION.id && !item.isUnknownIssue
  );
  return [UNKNOWN_REPAIR_OPTION, ...withoutDuplicate];
}

const FALLBACK_WASH_PACKAGES = [
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

const FALLBACK_MAINTENANCE_PACKAGES = [
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

const FALLBACK_REPAIR_ISSUES = withUnknownRepairOption([
  {
    id: "repair-fallback-1",
    name: "Xe khó nổ / chết máy",
    price: "Báo giá sau kiểm tra",
    duration: "45–90 phút",
    description: "Kỹ thuật viên kiểm tra xe máy rồi báo giá trước khi sửa.",
  },
  {
    id: "repair-fallback-2",
    name: "Phanh kêu hoặc yếu",
    price: "Báo giá sau kiểm tra",
    duration: "45–90 phút",
    description: "Kỹ thuật viên kiểm tra xe máy rồi báo giá trước khi sửa.",
  },
  {
    id: "repair-fallback-3",
    name: "Động cơ ồn / rung",
    price: "Báo giá sau kiểm tra",
    duration: "45–90 phút",
    description: "Kỹ thuật viên kiểm tra xe máy rồi báo giá trước khi sửa.",
  },
  {
    id: "repair-fallback-4",
    name: "Điện – đèn – đề",
    price: "Báo giá sau kiểm tra",
    duration: "45–90 phút",
    description: "Kỹ thuật viên kiểm tra xe máy rồi báo giá trước khi sửa.",
  },
  {
    id: "repair-fallback-5",
    name: "Lốp / săm / vành",
    price: "Báo giá sau kiểm tra",
    duration: "45–90 phút",
    description: "Kỹ thuật viên kiểm tra xe máy rồi báo giá trước khi sửa.",
  },
  {
    id: "repair-fallback-6",
    name: "Sên, nhông, bố thắng",
    price: "Báo giá sau kiểm tra",
    duration: "45–90 phút",
    description: "Kỹ thuật viên kiểm tra xe máy rồi báo giá trước khi sửa.",
  },
  {
    id: "repair-fallback-7",
    name: "Thay nhớt / lọc nhớt",
    price: "Báo giá sau kiểm tra",
    duration: "45–90 phút",
    description: "Kỹ thuật viên kiểm tra xe máy rồi báo giá trước khi sửa.",
  },
  {
    id: "repair-fallback-8",
    name: "Kiểm tra tổng quát",
    price: "Báo giá sau kiểm tra",
    duration: "45–90 phút",
    description: "Kỹ thuật viên kiểm tra xe máy rồi báo giá trước khi sửa.",
  },
]);

function formatCatalogPrice(service) {
  const category = String(service.category || "").toUpperCase();
  const priceType = String(service.price_type || "FIXED").toUpperCase();
  const amount = Number(service.base_price) || 0;
  const formatted = `${amount.toLocaleString("vi-VN")}đ`;
  const isRepairLike =
    priceType === "QUOTE" || (category !== "WASH_CARE" && category !== "MAINTENANCE");

  if (isRepairLike) {
    if (amount > 0) return `Báo giá sau kiểm tra · Gợi ý từ ${formatted}`;
    return "Báo giá sau kiểm tra";
  }

  if (priceType === "FROM") return `Từ ${formatted}`;
  return formatted;
}

function mapCatalogService(service) {
  return {
    id: String(service._id),
    name: service.service_name,
    price: formatCatalogPrice(service),
    duration: `${service.estimated_duration || 60} phút`,
    description: service.description || "Dịch vụ garage xe máy.",
    fromCatalog: true,
    category: service.category,
  };
}

function splitCatalogByBookingType(services = []) {
  const wash = [];
  const maintenance = [];
  const repair = [];

  services.forEach((service) => {
    if (service.allow_booking === false) return;
    const category = String(service.category || "").toUpperCase();
    const mapped = mapCatalogService(service);

    if (category === "WASH_CARE") {
      wash.push(mapped);
    } else if (category === "MAINTENANCE") {
      maintenance.push(mapped);
    } else {
      repair.push(mapped);
    }
  });

  return { wash, maintenance, repair };
}

/** Hãng xe phổ biến VN → danh sách dòng xe (cascading select trên form đặt lịch). */
const VEHICLE_CATALOG = {
  Honda: [
    "Vision",
    "Wave Alpha",
    "Wave RSX",
    "Air Blade",
    "Lead",
    "SH",
    "SH Mode",
    "Winner X",
    "Future",
    "Blade",
    "Scoopy",
    "PCX",
  ],
  Yamaha: [
    "Sirius",
    "Jupiter",
    "Exciter",
    "Grande",
    "Janus",
    "NVX",
    "Latte",
    "Freego",
    "MT-15",
  ],
  Suzuki: ["Raider", "Satria", "Address", "Impulse", "GD110"],
  SYM: ["Attila", "Angela", "Elegant", "Star SR", "Husky"],
  Piaggio: ["Vespa", "Liberty", "Medley", "Zip"],
  VinFast: ["Klara S", "Theon", "Feliz", "Vento", "Evo"],
  Ducati: ["Monster", "Scrambler", "Panigale"],
  Kawasaki: ["Ninja 400", "Z400", "W175"],
};

const VEHICLE_BRANDS = Object.keys(VEHICLE_CATALOG);
const LICENSE_PLATE_HINT = "29B1-234.56";

const TIME_SLOTS = ["08:00", "09:30", "10:30", "13:30", "15:00", "16:30", "18:00"];
const morningSlots = TIME_SLOTS.filter((slot) => Number(slot.split(":")[0]) < 12);
const afternoonSlots = TIME_SLOTS.filter((slot) => Number(slot.split(":")[0]) >= 12);
const MAX_ADVANCE_BOOKING_DAYS = 30;
const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

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
  date.setDate(date.getDate() + MAX_ADVANCE_BOOKING_DAYS);
  return toLocalDateValue(date);
}

function buildBookingDateOptions() {
  const options = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  for (let offset = 1; offset <= MAX_ADVANCE_BOOKING_DAYS; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    options.push({
      value: toLocalDateValue(date),
      day: String(date.getDate()).padStart(2, "0"),
      weekday: WEEKDAY_LABELS[date.getDay()],
      monthLabel: `Th${date.getMonth() + 1}`,
    });
  }

  return options;
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
    IN_PROGRESS: "Đang sửa chữa",
    WAITING_PARTS: "Đang sửa chữa",
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
    WAITING_PARTS: "progress",
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
  const navigate = useNavigate();
  const [serviceType, setServiceType] = useState("wash");
  const [washPackages, setWashPackages] = useState(FALLBACK_WASH_PACKAGES);
  const [maintenancePackages, setMaintenancePackages] = useState(FALLBACK_MAINTENANCE_PACKAGES);
  const [repairPackages, setRepairPackages] = useState(FALLBACK_REPAIR_ISSUES);
  const [washPackage, setWashPackage] = useState(FALLBACK_WASH_PACKAGES[0].id);
  const [maintenancePackage, setMaintenancePackage] = useState(FALLBACK_MAINTENANCE_PACKAGES[0].id);
  const [repairPackage, setRepairPackage] = useState(UNKNOWN_REPAIR_OPTION.id);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [daySession, setDaySession] = useState("morning");
  const [timeSlot, setTimeSlot] = useState("");
  const [appointmentDate, setAppointmentDate] = useState(getTomorrowDateValue);
  const bookingDateOptions = useMemo(() => buildBookingDateOptions(), []);

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

      const rawAppointmentId = notif.appointment_id;
      const targetId = typeof rawAppointmentId === "string"
        ? rawAppointmentId
        : (rawAppointmentId?._id || rawAppointmentId?.id || notif.metadata?.appointment_id || "");

      if (targetId) {
        navigate(`/profile?tab=appointments&appointmentId=${encodeURIComponent(String(targetId))}`);
      } else {
        navigate("/profile?tab=appointments");
      }
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
  const [vehicleBrand, setVehicleBrand] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [user, setUser] = useState({
    fullname: "Nguyễn Hoàng Nam",
    email: "namnh.customer@gmail.com",
    phone: "",
    avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%23fff7ed"/><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="%23ff6d1f"/></svg>'
  });

  useEffect(() => {
    setTimeSlot("");
  }, [daySession]);

  const vehicleModels = useMemo(
    () => (vehicleBrand ? VEHICLE_CATALOG[vehicleBrand] || [] : []),
    [vehicleBrand]
  );

  const handleVehicleBrandChange = (event) => {
    setVehicleBrand(event.target.value);
    setVehicleModel("");
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await profileService.getMe();
        if (res && res.success && res.data) {
          const apiUser = res.data.user || res.data;
          const phone = String(apiUser.phone || "").trim();
          setUser({
            fullname: apiUser.full_name || apiUser.fullname || "Nguyễn Hoàng Nam",
            email: apiUser.email || "namnh.customer@gmail.com",
            phone,
            avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%23fff7ed"/><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="%23ff6d1f"/></svg>'
          });
          setContactPhone((current) => current || phone);
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

  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      setIsLoadingCatalog(true);
      try {
        const response = await getBookableServices();
        if (cancelled) return;

        const split = splitCatalogByBookingType(response.data?.services || []);
        const nextWash = split.wash.length ? split.wash : FALLBACK_WASH_PACKAGES;
        const nextMaintenance = split.maintenance.length ? split.maintenance : FALLBACK_MAINTENANCE_PACKAGES;
        const nextRepair = withUnknownRepairOption(
          split.repair.length
            ? split.repair
            : FALLBACK_REPAIR_ISSUES.filter((item) => !item.isUnknownIssue)
        );

        setWashPackages(nextWash);
        setMaintenancePackages(nextMaintenance);
        setRepairPackages(nextRepair);
        setWashPackage(nextWash[0].id);
        setMaintenancePackage(nextMaintenance[0].id);
        setRepairPackage(UNKNOWN_REPAIR_OPTION.id);
      } catch {
        if (cancelled) return;
        setWashPackages(FALLBACK_WASH_PACKAGES);
        setMaintenancePackages(FALLBACK_MAINTENANCE_PACKAGES);
        setRepairPackages(FALLBACK_REPAIR_ISSUES);
        setWashPackage(FALLBACK_WASH_PACKAGES[0].id);
        setMaintenancePackage(FALLBACK_MAINTENANCE_PACKAGES[0].id);
        setRepairPackage(UNKNOWN_REPAIR_OPTION.id);
      } finally {
        if (!cancelled) setIsLoadingCatalog(false);
      }
    };

    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

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

    return repairPackages.find((item) => item.id === repairPackage) || repairPackages[0];
  }, [maintenancePackage, maintenancePackages, repairPackage, repairPackages, serviceType, washPackage, washPackages]);

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

    if (diffDays > MAX_ADVANCE_BOOKING_DAYS) {
      setSubmitError(`Chỉ có thể đặt lịch trước tối đa ${MAX_ADVANCE_BOOKING_DAYS} ngày.`);
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
      if (selectedService?.fromCatalog) {
        payload.service_id = selectedService.id;
      } else {
        payload.service_package = washPackage;
      }
    }

    if (serviceType === "maintenance") {
      if (selectedService?.fromCatalog) {
        payload.service_id = selectedService.id;
      } else {
        payload.service_package = maintenancePackage;
      }
    }

    if (serviceType === "repair") {
      const issueDescription = formData.get("issue_description");
      const selectedRepair =
        repairPackages.find((item) => item.id === repairPackage) || repairPackages[0];

      if (selectedRepair?.fromCatalog && !selectedRepair?.isUnknownIssue) {
        payload.service_id = selectedRepair.id;
        payload.repair_issue = selectedRepair.name;
      } else {
        payload.repair_issue = selectedRepair?.name || UNKNOWN_REPAIR_OPTION.name;
      }

      if (issueDescription) {
        payload.issue_description = issueDescription;
      } else if (selectedRepair?.isUnknownIssue) {
        payload.issue_description =
          "Khách chưa xác định lỗi. Cần kỹ thuật viên kiểm tra và chẩn đoán trước khi báo giá.";
      }
    }

    try {
      const response = await createAppointment(payload);
      const appointment = response.data?.appointment;
      setSubmitResult(appointment);
      formElement.reset();
      setWashPackage(washPackages[0].id);
      setMaintenancePackage(maintenancePackages[0].id);
      setRepairPackage(UNKNOWN_REPAIR_OPTION.id);
      setServiceType("wash");
      setAppointmentDate(getTomorrowDateValue());
      setTimeSlot("");
      setVehicleBrand("");
      setVehicleModel("");
      setContactPhone(user.phone || "");
      loadNotifications();
      loadMyAppointments();
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!submitResult) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setSubmitResult(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [submitResult]);

  const closeSuccessModal = () => setSubmitResult(null);

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

            {isLoadingCatalog && (
              <p className="booking-panel-note">Đang tải danh mục dịch vụ từ garage...</p>
            )}

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
                <label>Chọn dịch vụ sửa chữa / kiểm tra</label>
                <div className="package-grid">
                  {repairPackages.map((item) => (
                    <button
                      className={repairPackage === item.id ? "selected" : ""}
                      key={item.id}
                      type="button"
                      onClick={() => setRepairPackage(item.id)}
                    >
                      <strong>{item.name}</strong>
                      <span>{item.description}</span>
                      <small>
                        {item.price} • {item.duration}
                      </small>
                    </button>
                  ))}
                </div>
                <textarea
                  name="issue_description"
                  placeholder={
                    repairPackage === UNKNOWN_REPAIR_OPTION.id
                      ? "Không bắt buộc — nếu nhớ triệu chứng (tiếng kêu, lúc nào bị...) hãy ghi thêm để kỹ thuật viên dễ kiểm tra."
                      : "Mô tả thêm: tiếng kêu, lúc nào bị, xe số hay tay ga..."
                  }
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
                <select
                  name="vehicle_brand"
                  onChange={handleVehicleBrandChange}
                  required
                  value={vehicleBrand}
                >
                  <option value="">-- Chọn hãng xe --</option>
                  {VEHICLE_BRANDS.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Dòng xe
                <select
                  disabled={!vehicleBrand}
                  name="vehicle_model"
                  onChange={(event) => setVehicleModel(event.target.value)}
                  required
                  value={vehicleModel}
                >
                  <option value="">
                    {vehicleBrand ? "-- Chọn dòng xe --" : "-- Chọn hãng trước --"}
                  </option>
                  {vehicleModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Biển số
                <input name="license_plate" placeholder={LICENSE_PLATE_HINT} required type="text" />
              </label>
              <label>
                Số km hiện tại
                <input max="999999" min="0" name="odometer" placeholder="12500" type="number" />
              </label>
              <label className="booking-contact-phone">
                Số điện thoại liên hệ
                <input
                  autoComplete="tel"
                  inputMode="tel"
                  name="contact_phone"
                  onChange={(event) => setContactPhone(event.target.value)}
                  placeholder="0912345678"
                  required
                  type="tel"
                  value={contactPhone}
                />
                <small className="booking-field-hint">
                  Có thể nhập SĐT khác nếu đặt lịch hộ người thân / bạn bè. Garage sẽ gọi số này khi cần.
                </small>
              </label>
            </div>

            <div className="booking-step-heading">
              <span>03</span>
              <div>
                <h2>Chọn ngày giờ đến garage</h2>
                <p>Chọn trong vòng {MAX_ADVANCE_BOOKING_DAYS} ngày tới. Lịch mới sẽ chờ cửa hàng xác nhận.</p>
              </div>
            </div>

            <div className="booking-schedule-panel">
              <div className="booking-schedule-block">
                <div className="booking-schedule-label">
                  <span>Ngày hẹn</span>
                  <small>
                    {appointmentDate
                      ? formatDisplayDate(appointmentDate)
                      : `Từ ngày mai · tối đa ${MAX_ADVANCE_BOOKING_DAYS} ngày`}
                  </small>
                </div>
                <div className="booking-date-chip-row" role="listbox" aria-label="Chọn ngày hẹn">
                  {bookingDateOptions.map((option) => (
                    <button
                      aria-selected={appointmentDate === option.value}
                      className={`booking-date-chip ${appointmentDate === option.value ? "selected" : ""}`}
                      key={option.value}
                      onClick={() => setAppointmentDate(option.value)}
                      type="button"
                    >
                      <em>{option.weekday}</em>
                      <strong>{option.day}</strong>
                      <span>{option.monthLabel}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="booking-schedule-block">
                <div className="booking-schedule-label">
                  <span>Chọn buổi</span>
                </div>
                <div className="booking-session-grid">
                  <button
                    className={`booking-session-card ${daySession === "morning" ? "selected" : ""}`}
                    onClick={() => setDaySession("morning")}
                    type="button"
                  >
                    <MaterialIcon>wb_sunny</MaterialIcon>
                    <div>
                      <strong>Buổi sáng</strong>
                      <span>08:00 – 10:30</span>
                    </div>
                  </button>
                  <button
                    className={`booking-session-card ${daySession === "afternoon" ? "selected" : ""}`}
                    onClick={() => setDaySession("afternoon")}
                    type="button"
                  >
                    <MaterialIcon>wb_twilight</MaterialIcon>
                    <div>
                      <strong>Buổi chiều</strong>
                      <span>13:30 – 18:00</span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="booking-schedule-block">
                <div className="booking-schedule-label">
                  <span>Khung giờ</span>
                  <small>{timeSlot ? `Đã chọn ${timeSlot}` : "Chọn một khung giờ phù hợp"}</small>
                </div>
                <div className="booking-slot-grid">
                  {(daySession === "morning" ? morningSlots : afternoonSlots).map((slot) => (
                    <button
                      className={`booking-slot-chip ${timeSlot === slot ? "selected" : ""}`}
                      key={slot}
                      onClick={() => setTimeSlot(slot)}
                      type="button"
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
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

      {submitResult && (
        <div
          className="booking-success-overlay"
          onClick={closeSuccessModal}
          role="presentation"
        >
          <div
            aria-labelledby="booking-success-title"
            aria-modal="true"
            className="booking-success-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="booking-success-modal-icon" aria-hidden="true">
              <MaterialIcon>check_circle</MaterialIcon>
            </div>
            <h2 id="booking-success-title">Đặt lịch thành công</h2>
            <p className="booking-success-modal-lead">
              Lịch hẹn đã được gửi. Garage sẽ liên hệ xác nhận sớm.
            </p>

            <div className="booking-success-modal-details">
              <div>
                <span>Mã lịch</span>
                <strong>{submitResult.appointment_code || "—"}</strong>
              </div>
              <div>
                <span>Thời gian</span>
                <strong>
                  {[
                    formatDisplayDate(normalizeAppointmentDate(submitResult.appointment_date)),
                    submitResult.time_slot,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </strong>
              </div>
              <div>
                <span>Xe</span>
                <strong>
                  {[
                    submitResult.vehicle?.brand || submitResult.vehicle_info?.brand,
                    submitResult.vehicle?.model || submitResult.vehicle_info?.model,
                    submitResult.vehicle?.license_plate || submitResult.vehicle_info?.license_plate,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </strong>
              </div>
              <div>
                <span>Trạng thái</span>
                <strong>{getStatusLabel(submitResult.status) || "Chờ xác nhận"}</strong>
              </div>
            </div>

            <div className="booking-success-modal-actions">
              <a className="booking-success-secondary" href="/profile?tab=appointments">
                Xem lịch hẹn
              </a>
              <button className="booking-success-primary" onClick={closeSuccessModal} type="button">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}