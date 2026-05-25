import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../../services/authApi";
import "../../styles/auth/AuthActionPage.css";

function MaterialIcon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromQuery = searchParams.get("token") || "";
  const [formData, setFormData] = useState({
    token: tokenFromQuery,
    new_password: "",
    confirm_password: "",
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "", message: "" });

    if (formData.new_password !== formData.confirm_password) {
      setStatus({ type: "error", message: "Mật khẩu xác nhận không khớp." });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await resetPassword(formData);
      setStatus({ type: "success", message: response.message || "Đặt lại mật khẩu thành công." });
      window.setTimeout(() => navigate("/login", { replace: true }), 1000);
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Không thể đặt lại mật khẩu." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-action-page">
      <main className="auth-action-shell">
        <section className="auth-action-visual">
          <img
            alt="Garage MotoCore bảo mật tài khoản"
            src="https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=1400&q=85"
          />
          <div />
          <strong>MOTOCORE</strong>
          <p>Đặt lại mật khẩu an toàn để tiếp tục quản lý lịch hẹn và dịch vụ xe của bạn.</p>
        </section>

        <section className="auth-action-panel">
          <a className="auth-action-logo" href="/home">MOTOCORE</a>
          <div className="auth-action-heading">
            <MaterialIcon>lock_reset</MaterialIcon>
            <span>Khôi phục tài khoản</span>
            <h1>Tạo mật khẩu mới</h1>
            <p>Mật khẩu nên có chữ hoa, chữ thường, số và ký tự đặc biệt để đảm bảo an toàn.</p>
          </div>

          <form className="auth-action-form" onSubmit={handleSubmit}>
            {status.message && (
              <div className={`auth-message auth-message-${status.type}`} role="alert" aria-live="polite">
                {status.message}
              </div>
            )}

            <label>
              Mã khôi phục
              <input
                name="token"
                onChange={handleChange}
                placeholder="Token trong email"
                required
                value={formData.token}
              />
            </label>

            <label>
              Mật khẩu mới
              <input
                name="new_password"
                onChange={handleChange}
                placeholder="********"
                required
                type="password"
                value={formData.new_password}
              />
            </label>

            <label>
              Xác nhận mật khẩu
              <input
                name="confirm_password"
                onChange={handleChange}
                placeholder="********"
                required
                type="password"
                value={formData.confirm_password}
              />
            </label>

            <button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Đang cập nhật..." : "Đặt lại mật khẩu"}
            </button>
          </form>

          <div className="auth-action-links">
            <a href="/forgot-password">Gửi lại liên kết khôi phục</a>
            <a href="/login">Quay lại đăng nhập</a>
          </div>
        </section>
      </main>
    </div>
  );
}
