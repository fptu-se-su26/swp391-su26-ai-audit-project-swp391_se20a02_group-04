import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthHomeLogo from "../../components/AuthHomeLogo";
import { getDefaultRouteByRoles, googleLogin, login, saveAuthSession } from "../../services/authApi";
import "../../styles/auth/LoginPage.css";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function MaterialIcon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
    remember: false,
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const googleButtonRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleButtonRef.current) return undefined;

    let isMounted = true;

    const handleCredentialResponse = async (googleResponse) => {
      if (!googleResponse?.credential) {
        setStatus({ type: "error", message: "Không nhận được mã xác thực Google." });
        return;
      }

      setStatus({ type: "", message: "" });
      setIsGoogleSubmitting(true);

      try {
        const response = await googleLogin(googleResponse.credential);
        saveAuthSession(response.data);
        const fromPath = location.state?.from?.pathname;
        navigate(fromPath || getDefaultRouteByRoles(response.data?.roles), { replace: true });
      } catch (error) {
        if (isMounted) {
          setStatus({ type: "error", message: error.message || "Đăng nhập Google thất bại. Vui lòng thử lại." });
        }
      } finally {
        if (isMounted) {
          setIsGoogleSubmitting(false);
        }
      }
    };

    const renderGoogleButton = () => {
      if (!isMounted || !window.google?.accounts?.id || !googleButtonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        logo_alignment: "left",
        width: Math.min(400, googleButtonRef.current.offsetWidth || 400),
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      const existingScript = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
      const script = existingScript || document.createElement("script");

      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = renderGoogleButton;

      if (!existingScript) {
        document.body.appendChild(script);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [location.state, navigate]);

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "", message: "" });
    setIsSubmitting(true);

    try {
      const response = await login({
        identifier: formData.identifier.trim(),
        password: formData.password,
      });

      saveAuthSession(response.data);
      const fromPath = location.state?.from?.pathname;
      navigate(fromPath || getDefaultRouteByRoles(response.data?.roles), { replace: true });
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Đăng nhập thất bại. Vui lòng thử lại." });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <p>Giải pháp quản lý garage thông minh, tối ưu hóa quy trình dịch vụ và chăm sóc khách hàng.</p>
          </div>
        </section>

        <section className="login-panel">
          <div className="login-card">
            <AuthHomeLogo className="login-home-logo" />

            <div className="login-heading">
              <h1>Chào mừng quay lại</h1>
              <p>Đăng nhập để quản lý lịch hẹn và dịch vụ của bạn</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              {status.message && (
                <div className={`auth-message auth-message-${status.type}`} role="alert" aria-live="polite">
                  {status.message}
                </div>
              )}

              <label className="login-field" htmlFor="username">
                <span>Email/Số điện thoại</span>
                <div className="login-input-wrap">
                  <MaterialIcon>person</MaterialIcon>
                  <input
                    id="username"
                    name="identifier"
                    onChange={handleChange}
                    placeholder="name@company.com"
                    required
                    type="text"
                    value={formData.identifier}
                  />
                </div>
              </label>

              <label className="login-field" htmlFor="password">
                <span className="password-label-row">
                  <span>Mật khẩu</span>
                  <a href="/forgot-password">Quên mật khẩu?</a>
                </span>
                <div className="login-input-wrap">
                  <MaterialIcon>lock</MaterialIcon>
                  <input
                    id="password"
                    name="password"
                    onChange={handleChange}
                    placeholder="********"
                    required
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
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
                <input checked={formData.remember} name="remember" onChange={handleChange} type="checkbox" />
                <span>Ghi nhớ đăng nhập</span>
              </label>

              <button className="login-submit" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                <MaterialIcon>arrow_forward</MaterialIcon>
              </button>
            </form>

            <div className="login-divider">
              <span>Hoặc tiếp tục với</span>
            </div>

            <div className="social-login-grid">
              <div className="google-login-button" ref={googleButtonRef}>
                {!GOOGLE_CLIENT_ID && (
                  <button className="google-login-fallback" type="button" disabled>
                    Google chưa được cấu hình
                  </button>
                )}
              </div>
              {isGoogleSubmitting && <p className="google-login-status">Đang xác thực với Google...</p>}
            </div>

            <p className="signup-copy">
              Chưa có tài khoản?
              <a href="/register">Đăng ký ngay</a>
            </p>
          </div>
        </section>
      </main>

      <footer className="login-support-footer">
        <a href="/home">Điều khoản</a>
        <a href="/home">Bảo mật</a>
        <a href="/home">Hỗ trợ kỹ thuật: 1900 xxxx</a>
      </footer>
    </div>
  );
}
