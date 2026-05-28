import React, { useState } from "react";
import { forgotPassword } from "../../services/authApi";
import "../../styles/auth/ForgotPasswordPage.css";

function MaterialIcon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "", message: "" });

    if (!email.includes("@")) {
      setStatus({ type: "error", message: "Chức năng quên mật khẩu hiện chỉ hỗ trợ email." });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await forgotPassword(email.trim());
      setStatus({ type: "success", message: response.message || "Đã gửi email khôi phục mật khẩu." });
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Không thể gửi yêu cầu khôi phục." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="forgot-page">
      <header className="forgot-header">
        <div className="forgot-header-inner">
          <a className="forgot-logo" href="/home">
            MOTOCORE
          </a>
          <nav className="forgot-nav" aria-label="Điều hướng khôi phục mật khẩu">
            <a href="/home">Giải pháp</a>
            <a href="/home">Quy trình</a>
            <a href="/home">Kho vật tư</a>
            <a href="/home">Hỗ trợ</a>
          </nav>
          <div className="forgot-header-actions">
            <a className="forgot-login-link" href="/login">
              Đăng nhập
            </a>
            <a className="forgot-register-link" href="/register">
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
            <p>Tiếp tục duy trì hiệu suất hoạt động của xưởng với MOTOCORE.</p>
          </div>
        </section>

        <section className="forgot-panel">
          <div className="forgot-card">
            <div className="forgot-heading">
              <MaterialIcon className="reset-icon">lock_reset</MaterialIcon>
              <h2>Quên mật khẩu?</h2>
              <p>Nhập email để nhận liên kết khôi phục tài khoản của bạn.</p>
            </div>

            <form className="forgot-form" onSubmit={handleSubmit}>
              {status.message && (
                <div className={`auth-message auth-message-${status.type}`} role="alert" aria-live="polite">
                  {status.message}
                </div>
              )}

              <label className="forgot-field" htmlFor="recovery-identity">
                <span>Email</span>
                <div>
                  <MaterialIcon>contact_mail</MaterialIcon>
                  <input
                    id="recovery-identity"
                    name="email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="example@motocore.vn"
                    required
                    type="email"
                    value={email}
                  />
                </div>
              </label>

              <button className="forgot-submit" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Đang gửi..." : "Gửi liên kết khôi phục"}
              </button>

              <a className="back-login-link" href="/login">
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
            <a href="/home">Chính sách bảo mật</a>
            <a href="/home">Điều khoản dịch vụ</a>
            <a href="/home">Tìm garage</a>
            <a href="/staff/dashboard">Cổng kỹ thuật viên</a>
          </nav>
          <span>Copyright 2024 MOTOCORE Industrial Systems.</span>
        </div>
      </footer>
    </div>
  );
}
