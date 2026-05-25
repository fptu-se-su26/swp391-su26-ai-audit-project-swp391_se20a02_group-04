const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const AUTH_MESSAGE_TRANSLATIONS = [
  ["Email already registered", "Email này đã được đăng ký."],
  ["Phone number already registered", "Số điện thoại này đã được đăng ký."],
  ["Registration failed", "Đăng ký thất bại. Vui lòng thử lại."],
  [
    "Registration successful. Please check your email to verify your account.",
    "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.",
  ],
  ["Login successful", "Đăng nhập thành công."],
  ["Invalid credentials", "Email, số điện thoại hoặc mật khẩu không đúng."],
  [
    "Account is deactivated. Please contact support.",
    "Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ hỗ trợ.",
  ],
  [
    "This account was created with Google. Please use Google Sign-In.",
    "Tài khoản này được tạo bằng Google. Vui lòng đăng nhập bằng Google.",
  ],
  ["Login failed", "Đăng nhập thất bại. Vui lòng thử lại."],
  ["Email is required", "Vui lòng nhập email."],
  ["Please provide a valid email address", "Email không hợp lệ."],
  ["Phone number is required", "Vui lòng nhập số điện thoại."],
  [
    "Phone number must be a valid Vietnamese phone number",
    "Số điện thoại phải là số Việt Nam hợp lệ.",
  ],
  ["Password is required", "Vui lòng nhập mật khẩu."],
  [
    "Password must be between 8-128 characters",
    "Mật khẩu phải có từ 8 đến 128 ký tự.",
  ],
  [
    "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    "Mật khẩu cần có chữ hoa, chữ thường, số và ký tự đặc biệt.",
  ],
  ["Password confirmation is required", "Vui lòng xác nhận mật khẩu."],
  ["Passwords do not match", "Mật khẩu xác nhận không khớp."],
  ["Full name is required", "Vui lòng nhập họ tên."],
  ["Full name must be between 2-100 characters", "Họ tên phải có từ 2 đến 100 ký tự."],
  ["Full name can only contain letters and spaces", "Họ tên chỉ được chứa chữ cái và khoảng trắng."],
  ["Email or phone number is required", "Vui lòng nhập email hoặc số điện thoại."],
  [
    "If an account exists with this email, a password reset link has been sent.",
    "Nếu email tồn tại trong hệ thống, liên kết khôi phục mật khẩu đã được gửi.",
  ],
  ["Password reset link has been sent to your email", "Liên kết khôi phục mật khẩu đã được gửi đến email của bạn."],
  ["Failed to process password reset request", "Không thể xử lý yêu cầu khôi phục mật khẩu."],
  ["Failed to send password reset email", "Không thể gửi email khôi phục mật khẩu."],
  ["Email verified successfully", "Xác thực email thành công."],
  ["Invalid or expired OTP code", "Mã OTP không đúng hoặc đã hết hạn."],
  ["Email already verified", "Email đã được xác thực trước đó."],
  ["OTP has been resent to your email", "Mã OTP mới đã được gửi đến email của bạn."],
  ["Password reset successfully. You can now login with your new password.", "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới."],
  ["Invalid or expired reset token", "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn."],
  ["New password must be different from your current password", "Mật khẩu mới phải khác mật khẩu hiện tại."],
  ["Request failed", "Yêu cầu thất bại. Vui lòng thử lại."],
];

export function translateAuthMessage(message) {
  if (!message) return "";

  const translatedMessage = AUTH_MESSAGE_TRANSLATIONS.reduce(
    (currentMessage, [englishMessage, vietnameseMessage]) =>
      currentMessage.replaceAll(englishMessage, vietnameseMessage),
    message
  );

  return translatedMessage
    .replace(/Invalid credentials\. \d+ attempts remaining before account lockout\./g, "Thông tin đăng nhập không đúng. Vui lòng thử lại.")
    .replace(/Account locked due to multiple failed login attempts\..*/g, "Tài khoản đã bị khóa tạm thời do đăng nhập sai nhiều lần.")
    .replace(/Account is locked due to multiple failed login attempts\..*/g, "Tài khoản đã bị khóa tạm thời do đăng nhập sai nhiều lần.");
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const validationMessage = Array.isArray(payload.errors)
      ? payload.errors.map((error) => error.message).join(" ")
      : "";

    throw new Error(translateAuthMessage(validationMessage || payload.message || "Request failed"));
  }

  return {
    ...payload,
    message: translateAuthMessage(payload.message),
  };
}

export function saveAuthSession(data) {
  if (!data) return;

  const { user, tokens } = data;
  const roles = normalizeRoles(data.roles || user?.roles || []);

  if (tokens?.accessToken) {
    localStorage.setItem("accessToken", tokens.accessToken);
  }

  if (tokens?.refreshToken) {
    localStorage.setItem("refreshToken", tokens.refreshToken);
  }

  if (user) {
    localStorage.setItem("authUser", JSON.stringify(user));
  }

  if (roles) {
    localStorage.setItem("authRoles", JSON.stringify(roles));
  }
}

export function getAuthSession() {
  const accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");
  const user = parseStoredJson("authUser", null);
  const roles = normalizeRoles(parseStoredJson("authRoles", []));

  if (accessToken && !isUsableJwt(accessToken)) {
    clearAuthSession();
    return {
      accessToken: null,
      refreshToken: null,
      user: null,
      roles: [],
    };
  }

  return {
    accessToken,
    refreshToken,
    user,
    roles,
  };
}

export function clearAuthSession() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("authUser");
  localStorage.removeItem("authRoles");
}

export function hasAnyRole(allowedRoles, userRoles = getAuthSession().roles) {
  const normalizedAllowedRoles = normalizeRoles(allowedRoles);
  const normalizedUserRoles = normalizeRoles(userRoles);

  return normalizedAllowedRoles.some((role) => normalizedUserRoles.includes(role));
}

export function getDefaultRouteByRoles(roles = getAuthSession().roles) {
  const normalizedRoles = normalizeRoles(roles);

  if (normalizedRoles.includes("ADMIN") || normalizedRoles.includes("MANAGER")) {
    return "/admin";
  }

  if (normalizedRoles.includes("STAFF")) {
    return "/staff/dashboard";
  }

  if (normalizedRoles.includes("CUSTOMER")) {
    return "/booking";
  }

  return "/home";
}

function normalizeRoles(roles = []) {
  return roles
    .map((role) => {
      if (typeof role === "string") return role;
      return role?.name || role?.role_name || "";
    })
    .filter(Boolean)
    .map((role) => role.toUpperCase());
}

function parseStoredJson(key, fallbackValue) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function isUsableJwt(token) {
  try {
    const [, payloadPart] = token.split(".");

    if (!payloadPart) {
      return false;
    }

    const normalizedPayload = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(normalizedPayload));

    if (!payload.exp) {
      return true;
    }

    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function login(credentials) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function register(account) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(account),
  });
}

export function forgotPassword(email) {
  return request("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function verifyOtp(email, otp) {
  return request("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
}

export function resendOtp(email) {
  return request("/auth/resend-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword({ token, new_password, confirm_password }) {
  return request("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password, confirm_password }),
  });
}
