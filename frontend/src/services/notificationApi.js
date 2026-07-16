import { getAuthSession } from "./authApi";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

async function notificationRequest(path, options = {}) {
  const { accessToken } = getAuthSession();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const validationMessage = Array.isArray(payload.errors)
      ? payload.errors.map((error) => error.message).join(" ")
      : "";

    throw new Error(validationMessage || payload.message || "Request failed");
  }

  return payload;
}

export function getNotifications(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });
  const queryString = query.toString();
  return notificationRequest(`/notifications${queryString ? `?${queryString}` : ""}`);
}

export function markAsRead(notificationId) {
  return notificationRequest(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export function markAllAsRead() {
  return notificationRequest("/notifications/read-all", {
    method: "PATCH",
  });
}
