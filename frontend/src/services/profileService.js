/**
 * profileService.js
 * Frontend Service for interacting with Backend Profile APIs
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const getAuthHeaders = () => {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    const validationMessage = Array.isArray(data.errors)
      ? data.errors.map((error) => error.msg || error.message).join(" ")
      : "";
    throw new Error(validationMessage || data.message || "Yêu cầu thất bại");
  }

  return data;
}

export const profileService = {
  async getMe() {
    return request("/auth/me");
  },

  async updateProfile(profileData) {
    return request("/users/profile", {
      method: "PUT",
      body: JSON.stringify({
        full_name: profileData.fullname || profileData.full_name,
        phone: profileData.phone,
        ...(profileData.bio !== undefined || profileData.specialization !== undefined
          ? { specialization: profileData.bio ?? profileData.specialization ?? "" }
          : {}),
        ...(profileData.avatar !== undefined || profileData.avatar_url !== undefined
          ? { avatar_url: profileData.avatar || profileData.avatar_url || "" }
          : {}),
      }),
    });
  },

  async changePassword(passwordData) {
    const current = passwordData.current || passwordData.current_password;
    const next = passwordData.new || passwordData.new_password;
    const confirm = passwordData.confirm || passwordData.confirm_password || next;

    return request("/users/change-password", {
      method: "PUT",
      body: JSON.stringify({
        current_password: current,
        new_password: next,
        confirm_password: confirm,
      }),
    });
  },

  async getActivityLogs(page = 1, limit = 20) {
    return request(`/users/activity-logs?page=${page}&limit=${limit}`);
  },
};

export default profileService;
