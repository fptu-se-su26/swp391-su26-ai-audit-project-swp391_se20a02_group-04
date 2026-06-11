const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function getAuthHeaders() {
  const token =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || "Yêu cầu thất bại");
  }

  return payload.data || payload;
}

export const adminUserService = {
  listUsers(params = {}) {
    const query = new URLSearchParams({
      page: String(params.page || 1),
      limit: String(params.limit || 100),
      ...(params.search ? { search: params.search } : {}),
      ...(params.role && params.role !== "all" ? { role: params.role.toUpperCase() } : {}),
      ...(params.is_active !== undefined ? { is_active: String(params.is_active) } : {}),
    });

    return request(`/admin/users?${query.toString()}`);
  },

  replaceRole(userId, roleName) {
    return request(`/admin/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role_name: roleName.toUpperCase() }),
    });
  },

  lockUser(userId, duration = 10080, reason = "Khóa bởi quản trị viên") {
    return request(`/admin/users/${userId}/lock`, {
      method: "PUT",
      body: JSON.stringify({ duration, reason }),
    });
  },

  unlockUser(userId) {
    return request(`/admin/users/${userId}/unlock`, {
      method: "PUT",
    });
  },

  banUser(userId, reason = "Ban bởi quản trị viên") {
    return request(`/admin/users/${userId}/ban`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    });
  },

  unbanUser(userId) {
    return request(`/admin/users/${userId}/unban`, {
      method: "PUT",
    });
  },

  deleteUser(userId, permanent = true) {
    return request(`/admin/users/${userId}?permanent=${permanent ? "true" : "false"}`, {
      method: "DELETE",
    });
  },
};

export default adminUserService;
