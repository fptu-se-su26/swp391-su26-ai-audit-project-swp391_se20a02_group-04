import React, { useState } from "react";
import "../../styles/auth/LoginPage.css";

function MaterialIcon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="login-page">
      <main className="login-shell">
        <section className="login-hero" aria-label="Garage MOTOCORE">
          <div className="login-hero-shade" />
          <div className="system-badge">
            <span />
            Hệ thống đang hoạt động
          </div>
          <div className="login-hero-content">
            <div className="login-brand-row">
              <MaterialIcon className="brand-icon">settings_input_component</MaterialIcon>
              <h2>MOTOCORE</h2>
            </div>
            <p>
              Giải pháp quản lý garage thông minh, tối ưu hóa mọi quy trình
              dịch vụ và chăm sóc khách hàng chuyên nghiệp.
            </p>
          </div>
        </section>

        <section className="login-panel">
          <div className="login-card">
            <a className="mobile-login-brand" href="#/home">
              <MaterialIcon>handyman</MaterialIcon>
              <span>MOTOCORE</span>
            </a>

            <div className="login-heading">
              <h1>Chào mừng quay lại</h1>
              <p>Đăng nhập để quản lý lịch hẹn và dịch vụ của bạn</p>
            </div>

            <form className="login-form">
              <label className="login-field" htmlFor="username">
                <span>Email/Số điện thoại</span>
                <div className="login-input-wrap">
                  <MaterialIcon>person</MaterialIcon>
                  <input id="username" name="username" placeholder="name@company.com" type="text" />
                </div>
              </label>

              <label className="login-field" htmlFor="password">
                <span className="password-label-row">
                  <span>Mật khẩu</span>
                  <a href="#/forgot-password">Quên mật khẩu?</a>
                </span>
                <div className="login-input-wrap">
                  <MaterialIcon>lock</MaterialIcon>
                  <input
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                  />
                  <button
                    className="password-toggle"
                    type="button"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    <MaterialIcon>{showPassword ? "visibility_off" : "visibility"}</MaterialIcon>
                  </button>
                </div>
              </label>

              <label className="remember-row">
                <input name="remember" type="checkbox" />
                <span>Ghi nhớ đăng nhập</span>
              </label>

              <button className="login-submit" type="submit">
                Đăng nhập
                <MaterialIcon>arrow_forward</MaterialIcon>
              </button>
            </form>

            <div className="login-divider">
              <span>Hoặc tiếp tục với</span>
            </div>

            <div className="social-login-grid">
              <button type="button">
                <img
                  alt="Google"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8xjh7rgI8v0w9j5QNjnk479dibLjiQ2UJ3sfUov7gXgl-DEmSzkxSzyZmJOKoaq1D9OqQqqkglwYYDSuP1GGXfmM8_NUA6kKzt9Z5hOe-zWLaf06wzZkOSZuDWWdoIBINGwbOlppSz0VeRCZkyHyg3B-hhIR36nLtLEDBE3n4ekPjQXVF6wwNIefj7fPcIGNak6MTb4kPYO6wDxv3K3YcTQ9kjaBQkPhtcHz-jzYwhzoMiMfUHIu73QO4BC_ZTpueNb9YLRfTTyE"
                />
                Google
              </button>
              <button type="button">
                <img
                  alt="Facebook"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB6CH8ZQ4dk_y_GAH7I_ywHy5FKP6BOw3fCkexN9xcar16oRlkRR2soSdaZGQQhzFpNMPPZPYXLXj3Ep6qE6aUqFoSl9VER1AwqNwGDdGzVWQgc4fckCJBeCLvwbj3D9Q3SZna4n7bS0gAygxl5ham-J3gF1tfFxtK9w5Xm5kV1VJeYMWFpQT3Och3-Oor0-ogfkA09Ch3bR3-ewMpyxpJnpg0vqFX-GBaI0dWclRiqMFG-_LibAzabXMiGntzaMdA3I1n4YjMR-so"
                />
                Facebook
              </button>
            </div>

            <p className="signup-copy">
              Chưa có tài khoản?
              <a href="#/register">Đăng ký ngay</a>
            </p>
          </div>
        </section>
      </main>

      <footer className="login-support-footer">
        <a href="#/home">Điều khoản</a>
        <a href="#/home">Bảo mật</a>
        <a href="#/home">Hỗ trợ kỹ thuật: 1900 xxxx</a>
      </footer>
    </div>
  );
}
