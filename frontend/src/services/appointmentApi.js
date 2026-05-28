import { getAuthSession } from "./authApi";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

async function appointmentRequest(path, options = {}) {
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

export function createAppointment(appointment) {
  return appointmentRequest("/appointments", {
    method: "POST",
    body: JSON.stringify(appointment),
  });
}

export function getMyAppointments(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  return appointmentRequest(`/appointments/my${queryString ? `?${queryString}` : ""}`);
}

export function cancelAppointment(appointmentId, cancelReason = "") {
  return appointmentRequest(`/appointments/${appointmentId}/cancel`, {
    method: "PATCH",
    body: JSON.stringify(cancelReason ? { cancel_reason: cancelReason } : {}),
  });
}
