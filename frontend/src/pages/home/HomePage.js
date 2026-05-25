import React, { useState, useEffect } from "react";
import "../../styles/home/HomePage.css";
import { clearAuthSession } from "../../services/authApi";
import { profileService } from "../../services/profileService";

const services = [
  {
    title: "Bảo Dưỡng Toàn Diện",
    icon: "settings_suggest",
    tag: "Khuyên dùng",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC9rMM5_po536I707UkFHVvTiXei7xcRKyNGvjItLFwCXBwCpuOoS1uTgyhmmHUsLgFI0Qha5pvIO2hvhsYY9oKKsAVoNRO_4vQk8MdgH4UyHozFKrXOL7PYFZ0E4Xg77EIlWrQ-upZ57N4DXTxZ_dXSNtcAReTVhfEkWbXdkivynnwJTmeYtx7rmDTOHezc1gOil75CsOmcCrgDTd7852HVkLJbLNfkiLNYQow4fr07oelLV5rukGu0Nt0jf-vMYeOgLoEXPeHSfs",
    description:
      "Quy trình kiểm tra 50 hạng mục, tối ưu sức mạnh động cơ và độ bền bỉ của xe.",
  },
  {
    title: "Chăm Sóc & Làm Đẹp",
    icon: "auto_fix_high",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD358AQnZS-CnGmzP2KbMI_B-SywzOS-Q4bNzgLGQTXXzBvhUvelzwoPvR5EESoeWVbFMKYLXGLhooIuXdlIHIU-DXnooYV97c0oY_64e_wbV-lZVdPLTnFqNG2wGJTvh3NZYe_lWezCvffAhKZ5L85yGqQxH5aJW7hkzl7h8k-XpVpZWb3lrBS2lLRa_KKeJLIG7jTbCv0D2D5uYlvNdba1ccMxawQEbDzBzapAE4UoFSpStQdT3M0x8ZBmlAAWEmL2O_UKZuxvgc",
    description:
      "Hồi sinh vẻ đẹp nguyên bản với hóa chất cao cấp và lớp bảo vệ bề mặt sơn.",
  },
  {
    title: "Sửa Chữa Kỹ Thuật",
    icon: "precision_manufacturing",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAOWfifhVqu1f6UZ_S2HWu_ZY5QNne-uBvjp9_MxpaJt2BqA5ilbAZt12ExESIEgeYN91GyK-vkkzZj6QGHs-6PmNXRftOeEqMMHOgFMey34v5_4X2E2D6zYBOItCkNkqxDJHvy3ehoKY47rWrBns4RIJPcQbX_KnInyVYztXnVYRE7AFE8t_ScE2Hm2Y-dCJxrbZAPHkeoSQOPLx9oDGKP2BqLXSSZomH6GedhCS5hu-qZMYI6Bt87JJ1jGY7qAirzAiY7QKr2pO4",
    description:
      "Xử lý ECU, hệ thống điện và khung gầm bằng thiết bị chẩn đoán hiện đại.",
  },
];

const values = [
  {
    icon: "verified",
    title: "Chính Xác Tuyệt Đối",
    text: "Trong cơ khí PKL, sai số dù nhỏ nhất cũng không được phép tồn tại.",
  },
  {
    icon: "security",
    title: "An Toàn Là Trên Hết",
    text: "Mỗi chuyến đi của bạn là sự tin tưởng đặt vào chúng tôi.",
  },
  {
    icon: "stars",
    title: "Trải Nghiệm Cao Cấp",
    text: "Dịch vụ minh bạch, tận tâm với khu vực chờ tiêu chuẩn cao.",
  },
];

const contactItems = [
  ["location_on", "Địa chỉ", "123 Đường Công Nghệ, Quận 7, TP. Hồ Chí Minh"],
  ["call", "Hotline", "1900 88 99 00"],
  ["schedule", "Giờ làm việc", "Thứ 2 - Chủ Nhật: 08:00 - 20:00"],
];

function MaterialIcon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

export default function HomePage() {
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
      if (showUserMenu && !event.target.closest(".home-actions")) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showUserMenu]);

  const handleLogout = () => {
    clearAuthSession();
    setShowUserMenu(false);
  };

  return (
    <div className="home-page">
      <header className="home-header">
        <a className="home-logo" href="/home">
          MOTOCORE
        </a>
        <nav className="home-nav" aria-label="Điều hướng chính">
          <a className="active" href="/home">
            Trang chủ
          </a>
          <a href="/home">Dịch vụ</a>
          <a href="/booking">Lịch hẹn</a>
          <a href="/about">Về chúng tôi</a>
        </nav>
        <div className="home-actions" style={{ position: "relative" }}>
          <button className="icon-button" type="button" aria-label="Tìm kiếm">
            <MaterialIcon>search</MaterialIcon>
          </button>
          <a className="home-contact-button" href="/booking">
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

      <main>
        <section className="home-hero" id="home">
          <img
            alt="Garage xe phân khối lớn cao cấp"
            className="home-hero-image"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCuJHMJUCLlqpELVlh63vEnytkiqNLCDzZXIHSs1TwLCBBIqbdIY40ILRBueSybpK9jQo7R1tcWjHETZzm5W9YQEnTn-wBci-qAT2Yg1xjTyDnVSEOce_dvMZ_sPrzTXuywQrwR6iacAcGXdsdFvh5hX8PFJRsgkXMex_h3DIeCmFmXtrQV9HVpJ6vPtgJ8bnnb5a3HHg5Kou-_IfT2KvH3LWKbUTzMiVlM9UZVyfYdmo2Ej8sXK0krC4yYXNkUEaDU3Ev7gQvJOA0"
          />
          <div className="home-hero-overlay" />
          <div className="home-hero-content">
            <div className="home-eyebrow">
              <span />
              Chuyên gia phân khối lớn
            </div>
            <h1>
              Nâng Tầm Đẳng Cấp
              <br />
              <strong>Chiến Mã Đường Trường</strong>
            </h1>
            <p>
              Hệ thống garage tiêu chuẩn quốc tế với công nghệ chẩn đoán tiên
              tiến. Nơi hội tụ kỹ thuật viên tay nghề cao dành riêng cho xe PKL.
            </p>
            <div className="home-hero-buttons">
              <a className="primary-button" href="/booking">
                Đặt lịch bảo dưỡng
              </a>
              <a className="secondary-button" href="/home">
                Xem bảng giá
              </a>
            </div>
            <div className="trust-strip" aria-label="Thống kê uy tín">
              <div>
                <strong>15+</strong>
                <span>Năm kinh nghiệm</span>
              </div>
              <div>
                <strong>10k+</strong>
                <span>Khách hàng tin dùng</span>
              </div>
              <div>
                <strong>24/7</strong>
                <span>Cứu hộ lưu động</span>
              </div>
            </div>
          </div>
        </section>

        <section className="home-section services-section" id="services">
          <div className="section-heading">
            <div>
              <span>Dịch vụ của chúng tôi</span>
              <h2>Giải Pháp Chuyên Sâu</h2>
            </div>
            <a href="/booking">
              Tất cả dịch vụ <MaterialIcon>arrow_forward</MaterialIcon>
            </a>
          </div>
          <div className="service-grid">
            {services.map((service) => (
              <article className="service-card" key={service.title}>
                <div className="service-media">
                  <img alt={service.title} src={service.image} />
                  {service.tag && <span>{service.tag}</span>}
                </div>
                <div className="service-body">
                  <div className="service-title-row">
                    <MaterialIcon>{service.icon}</MaterialIcon>
                    <h3>{service.title}</h3>
                  </div>
                  <p>{service.description}</p>
                  <a href="/booking">
                    Xem chi tiết <MaterialIcon>east</MaterialIcon>
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="philosophy-section" id="about">
          <div className="philosophy-image">
            <img
              alt="Xưởng kỹ thuật chuyên nghiệp"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCGs0goSO5fPEv9FpHTulkp71Bax5p77ISw-yYzRrsXvfgj_HjI5zaUqkyjoaI_B6ik47ldgQTVlOjRrFl-AYvHRXHzE3N2ZkGrEJo1wDTDj2t5mijqJQ_lYVh6HRbN-YfpILOztxRLe5IFYGtqKPhtuOCJYkxpWSAPeJyDyaFwaWexifu-F-xMuoUhJAy3xenAKzrUTLkhkCx4SKVDUe7IwRks-ODGjvR3zlJF-BYoDiad3YRRCM5Q1B7n21OxVa7OYlkOsWVZ5Wg"
            />
          </div>
          <div className="philosophy-content">
            <span>Giá trị cốt lõi</span>
            <h2>Triết Lý Của MOTOCORE</h2>
            <div className="value-list">
              {values.map((value) => (
                <article className="value-item" key={value.title}>
                  <MaterialIcon>{value.icon}</MaterialIcon>
                  <div>
                    <h3>{value.title}</h3>
                    <p>{value.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="home-section contact-section" id="contact">
          <div className="contact-copy">
            <span>Liên hệ</span>
            <h2>
              Hãy Để Chúng Tôi
              <br />
              Chăm Sóc Xe Của Bạn
            </h2>
            <p>
              Bạn có câu hỏi về bảo dưỡng hay nâng cấp? Đội ngũ tư vấn kỹ thuật
              của chúng tôi sẵn sàng giải đáp mọi thắc mắc.
            </p>
            <div className="contact-list">
              {contactItems.map(([icon, label, text]) => (
                <div className="contact-item" key={label}>
                  <MaterialIcon>{icon}</MaterialIcon>
                  <div>
                    <small>{label}</small>
                    <strong>{text}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <form className="consult-form" id="booking">
            <div className="form-grid">
              <label>
                <span>Họ và tên</span>
                <input type="text" />
              </label>
              <label>
                <span>Số điện thoại</span>
                <input type="tel" />
              </label>
            </div>
            <label>
              <span>Dịch vụ quan tâm</span>
              <select defaultValue="Bảo dưỡng định kỳ">
                <option>Bảo dưỡng định kỳ</option>
                <option>Sửa chữa động cơ</option>
                <option>Vệ sinh & làm đẹp</option>
                <option>Nâng cấp phụ tùng</option>
              </select>
            </label>
            <label>
              <span>Yêu cầu cụ thể của bạn</span>
              <textarea rows="5" />
            </label>
            <button type="submit">Gửi yêu cầu tư vấn</button>
          </form>
        </section>
      </main>

      <footer className="home-footer">
        <div className="footer-main">
          <div>
            <a className="footer-logo" href="/home">
              MOTOCORE
            </a>
            <p>
              Trung tâm kỹ thuật xe phân khối lớn hàng đầu Việt Nam, đồng hành
              với những hành trình an toàn và bứt phá.
            </p>
          </div>
          <div className="footer-links">
            <a href="/home">Trang chủ</a>
            <a href="/home">Dịch vụ</a>
            <a href="/booking">Lịch hẹn</a>
            <a href="/about">Về chúng tôi</a>
          </div>
          <label className="newsletter">
            <span>Đăng ký bản tin</span>
            <div>
              <input placeholder="Email của bạn" type="email" />
              <button aria-label="Đăng ký" type="button">
                <MaterialIcon>send</MaterialIcon>
              </button>
            </div>
          </label>
        </div>
        <div className="footer-bottom">
          <span>© 2024 MOTOCORE Industrial. Bảo lưu mọi quyền.</span>
          <div>
            <a href="/home">Facebook</a>
            <a href="/home">Instagram</a>
            <a href="/home">Youtube</a>
          </div>
        </div>
      </footer>

      <nav className="mobile-bottom-nav" aria-label="Điều hướng di động">
        <a href="/home">
          <MaterialIcon>home</MaterialIcon>
          Trang chủ
        </a>
        <a href="/booking">
          <MaterialIcon>event_available</MaterialIcon>
          Đặt lịch
        </a>
        <a className="floating-action" href="/home">
          <MaterialIcon>handyman</MaterialIcon>
        </a>
        <a href="/booking">
          <MaterialIcon>support_agent</MaterialIcon>
          Hỗ trợ
        </a>
        <a href="/staff/dashboard">
          <MaterialIcon>person</MaterialIcon>
          Tài khoản
        </a>
      </nav>
    </div>
  );
}
