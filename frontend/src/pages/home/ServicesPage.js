import React, { useMemo, useState } from "react";
import "../../styles/home/ServicesPage.css";

const serviceCategories = [
  { id: "all", label: "Tất cả", icon: "apps" },
  { id: "maintenance", label: "Bảo dưỡng", icon: "settings_suggest" },
  { id: "wash", label: "Rửa & chăm sóc", icon: "local_car_wash" },
  { id: "repair", label: "Sửa chữa", icon: "build" },
];

const services = [
  {
    category: "maintenance",
    title: "Bảo dưỡng định kỳ",
    price: "Từ 150.000đ",
    duration: "45-75 phút",
    icon: "settings_suggest",
    image: "https://images.unsplash.com/photo-1615906655593-ad0386982a0f?auto=format&fit=crop&w=900&q=82",
    description: "Kiểm tra dầu nhớt, phanh, lốp, đèn, ốc siết và các hạng mục vận hành cơ bản.",
    features: ["Checklist rõ ràng", "Tư vấn vật tư", "Ghi nhận tình trạng xe"],
  },
  {
    category: "maintenance",
    title: "Bảo dưỡng toàn diện",
    price: "Từ 450.000đ",
    duration: "90-120 phút",
    icon: "fact_check",
    image: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=900&q=82",
    description: "Quy trình chuyên sâu cho xe chạy lâu ngày, chuẩn bị đi xa hoặc cần kiểm tra tổng quát.",
    features: ["Kiểm tra 50+ hạng mục", "Báo cáo sau dịch vụ", "Ưu tiên an toàn"],
  },
  {
    category: "wash",
    title: "Rửa xe cao cấp",
    price: "Từ 80.000đ",
    duration: "35-45 phút",
    icon: "local_car_wash",
    image: "https://images.unsplash.com/photo-1605164599901-35d2c3dfb861?auto=format&fit=crop&w=900&q=82",
    description: "Rửa bọt tuyết, vệ sinh mâm, lau khô và chăm sóc các bề mặt thường bám bẩn.",
    features: ["Bọt tuyết", "Vệ sinh mâm", "Lau khô kỹ"],
  },
  {
    category: "wash",
    title: "Vệ sinh động cơ",
    price: "Từ 120.000đ",
    duration: "45-60 phút",
    icon: "water_drop",
    image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=82",
    description: "Làm sạch khoang máy, kiểm tra rò rỉ cơ bản và hỗ trợ phát hiện dấu hiệu bất thường.",
    features: ["Che chắn kỹ", "Làm sạch an toàn", "Kiểm tra rò rỉ"],
  },
  {
    category: "repair",
    title: "Kiểm tra hệ thống điện",
    price: "Báo giá sau kiểm tra",
    duration: "45-90 phút",
    icon: "bolt",
    image: "https://images.unsplash.com/photo-1581092335878-2d9ff86ca2bf?auto=format&fit=crop&w=900&q=82",
    description: "Chẩn đoán lỗi đèn, bình, sạc, cảm biến và các tình trạng điện chập chờn.",
    features: ["Chẩn đoán lỗi", "Báo phương án", "Xác nhận trước khi sửa"],
  },
  {
    category: "repair",
    title: "Sửa chữa phanh & lốp",
    price: "Từ 180.000đ",
    duration: "45-75 phút",
    icon: "tire_repair",
    image: "https://images.unsplash.com/photo-1599256872237-5dcc0fbe9668?auto=format&fit=crop&w=900&q=82",
    description: "Kiểm tra má phanh, dầu phanh, lốp, van, áp suất và độ an toàn khi vận hành.",
    features: ["Kiểm tra phanh", "Tư vấn thay thế", "Chạy thử khi cần"],
  },
];

const process = [
  ["01", "Chọn dịch vụ", "Chọn nhóm dịch vụ phù hợp với tình trạng xe hoặc nhu cầu chăm sóc."],
  ["02", "Đặt lịch", "Gửi ngày giờ mong muốn để quản lý xác nhận và chuẩn bị nhân sự."],
  ["03", "Tiếp nhận xe", "Kỹ thuật viên ghi nhận tình trạng, checklist và vật tư cần dùng."],
  ["04", "Bàn giao", "Kiểm tra lại, tổng kết chi phí và hướng dẫn theo dõi sau dịch vụ."],
];

const priceRows = [
  ["Rửa xe thường", "25 phút", "40.000đ"],
  ["Rửa xe cao cấp", "45 phút", "80.000đ"],
  ["Bảo dưỡng cơ bản", "45 phút", "150.000đ"],
  ["Bảo dưỡng định kỳ", "75 phút", "280.000đ"],
  ["Bảo dưỡng toàn diện", "120 phút", "450.000đ"],
  ["Kiểm tra lỗi kỹ thuật", "45-90 phút", "Báo giá sau kiểm tra"],
];

function MaterialIcon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

export default function ServicesPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const visibleServices = useMemo(() => {
    if (activeCategory === "all") return services;
    return services.filter((service) => service.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="services-page">
      <header className="about-header">
        <a className="about-logo" href="/home">MOTOCORE</a>
        <nav className="about-nav" aria-label="Điều hướng chính">
          <a href="/home">Trang chủ</a>
          <a className="active" href="/services">Dịch vụ</a>
          <a href="/booking">Lịch hẹn</a>
          <a href="/about">Về chúng tôi</a>
        </nav>
        <div className="about-actions">
          <button className="icon-button" type="button" aria-label="Tìm kiếm">
            <MaterialIcon>search</MaterialIcon>
          </button>
          <a className="about-contact-button" href="/booking">Liên hệ ngay</a>
          <a className="about-menu-button" href="/profile" aria-label="Tài khoản">
            <MaterialIcon>menu</MaterialIcon>
          </a>
        </div>
      </header>

      <main className="services-main">
        <section className="services-hero">
          <div className="services-hero-copy">
            <span className="services-eyebrow">Dịch vụ MotoCore</span>
            <h1>Dịch vụ sửa, rửa và bảo dưỡng xe máy theo quy trình rõ ràng.</h1>
            <p>
              Chọn đúng dịch vụ, xem thời lượng dự kiến và đặt lịch nhanh. MotoCore tập trung vào minh bạch chi phí,
              an toàn vận hành và trải nghiệm giao nhận xe gọn gàng.
            </p>
            <div className="services-hero-actions">
              <a className="primary-button" href="/booking">Đặt lịch ngay</a>
              <a className="secondary-button" href="#price-list">Xem bảng giá</a>
            </div>
          </div>
          <div className="services-hero-media">
            <img
              alt="Kỹ thuật viên MotoCore kiểm tra xe máy"
              src="https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=82"
            />
            <div className="services-hero-note">
              <MaterialIcon>verified</MaterialIcon>
              <div>
                <strong>Quy trình có kiểm soát</strong>
                <span>Tiếp nhận, chẩn đoán, xác nhận, thực hiện, bàn giao.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="services-toolbar" aria-label="Lọc dịch vụ">
          {serviceCategories.map((category) => (
            <button
              className={activeCategory === category.id ? "active" : ""}
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
            >
              <MaterialIcon>{category.icon}</MaterialIcon>
              {category.label}
            </button>
          ))}
        </section>

        <section className="services-grid" aria-label="Danh sách dịch vụ">
          {visibleServices.map((service) => (
            <article className="service-detail-card" key={service.title}>
              <div className="service-detail-media">
                <img alt={service.title} src={service.image} />
                <span>{service.duration}</span>
              </div>
              <div className="service-detail-body">
                <div className="service-detail-icon">
                  <MaterialIcon>{service.icon}</MaterialIcon>
                </div>
                <h2>{service.title}</h2>
                <p>{service.description}</p>
                <ul>
                  {service.features.map((feature) => (
                    <li key={feature}>
                      <MaterialIcon>check_circle</MaterialIcon>
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="service-detail-footer">
                  <strong>{service.price}</strong>
                  <a href="/booking">Đặt lịch</a>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="services-process">
          <div className="services-section-heading">
            <span>Quy trình</span>
            <h2>Từ đặt lịch đến bàn giao đều có trạng thái rõ ràng.</h2>
          </div>
          <div className="services-process-grid">
            {process.map(([number, title, text]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="services-price" id="price-list">
          <div className="services-section-heading">
            <span>Bảng giá tham khảo</span>
            <h2>Chi phí cơ bản trước khi kỹ thuật viên kiểm tra thực tế.</h2>
          </div>
          <div className="services-price-table">
            <table>
              <thead>
                <tr>
                  <th>Dịch vụ</th>
                  <th>Thời lượng</th>
                  <th>Giá tham khảo</th>
                </tr>
              </thead>
              <tbody>
                {priceRows.map(([name, time, price]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{time}</td>
                    <td>{price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="services-cta">
          <div>
            <span>Sẵn sàng chăm sóc xe?</span>
            <h2>Đặt lịch để MotoCore chuẩn bị đúng kỹ thuật viên và vật tư.</h2>
          </div>
          <a className="primary-button" href="/booking">Đặt lịch dịch vụ</a>
        </section>
      </main>
    </div>
  );
}
