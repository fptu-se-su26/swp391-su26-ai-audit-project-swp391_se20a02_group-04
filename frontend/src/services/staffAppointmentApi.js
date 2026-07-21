import { getAuthSession } from "./authApi";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const STAFF_OWNERSHIP_MESSAGE = "Công việc này chưa được phân công cho tài khoản staff hiện tại.";

function isDevelopment() {
  return process.env.NODE_ENV === "development";
}

function getCurrentUserId(user = {}) {
  return user._id || user.id || user.userId || user.user_id || null;
}

function getEntityId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value._id || value.id || value.userId || value.user_id || null;
}

function isStaffPortalSession(roles = []) {
  const normalizedRoles = roles.map((role) => String(role).toUpperCase());
  return normalizedRoles.includes("STAFF") && !normalizedRoles.includes("ADMIN") && !normalizedRoles.includes("MANAGER");
}

function debugStaffAccess(label, data) {
  if (!isDevelopment()) return;
  // Staff-only diagnostics. Do not log tokens or personal note contents.
  console.debug(`[staff-appointments] ${label}`, data);
}

async function staffRequest(path, options = {}) {
  const { accessToken, roles, user } = getAuthSession();
  const currentUserId = getCurrentUserId(user);
  const requestUrl = `${API_BASE_URL}${path}`;

  if (!accessToken) {
    throw new Error("UNAUTHORIZED");
  }

  if (!isStaffPortalSession(roles)) {
    throw new Error("Vui lòng đăng nhập bằng tài khoản staff để xem công việc.");
  }

  debugStaffAccess("request", {
    currentUserId,
    requestUrl,
    method: options.method || "GET",
  });

  const response = await fetch(requestUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => ({}));
  const appointment = payload?.data?.appointment;

  if (appointment) {
    debugStaffAccess("appointment-response", {
      currentUserId,
      appointmentId: getEntityId(appointment),
      appointmentStaffId: getEntityId(appointment.staff_id),
      requestUrl,
    });
  }

  if (!response.ok || payload.success === false) {
    const validationMessage = Array.isArray(payload.errors)
      ? payload.errors.map((error) => error.msg || error.message).join(" ")
      : "";
    const message = validationMessage || payload.message || "Không thể tải dữ liệu nhân viên.";

    if (response.status === 403 && /assigned to you|phân công/i.test(message)) {
      const error = new Error(STAFF_OWNERSHIP_MESSAGE);
      error.code = "STAFF_APPOINTMENT_OWNERSHIP";
      throw error;
    }

    throw new Error(message);
  }

  return payload;
}

async function attendanceRequest(primaryPath, fallbackPath, options = {}) {
  try {
    return normalizeAttendanceResponse(await staffRequest(primaryPath, options));
  } catch (error) {
    if (error.message !== "Route not found") {
      throw error;
    }

    return normalizeAttendanceResponse(await staffRequest(fallbackPath, options));
  }
}

function normalizeAttendanceResponse(payload) {
  const attendance = payload?.data?.attendance;

  if (!attendance) {
    return payload;
  }

  const statusMap = {
    IN_SHIFT: "CHECKED_IN",
    COMPLETED: "CHECKED_OUT",
  };

  const totalHours =
    attendance.total_hours !== undefined
      ? Number(attendance.total_hours || 0)
      : Number(((attendance.total_minutes || 0) / 60).toFixed(2));

  return {
    ...payload,
    data: {
      ...payload.data,
      attendance: {
        ...attendance,
        status: statusMap[attendance.status] || attendance.status,
        check_in_time: attendance.check_in_time || attendance.check_in_at || null,
        check_out_time: attendance.check_out_time || attendance.check_out_at || null,
        total_hours: totalHours,
      },
    },
  };
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

export function saveDiagnosis(appointmentId, diagnosis_notes) {
  return staffRequest(`/staff/appointments/${appointmentId}/diagnosis`, {
    method: "PUT",
    body: JSON.stringify({ diagnosis_notes }),
  });
}

export function saveContactLog(appointmentId, { status, notes = "" } = {}) {
  return staffRequest(`/staff/appointments/${appointmentId}/contact-log`, {
    method: "PUT",
    body: JSON.stringify({ status, notes }),
  });
}

export function saveRepairLog(appointmentId, { status, notes = "" } = {}) {
  return staffRequest(`/staff/appointments/${appointmentId}/repair-log`, {
    method: "PUT",
    body: JSON.stringify({ status, notes }),
  });
}

export function createPayment(appointmentId) {
  return staffRequest(`/staff/appointments/${appointmentId}/payment`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function getPaymentStatus(appointmentId) {
  return staffRequest(`/staff/appointments/${appointmentId}/payment/status`);
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

export function revertAppointmentMaterial(appointmentId, transactionId) {
  return staffRequest(`/staff/appointments/${appointmentId}/materials/${transactionId}/revert`, {
    method: "POST",
  });
}

export function getTodayAttendance() {
  return attendanceRequest("/staff/attendance/today", "/attendance/today");
}

export function checkInStaff(note = "") {
  return attendanceRequest("/staff/attendance/check-in", "/attendance/check-in", {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export function checkOutStaff(note = "") {
  return attendanceRequest("/staff/attendance/check-out", "/attendance/check-out", {
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
