import React from "react";
import "../../styles/home/AboutPage.css";

const workshopStats = [
  ["15+", "năm kinh nghiệm"],
  ["10k+", "xe đã chăm sóc"],
  ["98%", "khách hàng quay lại"],
  ["24/7", "hỗ trợ khẩn cấp"],
];

const values = [
  {
    icon: "engineering",
    title: "Kỹ thuật đúng chuẩn",
    text: "Mỗi xe được kiểm tra theo checklist rõ ràng, có ghi nhận tình trạng và đề xuất trước khi sửa.",
  },
  {
    icon: "fact_check",
    title: "Minh bạch chi phí",
    text: "Khách hàng được báo giá trước, xác nhận vật tư sử dụng và theo dõi trạng thái lịch hẹn.",
  },
  {
    icon: "verified_user",
    title: "An toàn vận hành",
    text: "MotoCore ưu tiên phanh, lốp, điện, động cơ và các hạng mục ảnh hưởng trực tiếp đến an toàn.",
  },
];

const processSteps = [
  ["01", "Tiếp nhận xe", "Ghi nhận thông tin xe, triệu chứng và yêu cầu riêng của khách hàng."],
  ["02", "Chẩn đoán", "Kỹ thuật viên kiểm tra, xác định nguyên nhân và đề xuất phương án xử lý."],
  ["03", "Thực hiện", "Sửa chữa, bảo dưỡng hoặc chăm sóc xe theo đúng quy trình đã thống nhất."],
  ["04", "Bàn giao", "Kiểm tra lại, tổng kết vật tư, chi phí và hướng dẫn khách theo dõi sau dịch vụ."],
];

const team = [
  ["Trần Minh Khoa", "Kỹ thuật trưởng", "12 năm xử lý động cơ và hệ thống điện xe máy."],
  ["Nguyễn Hoàng Nam", "Cố vấn dịch vụ", "Phụ trách tiếp nhận, báo giá và chăm sóc khách hàng."],
  ["Lê Quốc Huy", "Kỹ thuật viên", "Chuyên bảo dưỡng định kỳ, phanh, lốp và vệ sinh động cơ."],
];

function MaterialIcon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

export default function AboutPage() {
  return (
    <div className="about-page">
      <header className="about-header">
        <a className="about-logo" href="/home">MOTOCORE</a>
        <nav className="about-nav" aria-label="Điều hướng chính">
          <a href="/home">Trang chủ</a>
          <a href="/home">Dịch vụ</a>
          <a href="/booking">Lịch hẹn</a>
          <a className="active" href="/about">Về chúng tôi</a>
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

      <main>
        <section className="about-hero">
          <img
            alt="Xưởng MotoCore chăm sóc xe máy"
            className="about-hero-image"
            src="https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1800&q=85"
          />
          <div className="about-hero-overlay" />
          <div className="about-hero-content">
            <span className="about-eyebrow">Garage xe máy hiện đại</span>
            <h1>MotoCore chăm sóc chiếc xe như một phần an toàn của bạn.</h1>
            <p>
              Chúng tôi xây dựng MotoCore như một garage minh bạch, gọn gàng và dễ tin cậy:
              khách đặt lịch nhanh, kỹ thuật viên làm việc theo quy trình, quản lý nắm rõ
              trạng thái từng xe.
            </p>
            <div className="about-hero-actions">
              <a className="primary-button" href="/booking">Đặt lịch dịch vụ</a>
              <a className="secondary-button" href="/home">Xem dịch vụ</a>
            </div>
          </div>
        </section>

        <section className="about-stats" aria-label="Số liệu MotoCore">
          {workshopStats.map(([value, label]) => (
            <div key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </section>

        <section className="about-story">
          <div>
            <span className="about-section-label">Câu chuyện</span>
            <h2>Từ một xưởng nhỏ đến hệ thống đặt lịch có quy trình.</h2>
          </div>
          <p>
            MotoCore bắt đầu từ nhu cầu rất thực tế: khách hàng muốn biết xe của mình đang
            được xử lý tới đâu, còn kỹ thuật viên cần một nơi rõ ràng để nhận việc, ghi vật tư
            và hoàn thành công việc. Website này được thiết kế để nối các bước đó lại với nhau,
            giúp việc sửa/rửa xe máy bớt thủ công và dễ kiểm soát hơn.
          </p>
        </section>

        <section className="about-values">
          {values.map((value) => (
            <article key={value.title}>
              <MaterialIcon>{value.icon}</MaterialIcon>
              <h3>{value.title}</h3>
              <p>{value.text}</p>
            </article>
          ))}
        </section>

        <section className="about-process">
          <div className="about-section-heading">
            <span className="about-section-label">Quy trình</span>
            <h2>Mỗi lịch hẹn đều có trạng thái rõ ràng.</h2>
          </div>
          <div className="process-grid">
            {processSteps.map(([number, title, text]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-team">
          <div className="about-section-heading">
            <span className="about-section-label">Đội ngũ</span>
            <h2>Những người trực tiếp giữ chất lượng dịch vụ.</h2>
          </div>
          <div className="team-grid">
            {team.map(([name, role, bio]) => (
              <article key={name}>
                <div className="team-avatar">
                  <MaterialIcon>person</MaterialIcon>
                </div>
                <h3>{name}</h3>
                <strong>{role}</strong>
                <p>{bio}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
