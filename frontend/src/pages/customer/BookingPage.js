import React, { useMemo, useState, useEffect } from "react";
import "../../styles/customer/BookingPage.css";
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

const appointments = [
  {
    code: "APT-20260521-014",
    service: "Rửa xe cao cấp",
    time: "22/05/2026 - 09:30",
    status: "Chờ xác nhận",
    statusClass: "pending",
  },
  {
    code: "APT-20260520-009",
    service: "Thay nhớt + kiểm tra phanh",
    time: "20/05/2026 - 15:00",
    status: "Hoàn thành",
    statusClass: "completed",
  },
  {
    code: "APT-20260518-002",
    service: "Kiểm tra tổng quát",
    time: "18/05/2026 - 10:30",
    status: "Đã thanh toán",
    statusClass: "paid",
  },
];

function MaterialIcon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

export default function BookingPage() {
  const [serviceType, setServiceType] = useState("wash");
  const [washPackage, setWashPackage] = useState(washPackages[1].id);
  const [maintenancePackage, setMaintenancePackage] = useState(maintenancePackages[1].id);
  const [repairIssue, setRepairIssue] = useState(repairIssues[0]);
  const [timeSlot, setTimeSlot] = useState(timeSlots[1]);
  const [submitted, setSubmitted] = useState(false);
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

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="booking-page">
      <header className="booking-header">
        <a className="booking-logo" href="#/home">
          MOTOCORE
        </a>
        <nav className="booking-nav" aria-label="Điều hướng đặt lịch">
          <a href="#/home">Trang chủ</a>
          <a href="#/home">Dịch vụ</a>
          <a className="active" href="#/booking">
            Lịch hẹn
          </a>
          <a href="#/home">Về chúng tôi</a>
        </nav>
        <div className="booking-actions" style={{ position: "relative" }}>
          <button className="icon-button" type="button" aria-label="Tìm kiếm">
            <MaterialIcon>search</MaterialIcon>
          </button>
          <a className="booking-contact-button" href="#/home">
            Liên hệ ngay
          </a>
          <button className="user-menu-trigger" type="button" aria-label="Menu" onClick={() => setShowUserMenu(!showUserMenu)}>
            <MaterialIcon>menu</MaterialIcon>
          </button>

          {showUserMenu && (
            <div className="user-dropdown-menu">
              <a href="#/profile?tab=info" className="dropdown-user-info" onClick={() => setShowUserMenu(false)}>
                <div className="dropdown-avatar">
                  <img src={user.avatar} alt="User Avatar" />
                </div>
                <div className="dropdown-user-details">
                  <strong>{user.fullname}</strong>
                  <span>{user.email}</span>
                </div>
              </a>
              <div className="dropdown-divider" />
              <a href="#/profile?tab=info" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                <span className="material-symbols-outlined">person</span>
                <span>Hồ sơ cá nhân</span>
              </a>
              <a href="#/profile?tab=garage" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                <span className="material-symbols-outlined">two_wheeler</span>
                <span>Nhà xe của tôi</span>
              </a>
              <a href="#/booking" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                <span className="material-symbols-outlined">event_available</span>
                <span>Lịch hẹn của tôi</span>
              </a>
              <div className="dropdown-divider" />
              <a href="#/home" className="dropdown-item text-danger" onClick={() => setShowUserMenu(false)}>
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
                <input placeholder="Honda, Yamaha, Suzuki..." type="text" />
              </label>
              <label>
                Model
                <input placeholder="Vision, Sirius, Exciter..." type="text" />
              </label>
              <label>
                Biển số
                <input placeholder="59A1-234.56" type="text" />
              </label>
              <label>
                Số km
                <input placeholder="12000" type="number" />
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
                <input type="date" />
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
              <textarea placeholder="Yêu cầu riêng, cần rửa gấp, liên hệ trước khi sửa..." rows="4" />
            </label>

            <button className="booking-submit" type="submit">
              Xác nhận đặt lịch
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

              {submitted && (
                <div className="booking-success">
                  <MaterialIcon>task_alt</MaterialIcon>
                  <div>
                    <strong>Đặt lịch thành công</strong>
                    <span>Mã lịch hẹn: APT-20260521-028</span>
                  </div>
                </div>
              )}
            </div>

            <div className="my-appointments">
              <div className="side-heading">
                <h2>Lịch hẹn của tôi</h2>
                <a href="#/booking">Xem tất cả</a>
              </div>
              {appointments.map((item) => (
                <article className="appointment-item" key={item.code}>
                  <div>
                    <strong>{item.code}</strong>
                    <span>{item.service}</span>
                    <small>{item.time}</small>
                  </div>
                  <em className={`status-${item.statusClass}`}>{item.status}</em>
                </article>
              ))}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
