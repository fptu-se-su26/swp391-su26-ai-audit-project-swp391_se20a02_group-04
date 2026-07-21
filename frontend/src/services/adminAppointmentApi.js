import { getAuthSession } from "./authApi";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const statusTextMap = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  IN_PROGRESS: "Đang xử lý",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
  NO_SHOW: "Không đến",
};

async function adminAppointmentRequest(path, options = {}) {
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
      ? payload.errors.map((error) => error.msg || error.message).join(" ")
      : "";

    throw new Error(validationMessage || payload.message || "Không thể tải dữ liệu lịch hẹn.");
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

function formatDate(dateValue) {
  if (!dateValue) return "--/--/----";

  const normalized = String(dateValue);
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split("-");
    return `${day}/${month}/${year}`;
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return normalized;

  return date.toLocaleDateString("vi-VN");
}

function formatTime(timeValue) {
  if (!timeValue) return "";
  const text = String(timeValue).trim();
  const timeMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (timeMatch) return `${String(timeMatch[1]).padStart(2, "0")}:${timeMatch[2]}`;

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDateTime(dateValue) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return String(dateValue);
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function toApiDate(dateValue) {
  if (!dateValue) return undefined;
  const normalized = String(dateValue).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  if (/^\d{4}-\d{2}-\d{2}T/.test(normalized)) return normalized.slice(0, 10);
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(normalized)) {
    const [day, month, year] = normalized.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsedDate = new Date(normalized);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 10);
  }

  return undefined;
}

function getCustomer(appointment = {}) {
  return appointment.customer_id || appointment.customer_snapshot || {};
}

function getService(appointment = {}) {
  return appointment.service_id || appointment.service || {};
}

function getVehicle(appointment = {}) {
  return appointment.vehicle_info || appointment.vehicle || {};
}

function getVehicleName(vehicle = {}) {
  return [vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "Chưa cập nhật xe";
}

function getVehiclePlate(vehicle = {}) {
  return vehicle.license_plate || "Chưa có biển số";
}

function getUrgency(appointment = {}) {
  if (appointment.status === "PENDING") return "Lịch mới";
  if (!appointment.staff_id) return "Chưa phân kệ";
  if (appointment.status === "IN_PROGRESS") return "Ưu tiên cao";
  if (appointment.status === "CONFIRMED") return "Sắp đến giờ";
  return "Ổn định";
}

export function mapAdminAppointment(appointment = {}) {
  const customer = getCustomer(appointment);
  const service = getService(appointment);
  const vehicle = getVehicle(appointment);
  const vehicleName = getVehicleName(vehicle);
  const vehiclePlate = getVehiclePlate(vehicle);
  const staff = appointment.staff_id || {};
  const repairBay = appointment.repair_bay_id || {};
  const assignment = appointment.assignment_id || {};
  const status = String(appointment.status || "PENDING").toUpperCase();
  const estimatedPrice = appointment.final_cost || service.base_price || appointment.service?.estimated_price || 0;
  const estimatedDuration = service.estimated_duration || appointment.service?.estimated_duration_minutes || appointment.estimated_duration || 60;
  const rawPriority = String(appointment.priority || "").toLowerCase();
  const priority = rawPriority || (status === "IN_PROGRESS" ? "high" : status === "PENDING" ? "medium" : "low");

  return {
    raw: appointment,
    rawId: appointment._id,
    id: `#${appointment.appointment_code || appointment._id || "MC-00000"}`,
    service: service.service_name || service.name || service.repair_issue || appointment.service?.name || "Dịch vụ chưa cập nhật",
    customer: customer.full_name || "Khách hàng chưa cập nhật",
    customerInitials: (customer.full_name || "KH")
      .split(" ")
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase(),
    phone: customer.phone || "",
    email: customer.email || "",
    vehicle: `${vehicleName} - ${vehiclePlate}`,
    vehicleType: vehicleName,
    plate: vehiclePlate,
    year: vehicle.year || "",
    odometer: vehicle.odometer ? `${Number(vehicle.odometer).toLocaleString("vi-VN")} km` : "Chưa cập nhật",
    time: formatDate(appointment.appointment_date),
    apiDate: appointment.appointment_date,
    hour: appointment.start_time || appointment.time_slot || "--:--",
    bay: repairBay.name || (staff.full_name ? `KTV ${staff.full_name}` : "Chưa phân công"),
    repairBayCode: repairBay.code || "",
    repairBayLocation: repairBay.location || "",
    techAssigned: staff.full_name || "Chưa phân công",
    technicianSpecialization: staff.specialization || "",
    startTime: formatTime(assignment.estimated_start_time || appointment.appointment_start_at || appointment.start_time || appointment.time_slot),
    expectedDone: appointment.end_time || (appointment.estimated_end_time ? new Date(appointment.estimated_end_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "--:--"),
    actualDone: formatDateTime(appointment.actual_end_time || appointment.completed_at),
    urgency: getUrgency(appointment),
    status,
    statusText: statusTextMap[status] || statusTextMap.PENDING,
    priority,
    channel: "Database",
    createdDate: formatDate(appointment.created_at),
    lastUpdated: formatDateTime(appointment.updated_at),
    paymentStatus: appointment.final_cost || status === "COMPLETED" ? "paid" : "unpaid",
    customerNote: appointment.customer_note || appointment.customer_notes || "Chưa có ghi chú khách hàng.",
    garageNote: appointment.staff_notes || "Chưa có ghi chú garage.",
    services: [
      {
        name: service.service_name || service.name || appointment.service?.name || "Dịch vụ chưa cập nhật",
        time: `${estimatedDuration} phút`,
        price: estimatedPrice,
      },
    ],
  };
}

export function getAdminAppointments(params = {}) {
  return adminAppointmentRequest(withQuery("/admin/appointments", params));
}

export function getAdminAppointmentStatistics(params = {}) {
  return adminAppointmentRequest(withQuery("/admin/appointments/statistics", params));
}

export function getAdminAppointmentById(appointmentId) {
  return adminAppointmentRequest(`/admin/appointments/${appointmentId}`);
}

export async function getMappedAdminAppointmentById(appointmentId) {
  const response = await getAdminAppointmentById(appointmentId);
  return mapAdminAppointment(response.data?.appointment || {});
}

export async function updateAdminAppointmentStatus(appointmentId, status, notes = "") {
  const response = await adminAppointmentRequest(`/admin/appointments/${appointmentId}/status`, {
    method: "PUT",
    body: JSON.stringify({
      status,
      ...(notes ? { notes } : {}),
    }),
  });

  return response;
}

export async function startAdminAppointment(appointmentId) {
  return adminAppointmentRequest(`/admin/appointments/${appointmentId}/start`, {
    method: "PUT",
    body: JSON.stringify({}),
  });
}

export async function updateAdminAppointment(appointmentId, payload = {}) {
  const appointmentDate = toApiDate(payload.appointmentDate);

  return adminAppointmentRequest(`/admin/appointments/${appointmentId}`, {
    method: "PUT",
    body: JSON.stringify({
      ...(appointmentDate ? { appointment_date: appointmentDate } : {}),
      ...(payload.appointmentHour ? { start_time: payload.appointmentHour } : {}),
      ...(payload.expectedDone ? { end_time: payload.expectedDone } : {}),
      ...(payload.garageNote ? { staff_notes: payload.garageNote } : payload.customerNote ? { staff_notes: payload.customerNote } : {}),
      ...(payload.vehicleName || payload.vehiclePlate || payload.vehicleYear || payload.vehicleMileage ? {
        vehicle_info: {
          ...(payload.vehicleName ? { model: payload.vehicleName } : {}),
          ...(payload.vehiclePlate ? { license_plate: payload.vehiclePlate } : {}),
          ...(payload.vehicleYear ? { year: Number(payload.vehicleYear) } : {}),
          ...(payload.vehicleMileage ? { odometer: Number(String(payload.vehicleMileage).replace(/[^\d]/g, "")) } : {}),
        },
      } : {}),
    }),
  });
}

export async function cancelAdminAppointment(appointmentId, reason = "Hủy từ trang quản trị") {
  return adminAppointmentRequest(`/admin/appointments/${appointmentId}`, {
    method: "DELETE",
    body: JSON.stringify({ reason }),
  });
}

export { adminAppointmentRequest, withQuery };
