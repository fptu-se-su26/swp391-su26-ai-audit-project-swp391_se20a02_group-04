import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resendOtp, verifyOtp } from "../../services/authApi";
import "../../styles/auth/AuthActionPage.css";

function MaterialIcon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

export default function VerifyOtpPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const emailFromQuery = searchParams.get("email") || "";
  const [email, setEmail] = useState(emailFromQuery);
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "", message: "" });

    if (!normalizedEmail || otp.trim().length < 4) {
      setStatus({ type: "error", message: "Vui lòng nhập email và mã OTP hợp lệ." });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await verifyOtp(normalizedEmail, otp.trim());
      setStatus({ type: "success", message: response.message || "Xác thực email thành công." });
      window.setTimeout(() => navigate("/booking", { replace: true }), 900);
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Không thể xác thực OTP." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setStatus({ type: "", message: "" });

    if (!normalizedEmail) {
      setStatus({ type: "error", message: "Vui lòng nhập email trước khi gửi lại OTP." });
      return;
    }

    setIsResending(true);

    try {
      const response = await resendOtp(normalizedEmail);
      setStatus({ type: "success", message: response.message || "Mã OTP mới đã được gửi." });
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Không thể gửi lại OTP." });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="auth-action-page">
      <main className="auth-action-shell">
        <section className="auth-action-visual">
          <img
            alt="Kỹ thuật viên MotoCore kiểm tra xe"
            src="https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1400&q=85"
          />
          <div />
          <strong>MOTOCORE</strong>
          <p>Xác thực tài khoản giúp bảo vệ lịch hẹn, thông tin xe và lịch sử dịch vụ của bạn.</p>
        </section>

        <section className="auth-action-panel">
          <a className="auth-action-logo" href="/home">MOTOCORE</a>
          <div className="auth-action-heading">
            <MaterialIcon>mark_email_read</MaterialIcon>
            <span>Xác thực email</span>
            <h1>Nhập mã OTP đã gửi đến email của bạn</h1>
            <p>Sau khi xác thực, bạn có thể sử dụng đầy đủ tính năng đặt lịch và quản lý hồ sơ khách hàng.</p>
          </div>

          <form className="auth-action-form" onSubmit={handleSubmit}>
            {status.message && (
              <div className={`auth-message auth-message-${status.type}`} role="alert" aria-live="polite">
                {status.message}
              </div>
            )}

            <label>
              Email
              <input
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email@motocore.vn"
                required
                type="email"
                value={email}
              />
            </label>

            <label>
              Mã OTP
              <input
                inputMode="numeric"
                maxLength="8"
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                placeholder="Nhập mã OTP"
                required
                value={otp}
              />
            </label>

            <button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Đang xác thực..." : "Xác thực tài khoản"}
            </button>
          </form>

          <div className="auth-action-links">
            <button disabled={isResending} onClick={handleResend} type="button">
              {isResending ? "Đang gửi lại..." : "Gửi lại mã OTP"}
            </button>
            <a href="/login">Quay lại đăng nhập</a>
          </div>
        </section>
      </main>
    </div>
  );
}
