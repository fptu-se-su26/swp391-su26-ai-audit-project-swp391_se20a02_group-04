const STATUS_META = {
  PENDING: { label: "ĐƯỢC GIAO", key: "assigned", className: "status-blue" },
  CONFIRMED: { label: "ĐƯỢC GIAO", key: "assigned", className: "status-blue" },
  IN_PROGRESS: { label: "ĐANG LÀM", key: "in_progress", className: "status-yellow" },
  COMPLETED: { label: "HOÀN THÀNH", key: "completed", className: "status-green" },
  PAID: { label: "HOÀN THÀNH", key: "completed", className: "status-green" },
  CANCELLED: { label: "ĐÃ HỦY", key: "cancelled", className: "status-red" },
  REJECTED: { label: "TỪ CHỐI", key: "cancelled", className: "status-red" },
  NO_SHOW: { label: "KHÔNG ĐẾN", key: "cancelled", className: "status-red" },
};

const SERVICE_ICON = {
  WASH: "local_car_wash",
  MAINTENANCE: "build",
  REPAIR: "plumbing",
};

export function getEntityId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || value.id || value.userId || value.user_id || "";
}

export function getJobRouteId(job = {}) {
  return job.routeId || job.appointmentId || job.id;
}

export function getCurrentUserId(user = {}) {
  return user?._id || user?.id || user?.userId || user?.user_id || "";
}

export function isJobAssignedToUser(job, user) {
  const currentUserId = getCurrentUserId(user);
  if (!job || !currentUserId) return false;
  return String(job.staffId || "") === String(currentUserId);
}

export function formatCurrency(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("vi-VN")}đ`;
}

export function formatDuration(minutes) {
  if (!minutes) return "Chưa có";
  if (minutes < 60) return `${minutes} phút`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function getCustomer(appointment) {
  return appointment.customer_id || appointment.customer_snapshot || {};
}

function getVehicle(appointment) {
  return appointment.vehicle || appointment.vehicle_info || {};
}

function getService(appointment) {
  return appointment.service || {};
}

export function mapAppointmentToJob(appointment = {}) {
  const appointmentId = getEntityId(appointment);
  const staffId = getEntityId(appointment.staff_id);
  const customer = getCustomer(appointment);
  const vehicle = getVehicle(appointment);
  const service = getService(appointment);
  const serviceDoc = appointment.service_id || {};
  const status = String(appointment.status || "PENDING").toUpperCase();
  const meta = STATUS_META[status] || STATUS_META.PENDING;
  const vehicleName = [vehicle.brand, vehicle.model].filter(Boolean).join(" ").trim() || "Xe máy";
  const serviceName = service.name || serviceDoc.service_name || "Dịch vụ sửa xe";
  const issue = service.repair_issue || service.issue_description || appointment.customer_note || appointment.customer_notes || "Chưa có ghi chú từ khách.";
  const estimatedDuration = service.estimated_duration_minutes || serviceDoc.estimated_duration || appointment.estimated_duration;
  const estimatedPrice = service.estimated_price || serviceDoc.base_price || 0;

  return {
    id: appointmentId,
    appointmentId,
    routeId: appointmentId,
    staffId,
    code: appointment.appointment_code || appointmentId,
    vehicle: vehicleName,
    plate: vehicle.license_plate || "Chưa cập nhật",
    customer: customer.full_name || "Khách hàng",
    phone: customer.phone || "Chưa cập nhật",
    email: customer.email || "",
    time: appointment.start_time || appointment.time_slot || "--:--",
    date: appointment.appointment_date || "",
    serviceIcon: SERVICE_ICON[service.type] || "build",
    service: serviceName,
    description: service.description || serviceDoc.description || "",
    note: appointment.staff_notes || issue,
    customerNote: appointment.customer_note || appointment.customer_notes || "",
    staffNotes: appointment.staff_notes || "",
    status,
    statusLabel: meta.label,
    statusKey: meta.key,
    statusClass: meta.className,
    actions: getJobActions(meta.key),
    model: [vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "Chưa cập nhật",
    mileage: typeof vehicle.odometer === "number" ? `${vehicle.odometer.toLocaleString("vi-VN")} km` : "Chưa cập nhật",
    issue,
    estimate: formatDuration(estimatedDuration),
    estimatedDuration,
    laborCost: formatCurrency(estimatedPrice),
    laborCostValue: estimatedPrice,
    recommendation: appointment.staff_notes || service.description || "Kiểm tra, cập nhật ghi chú kỹ thuật và gửi quản lý xác nhận khi hoàn thành.",
    raw: appointment,
  };
}

function getJobActions(statusKey) {
  if (statusKey === "assigned") return ["Chi tiết", "Bắt đầu"];
  if (statusKey === "in_progress") return ["Thêm vật tư", "Hoàn thành"];
  if (statusKey === "completed") return ["Chi tiết", "Gửi quản lý"];
  return ["Chi tiết", "Xem"];
}

export function filterJobsByUiStatus(jobs, filter) {
  if (!filter || filter === "ALL") return jobs;
  if (filter === "ASSIGNED") return jobs.filter((job) => job.statusKey === "assigned");
  if (filter === "IN_PROGRESS") return jobs.filter((job) => job.statusKey === "in_progress");
  if (filter === "COMPLETED") return jobs.filter((job) => job.statusKey === "completed");
  return jobs;
}

export function getNextJob(jobs) {
  return jobs.find((job) => job.statusKey === "assigned") || jobs.find((job) => job.statusKey === "in_progress") || null;
}
