import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  cancelAppointment,
  createAppointment,
  getMyAppointments,
} from "../../services/appointmentApi";
import "../../styles/customer/BookingPage.css";
import { clearAuthSession } from "../../services/authApi";
import { profileService } from "../../services/profileService";

const washPackages = [
  {
    id: "wash-basic",
    name: "Rửa xe thường",
    price: "40.000đ",
    duration: "25 phút",
    description: "Rửa thân vỏ, mâm xe và lau khô nhanh.",
  },
  {
    id: "wash-premium",
    name: "Rửa xe cao cấp",
    price: "80.000đ",
    duration: "45 phút",
    description: "Rửa bọt tuyết, vệ sinh mâm, chăm sóc nhựa nhám.",
  },
  {
    id: "engine-clean",
    name: "Vệ sinh động cơ",
    price: "120.000đ",
    duration: "60 phút",
    description: "Làm sạch khoang máy và kiểm tra rò rỉ cơ bản.",
  },
];

const maintenancePackages = [
  {
    id: "maintenance-basic",
    name: "Bảo dưỡng cơ bản",
    price: "150.000đ",
    duration: "45 phút",
    description: "Kiểm tra nhớt, phanh, lốp, đèn và ốc siết cơ bản.",
  },
  {
    id: "maintenance-periodic",
    name: "Bảo dưỡng định kỳ",
    price: "280.000đ",
    duration: "75 phút",
    description: "Kiểm tra tổng quát, vệ sinh lọc gió, cân chỉnh phanh.",
  },
  {
    id: "maintenance-full",
    name: "Bảo dưỡng toàn diện",
    price: "450.000đ",
    duration: "120 phút",
    description: "Quy trình chuyên sâu cho xe chạy lâu ngày hoặc sắp đi xa.",
  },
];

const repairIssues = [
  "Kiểm tra tổng quát",
  "Xe khó nổ máy",
  "Phanh kêu / yếu",
  "Thay nhớt",
  "Kiểm tra điện",
  "Lốp / xăm",
];

const timeSlots = ["08:00", "09:30", "10:30", "13:30", "15:00", "16:30", "18:00"];

function MaterialIcon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

function getTomorrowDateValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function getMaxAppointmentDateValue() {
  const date = new Date();
  date.setDate(date.getDate() + 60);
  return date.toISOString().slice(0, 10);
}

function formatAppointmentTime(appointment) {
  const date = appointment.appointment_date || "";
  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return appointment.time_slot || "";
  }

  return `${day}/${month}/${year} - ${appointment.time_slot}`;
}

function getStatusLabel(status) {
  const labels = {
    PENDING: "Cho xac nhan",
    CONFIRMED: "Da xac nhan",
    IN_PROGRESS: "Dang xu ly",
    COMPLETED: "Hoan thanh",
    PAID: "Da thanh toan",
    CANCELLED: "Da huy",
    REJECTED: "Tu choi",
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

function getAppointmentCode(appointment) {
  return appointment.appointment_code || appointment.code || appointment._id;
}

function getAppointmentService(appointment) {
  return appointment.service?.name || appointment.service || "";
}

export default function BookingPage() {
  const [serviceType, setServiceType] = useState("wash");
  const [washPackage, setWashPackage] = useState(washPackages[1].id);
  const [maintenancePackage, setMaintenancePackage] = useState(maintenancePackages[1].id);
  const [repairIssue, setRepairIssue] = useState(repairIssues[0]);
  const [timeSlot, setTimeSlot] = useState(timeSlots[1]);
  const [appointmentDate, setAppointmentDate] = useState(getTomorrowDateValue());
  const [appointmentsList, setAppointmentsList] = useState([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [submitError, setSubmitError] = useState("");

  const loadAppointments = useCallback(async () => {
    setIsLoadingAppointments(true);

    try {
      const response = await getMyAppointments({ page: 1, limit: 5 });
      setAppointmentsList(response.data?.appointments || []);
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsLoadingAppointments(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [user, setUser] = useState({
    fullname: "Nguyễn Hoàng Nam",
    email: "namnh.customer@gmail.com",
    avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%23fff7ed"/><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="%23ff6d1f"/></svg>'
  });

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
      name: repairIssue,
      price: "Báo giá sau kiểm tra",
      duration: "45-90 phút",
      description: "Kỹ thuật viên xác nhận tình trạng xe trước khi báo giá.",
    };
  }, [maintenancePackage, repairIssue, serviceType, washPackage]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setIsSubmitting(true);
    setSubmitError("");
    setSubmitResult(null);

    const formData = new FormData(formElement);
    const payload = {
      service_type: serviceType.toUpperCase(),
      vehicle_brand: formData.get("vehicle_brand"),
      vehicle_model: formData.get("vehicle_model"),
      license_plate: formData.get("license_plate"),
      appointment_date: appointmentDate,
      time_slot: timeSlot,
    };

    const odometer = formData.get("odometer");
    const contactPhone = formData.get("contact_phone");
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
      await loadAppointments();
      formElement.reset();
      setAppointmentDate(getTomorrowDateValue());
      setTimeSlot(timeSlots[1]);
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    setSubmitError("");

    try {
      await cancelAppointment(appointmentId, "Customer cancelled from booking page");
      await loadAppointments();
    } catch (error) {
      setSubmitError(error.message);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    setShowUserMenu(false);
  };

  return (
    <div className="booking-page">
      <header className="booking-header">
        <a className="booking-logo" href="/home">
          MOTOCORE
        </a>
        <nav className="booking-nav" aria-label="Điều hướng đặt lịch">
          <a href="/home">Trang chủ</a>
          <a href="/home">Dịch vụ</a>
          <a className="active" href="/booking">
            Lịch hẹn
          </a>
          <a href="/about">Về chúng tôi</a>
        </nav>
        <div className="booking-actions" style={{ position: "relative" }}>
          <button className="icon-button" type="button" aria-label="Tìm kiếm">
            <MaterialIcon>search</MaterialIcon>
          </button>
          <a className="booking-contact-button" href="/home">
            Liên hệ ngay
          </a>
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
              <a href="/booking" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
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
            <span className="booking-eyebrow">Đặt lịch khách hàng</span>
            <h1>Đặt lịch sửa và rửa xe máy</h1>
            <p>
              Chọn dịch vụ, cung cấp thông tin xe và khung giờ mong muốn. Quản lý
              sẽ xác nhận lịch và phân công nhân viên phụ trách.
            </p>
          </div>
          <div className="booking-status-flow">
            <span>Chờ xác nhận</span>
            <MaterialIcon>arrow_forward</MaterialIcon>
            <span>Đã xác nhận</span>
            <MaterialIcon>arrow_forward</MaterialIcon>
            <span>Đang xử lý</span>
            <MaterialIcon>arrow_forward</MaterialIcon>
            <span>Đã thanh toán</span>
          </div>
        </section>

        <section className="booking-content">
          <form className="booking-form" onSubmit={handleSubmit}>
            <div className="booking-step-heading">
              <span>01</span>
              <div>
                <h2>Chọn loại dịch vụ</h2>
                <p>Hệ thống hỗ trợ rửa xe, bảo dưỡng và sửa xe theo quy trình của cửa hàng.</p>
              </div>
            </div>

            <div className="service-type-grid">
              <button
                className={serviceType === "wash" ? "selected" : ""}
                type="button"
                onClick={() => setServiceType("wash")}
              >
                <MaterialIcon>local_car_wash</MaterialIcon>
                <strong>Rửa xe</strong>
                <span>Rửa thường, cao cấp, vệ sinh động cơ</span>
              </button>
              <button
                className={serviceType === "maintenance" ? "selected" : ""}
                type="button"
                onClick={() => setServiceType("maintenance")}
              >
                <MaterialIcon>settings_suggest</MaterialIcon>
                <strong>Bảo dưỡng</strong>
                <span>Bảo dưỡng cơ bản, định kỳ, toàn diện</span>
              </button>
              <button
                className={serviceType === "repair" ? "selected" : ""}
                type="button"
                onClick={() => setServiceType("repair")}
              >
                <MaterialIcon>build</MaterialIcon>
                <strong>Sửa xe</strong>
                <span>Kiểm tra lỗi, thay phụ tùng, xử lý kỹ thuật</span>
              </button>
            </div>

            {serviceType === "wash" ? (
              <div className="booking-group">
                <label>Chọn gói rửa xe</label>
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
                <label>Chọn lỗi phổ biến</label>
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
                  placeholder="Mô tả thêm: tiếng kêu, thời điểm bị lỗi, tình trạng gần đây..."
                  rows="4"
                />
              </div>
            )}

            <div className="booking-step-heading">
              <span>02</span>
              <div>
                <h2>Thông tin xe</h2>
                <p>Thông tin này giúp nhân viên chuẩn bị đúng dụng cụ và vật tư.</p>
              </div>
            </div>

            <div className="booking-fields-grid">
              <label>
                Hãng xe
                <input name="vehicle_brand" placeholder="Honda, Yamaha, Suzuki..." required type="text" />
              </label>
              <label>
                Model
                <input name="vehicle_model" placeholder="Vision, Sirius, Exciter..." required type="text" />
              </label>
              <label>
                Biển số
                <input name="license_plate" placeholder="59A1-23456" required type="text" />
              </label>
              <label>
                Số km
                <input max="999999" min="0" name="odometer" placeholder="12000" type="number" />
              </label>
              <label>
                So dien thoai lien he
                <input name="contact_phone" placeholder="0912345678" type="tel" />
              </label>
            </div>

            <div className="booking-step-heading">
              <span>03</span>
              <div>
                <h2>Chọn ngày giờ</h2>
                <p>Lịch tạo mới sẽ ở trạng thái chờ xác nhận cho đến khi quản lý duyệt.</p>
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
                Khung giờ
                <select value={timeSlot} onChange={(event) => setTimeSlot(event.target.value)}>
                  {timeSlots.map((slot) => (
                    <option key={slot}>{slot}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="booking-note">
              Ghi chú
              <textarea name="note" placeholder="Yêu cầu riêng, cần rửa gấp, liên hệ trước khi sửa..." rows="4" />
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
                  <span>Khung giờ {timeSlot}</span>
                </div>
                <div>
                  <MaterialIcon>pending_actions</MaterialIcon>
                  <span>Trạng thái sẽ là chờ xác nhận</span>
                </div>
              </div>

              {submitResult && (
                <div className="booking-success">
                  <MaterialIcon>task_alt</MaterialIcon>
                  <div>
                    <strong>Đặt lịch thành công</strong>
                    <span>Ma lich hen: {submitResult.appointment_code}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="my-appointments">
              <div className="side-heading">
                <h2>Lịch hẹn của tôi</h2>
                <a href="/booking">Xem tất cả</a>
              </div>
              {isLoadingAppointments && <p className="appointment-empty">Dang tai lich hen...</p>}

              {!isLoadingAppointments && appointmentsList.length === 0 && (
                <p className="appointment-empty">Chua co lich hen nao.</p>
              )}

              {!isLoadingAppointments && appointmentsList.map((item) => (
                <article className="appointment-item" key={item._id || item.code}>
                  <div>
                    <strong>{getAppointmentCode(item)}</strong>
                    <span>{getAppointmentService(item)}</span>
                    <small>{formatAppointmentTime(item)}</small>
                  </div>
                  <div className="appointment-actions-inline">
                    <em className={`status-${getStatusClass(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </em>
                    {["PENDING", "CONFIRMED"].includes(item.status) && item._id && (
                      <button
                        aria-label="Cancel appointment"
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
    </div>
  );
}
