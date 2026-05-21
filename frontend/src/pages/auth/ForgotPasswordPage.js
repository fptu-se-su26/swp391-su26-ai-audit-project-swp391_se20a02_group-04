import React from "react";
import "../../styles/auth/ForgotPasswordPage.css";

function MaterialIcon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

export default function ForgotPasswordPage() {
  return (
    <div className="forgot-page">
      <header className="forgot-header">
        <div className="forgot-header-inner">
          <a className="forgot-logo" href="#/home">
            MOTOCORE
          </a>
          <nav className="forgot-nav" aria-label="Điều hướng khôi phục mật khẩu">
            <a href="#/home">Giải pháp</a>
            <a href="#/home">Quy trình</a>
            <a href="#/home">Kho vật tư</a>
            <a href="#/home">Hỗ trợ</a>
          </nav>
          <div className="forgot-header-actions">
            <a className="forgot-login-link" href="#/login">
              Đăng nhập
            </a>
            <a className="forgot-register-link" href="#/register">
              Đăng ký
            </a>
          </div>
        </div>
      </header>

      <main className="forgot-main">
        <section className="forgot-hero" aria-label="Khôi phục tài khoản">
          <img
            alt="Không gian garage công nghiệp MOTOCORE"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-w9urJ_9v-JY-BitUanC7kcfWRRYIjDgTV6cPim-0W1a06mhbFSXGd5ld1jNvcGNL_zxinwMu7oHMDGoVJcpS43HgGx34Xdrd4BFRM-NWED4zi43J1XdMWzapldSTrikNibUnOQW1CGsfMmsI6CQDBsziN9lQgjf8LdDyshIa-aXf8UxQJoOQNzOz2A9P9Aq6KNGsB_AmxvtxvnIbRrwGRlsSSLT3N2zITQQ1pICRtzIcMQNdluvmFAslErnALT8rVVuzgMRzZLo"
          />
          <div className="forgot-hero-overlay" />
          <div className="forgot-hero-copy">
            <h1>Khôi phục tài khoản</h1>
            <p>
              Tiếp tục duy trì hiệu suất hoạt động của xưởng với hệ thống quản
              trị thông minh MOTOCORE.
            </p>
          </div>
        </section>

        <section className="forgot-panel">
          <div className="forgot-card">
            <div className="forgot-heading">
              <MaterialIcon className="reset-icon">lock_reset</MaterialIcon>
              <h2>Quên mật khẩu?</h2>
              <p>
                Nhập email hoặc số điện thoại để nhận mã khôi phục tài khoản
                của bạn.
              </p>
            </div>

            <form className="forgot-form">
              <label className="forgot-field" htmlFor="recovery-identity">
                <span>Email/Số điện thoại</span>
                <div>
                  <MaterialIcon>contact_mail</MaterialIcon>
                  <input
                    id="recovery-identity"
                    name="recoveryIdentity"
                    placeholder="example@motocore.vn"
                    type="text"
                  />
                </div>
              </label>

              <button className="forgot-submit" type="submit">
                Gửi mã xác nhận
              </button>

              <a className="back-login-link" href="#/login">
                <MaterialIcon>arrow_back</MaterialIcon>
                Quay lại đăng nhập
              </a>
            </form>

            <div className="forgot-trust">
              <div>
                <MaterialIcon>verified_user</MaterialIcon>
                Bảo mật SSL 256-bit
              </div>
              <div>
                <MaterialIcon>support_agent</MaterialIcon>
                Hỗ trợ 24/7
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="forgot-footer">
        <div>
          <strong>MOTOCORE</strong>
          <nav aria-label="Liên kết chân trang">
            <a href="#/home">Chính sách bảo mật</a>
            <a href="#/home">Điều khoản dịch vụ</a>
            <a href="#/home">Tìm garage</a>
            <a href="#/staff/dashboard">Cổng kỹ thuật viên</a>
          </nav>
          <span>© 2024 MOTOCORE Industrial Systems. Bảo lưu mọi quyền.</span>
        </div>
      </footer>
    </div>
  );
}
