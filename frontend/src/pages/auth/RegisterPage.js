import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDefaultRouteByRoles, register, saveAuthSession } from "../../services/authApi";
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
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
    acceptedTerms: false,
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

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

    if (!formData.acceptedTerms) {
      setStatus({ type: "error", message: "Vui lòng đồng ý điều khoản trước khi đăng ký." });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await register({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        confirm_password: formData.confirm_password,
      });

      saveAuthSession(response.data);
      navigate(getDefaultRouteByRoles(response.data?.roles || ["CUSTOMER"]), { replace: true });
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Đăng ký thất bại. Vui lòng thử lại." });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <p>Nền tảng quản lý xưởng dịch vụ xe máy chuyên nghiệp.</p>
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
              <p>Tham gia hệ sinh thái quản lý công nghiệp MOTOCORE.</p>
            </div>

            <form className="register-form" onSubmit={handleSubmit}>
              {status.message && (
                <div className={`auth-message auth-message-${status.type}`} role="alert" aria-live="polite">
                  {status.message}
                </div>
              )}

              <label className="register-field" htmlFor="fullname">
                <span>Họ tên</span>
                <div>
                  <MaterialIcon>person</MaterialIcon>
                  <input
                    id="fullname"
                    name="full_name"
                    onChange={handleChange}
                    placeholder="Nguyen Van A"
                    required
                    type="text"
                    value={formData.full_name}
                  />
                </div>
              </label>

              <label className="register-field" htmlFor="email">
                <span>Email</span>
                <div>
                  <MaterialIcon>mail</MaterialIcon>
                  <input
                    id="email"
                    name="email"
                    onChange={handleChange}
                    placeholder="email@garage.com"
                    required
                    type="email"
                    value={formData.email}
                  />
                </div>
              </label>

              <label className="register-field" htmlFor="phone">
                <span>Số điện thoại</span>
                <div>
                  <MaterialIcon>call</MaterialIcon>
                  <input
                    id="phone"
                    name="phone"
                    onChange={handleChange}
                    placeholder="0901234567"
                    required
                    type="tel"
                    value={formData.phone}
                  />
                </div>
              </label>

              <div className="register-password-grid">
                <label className="register-field" htmlFor="register-password">
                  <span>Mật khẩu</span>
                  <div>
                    <MaterialIcon>lock</MaterialIcon>
                    <input
                      id="register-password"
                      name="password"
                      onChange={handleChange}
                      placeholder="********"
                      required
                      type="password"
                      value={formData.password}
                    />
                  </div>
                </label>

                <label className="register-field" htmlFor="confirm-password">
                  <span>Xác nhận mật khẩu</span>
                  <div>
                    <MaterialIcon>shield</MaterialIcon>
                    <input
                      id="confirm-password"
                      name="confirm_password"
                      onChange={handleChange}
                      placeholder="********"
                      required
                      type="password"
                      value={formData.confirm_password}
                    />
                  </div>
                </label>
              </div>

              <label className="terms-row">
                <input
                  checked={formData.acceptedTerms}
                  name="acceptedTerms"
                  onChange={handleChange}
                  type="checkbox"
                />
                <span>
                  Tôi đồng ý với các <a href="#/register">Điều khoản dịch vụ</a> và{" "}
                  <a href="#/register">Chính sách bảo mật</a> của MOTOCORE.
                </span>
              </label>

              <button className="register-submit" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Đang đăng ký..." : "Đăng ký ngay"}
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
                <button type="button" disabled>
                  Google
                </button>
                <button type="button" disabled>
                  <MaterialIcon className="facebook-icon">social_leaderboard</MaterialIcon>
                  Facebook
                </button>
              </div>
            </div>

            <p className="register-copyright">Copyright 2024 MOTOCORE Industrial Systems.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
