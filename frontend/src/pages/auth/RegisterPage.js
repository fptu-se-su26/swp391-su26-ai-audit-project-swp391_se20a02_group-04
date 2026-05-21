import React from "react";
import "../../styles/auth/RegisterPage.css";

function MaterialIcon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

const featureItems = [
  ["verified", "Xác thực kỹ thuật"],
  ["monitoring", "Báo cáo thời gian thực"],
  ["precision_manufacturing", "Quản lý phụ tùng"],
];

export default function RegisterPage() {
  return (
    <div className="register-page">
      <main className="register-shell">
        <section className="register-hero" aria-label="Hệ thống công nghiệp MOTOCORE">
          <img
            alt="Xưởng sửa xe máy chuyên nghiệp"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYvASif0HCDzzIwGiZFEV1-12P4YJBR9ETBVHNMIkDO2w_W06Isfnw6lRR1IzVKyco32GFjGKgKH59fT1l_f3DhzLI0ks8mS0bdON_FaQPCVfCVKi025l6A5s3byOyqwNGKSQIQCY6HdmA2cKVm1Qu4nJT2DrHZ-Z6BSBQwb9dOYwz1xsPUOVTL45kRhIIpizY5hhmqrdXjKNvf2F3MRYGytyID1FSYIXjWk9X3BDzxJphU2bQppS7HOJv3TrRB2UAKTFSCzW-GI8"
          />
          <div className="register-hero-overlay" />
          <div className="register-hero-content">
            <div className="industrial-badge">
              <MaterialIcon>settings_input_component</MaterialIcon>
              Độ chính xác công nghiệp
            </div>
            <h1>
              MOTOCORE
              <br />
              <strong>Hệ Thống Quản Lý</strong>
            </h1>
            <p>
              Nền tảng quản lý xưởng dịch vụ xe máy chuyên nghiệp. Nâng tầm
              hiệu suất và độ chính xác trong mọi quy trình bảo trì.
            </p>
            <div className="register-feature-list">
              {featureItems.map(([icon, label]) => (
                <div key={label}>
                  <MaterialIcon>{icon}</MaterialIcon>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="register-panel">
          <div className="register-card">
            <a className="register-mobile-brand" href="#/home">
              <span>
                <MaterialIcon>build</MaterialIcon>
              </span>
              MOTOCORE
            </a>

            <div className="register-heading">
              <h2>Tạo tài khoản mới</h2>
              <p>Tham gia hệ sinh thái quản lý công nghiệp hàng đầu.</p>
            </div>

            <form className="register-form">
              <label className="register-field" htmlFor="fullname">
                <span>Họ tên</span>
                <div>
                  <MaterialIcon>person</MaterialIcon>
                  <input id="fullname" name="fullname" placeholder="Nguyễn Văn A" type="text" />
                </div>
              </label>

              <label className="register-field" htmlFor="email">
                <span>Email</span>
                <div>
                  <MaterialIcon>mail</MaterialIcon>
                  <input id="email" name="email" placeholder="email@garage.com" type="email" />
                </div>
              </label>

              <label className="register-field" htmlFor="phone">
                <span>Số điện thoại</span>
                <div>
                  <MaterialIcon>call</MaterialIcon>
                  <input id="phone" name="phone" placeholder="0901 234 567" type="tel" />
                </div>
              </label>

              <div className="register-password-grid">
                <label className="register-field" htmlFor="register-password">
                  <span>Mật khẩu</span>
                  <div>
                    <MaterialIcon>lock</MaterialIcon>
                    <input id="register-password" name="password" placeholder="••••••••" type="password" />
                  </div>
                </label>

                <label className="register-field" htmlFor="confirm-password">
                  <span>Xác nhận mật khẩu</span>
                  <div>
                    <MaterialIcon>shield</MaterialIcon>
                    <input
                      id="confirm-password"
                      name="confirmPassword"
                      placeholder="••••••••"
                      type="password"
                    />
                  </div>
                </label>
              </div>

              <label className="terms-row">
                <input type="checkbox" />
                <span>
                  Tôi đồng ý với các <a href="#/register">Điều khoản dịch vụ</a> và{" "}
                  <a href="#/register">Chính sách bảo mật</a> của MOTOCORE.
                </span>
              </label>

              <button className="register-submit" type="submit">
                Đăng ký ngay
              </button>
            </form>

            <div className="register-footer-links">
              <p>
                Đã có tài khoản?
                <a href="#/login">Đăng nhập</a>
              </p>
              <div className="register-divider">
                <span />
                Hoặc
                <span />
              </div>
              <div className="register-social-grid">
                <button type="button">
                  <img
                    alt="Google"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC90zO18OVMEeXvEWjLE41bmAEpwBTGik7cKRFZph9AEaYVk0tJPH8oJos_QQq__s0oVOEcj_ZlrtUt7V4mAPEPhXEwJ1jaSz_AZ23_YxnK5_N64eO6NO9GN08lv7u7xC3JTwxTC-CFgdQ9sL0OW6HhxrZce1YVoCuLza2-GB90jNk-6huB5gQOjN0CQ6OOi5IwKDxQ3ZPSCYLBjWQOiU6tiF-9DIDeCzwkBfadbAI0cM0vzc2cWYqOozoQG7jNUz9_zpOgEsizixM"
                  />
                  Google
                </button>
                <button type="button">
                  <MaterialIcon className="facebook-icon">social_leaderboard</MaterialIcon>
                  Facebook
                </button>
              </div>
            </div>

            <p className="register-copyright">
              © 2024 MOTOCORE Industrial Systems. Bảo lưu mọi quyền.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
