import { getAuthSession } from "./authApi";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

async function staffRequest(path, options = {}) {
  const { accessToken } = getAuthSession();

  if (!accessToken) {
    throw new Error("UNAUTHORIZED");
  }

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
      ? payload.errors.map((error) => error.msg || error.message).join(" ")
      : "";

    throw new Error(validationMessage || payload.message || "Khong the tai du lieu nhan vien.");
  }

  return payload;
}

function withQuery(path, params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  return `${path}${queryString ? `?${queryString}` : ""}`;
}

export function getStaffAppointments(params = {}) {
  return staffRequest(withQuery("/staff/appointments", params));
}

export function getStaffDashboard() {
  return staffRequest("/staff/dashboard");
}

export function getStaffSchedule(params = {}) {
  return staffRequest(withQuery("/staff/schedule", params));
}

export function getTodaySchedule() {
  return staffRequest("/staff/schedule/today");
}

export function getStaffProfile() {
  return staffRequest("/staff/profile");
}

export function updateStaffProfile(payload = {}) {
  return staffRequest("/staff/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getTodayStaffAppointments() {
  return staffRequest("/staff/appointments/today");
}

export function getStaffAppointmentStats(params = {}) {
  return staffRequest(withQuery("/staff/appointments/my-stats", params));
}

export function getStaffAppointmentById(appointmentId) {
  return staffRequest(`/staff/appointments/${appointmentId}`);
}

export function acknowledgeStaffAppointment(appointmentId) {
  return staffRequest(`/staff/appointments/${appointmentId}/acknowledge`, {
    method: "POST",
  });
}

export function startStaffAppointment(appointmentId, payload = {}) {
  return staffRequest(`/staff/appointments/${appointmentId}/start`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function completeStaffAppointment(appointmentId, payload = {}) {
  return staffRequest(`/staff/appointments/${appointmentId}/complete`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function markStaffAppointmentNoShow(appointmentId, payload = {}) {
  return staffRequest(`/staff/appointments/${appointmentId}/no-show`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getAppointmentHistory(params = {}) {
  return staffRequest(withQuery("/staff/appointments/history", params));
}

export function updateStaffAppointmentStatus(appointmentId, { status, notes, actual_duration } = {}) {
  return staffRequest(`/staff/appointments/${appointmentId}/status`, {
    method: "PUT",
    body: JSON.stringify({
      status,
      ...(notes ? { notes } : {}),
      ...(actual_duration ? { actual_duration } : {}),
    }),
  });
}

export function saveStaffAppointmentNote(appointmentId, notes) {
  return staffRequest(`/staff/appointments/${appointmentId}/notes`, {
    method: "PUT",
    body: JSON.stringify({ notes }),
  });
}

export function getStaffInventory(params = {}) {
  return staffRequest(withQuery("/staff/inventory", params));
}

export function getStaffLowStock(params = {}) {
  return staffRequest(withQuery("/staff/inventory/low-stock", params));
}

export function getAppointmentMaterials(appointmentId) {
  return staffRequest(`/staff/appointments/${appointmentId}/materials`);
}

export function useAppointmentMaterials(appointmentId, { items, notes } = {}) {
  return staffRequest(`/staff/appointments/${appointmentId}/materials`, {
    method: "POST",
    body: JSON.stringify({ items, notes }),
  });
}

export function getTodayAttendance() {
  return staffRequest("/staff/attendance/today");
}

export function checkInStaff(note = "") {
  return staffRequest("/staff/attendance/check-in", {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export function checkOutStaff(note = "") {
  return staffRequest("/staff/attendance/check-out", {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export function getAttendanceHistory(params = {}) {
  return staffRequest(withQuery("/staff/attendance/history", params));
}

export function getAttendanceSummary(params = {}) {
  return staffRequest(withQuery("/staff/attendance/summary", params));
}
