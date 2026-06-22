const STATUS_META = {
  PENDING: { label: "CHO XAC NHAN", key: "pending", className: "status-blue" },
  CONFIRMED: { label: "DUOC GIAO", key: "assigned", className: "status-blue" },
  IN_PROGRESS: { label: "DANG LAM", key: "in_progress", className: "status-yellow" },
  COMPLETED: { label: "HOAN THANH", key: "completed", className: "status-green" },
  PAID: { label: "HOAN THANH", key: "completed", className: "status-green" },
  CANCELLED: { label: "DA HUY", key: "cancelled", className: "status-red" },
  REJECTED: { label: "TU CHOI", key: "cancelled", className: "status-red" },
  NO_SHOW: { label: "KHONG DEN", key: "cancelled", className: "status-red" },
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

export function hasFullJobAssignment(job = {}) {
  const raw = job.raw || {};
  return Boolean(job.staffId && getEntityId(raw.repair_bay_id));
}

export function canStartJob(job = {}) {
  return job.status === "CONFIRMED" && hasFullJobAssignment(job);
}

export function canUseMaterials(job = {}) {
  return job.status === "IN_PROGRESS";
}

export function canCompleteJob(job = {}, user) {
  return job.status === "IN_PROGRESS" && isJobAssignedToUser(job, user);
}

export function canMarkNoShow(job = {}) {
  return job.status === "CONFIRMED";
}

export function formatCurrency(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("vi-VN")}d`;
}

export function formatDuration(minutes) {
  if (!minutes) return "Chua co";
  if (minutes < 60) return `${minutes} phut`;

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

function getServiceType(service = {}, serviceDoc = {}) {
  return String(service.type || serviceDoc.category || "").toUpperCase();
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
  const vehicleName = [vehicle.brand, vehicle.model].filter(Boolean).join(" ").trim() || "Xe may";
  const serviceName = service.name || serviceDoc.service_name || "Dich vu sua xe";
  const issue =
    service.repair_issue ||
    service.issue_description ||
    appointment.customer_note ||
    appointment.customer_notes ||
    "Chua co ghi chu tu khach.";
  const estimatedDuration =
    service.estimated_duration_minutes ||
    serviceDoc.estimated_duration ||
    appointment.total_service_duration_minutes ||
    appointment.estimated_duration;
  const estimatedPrice = service.estimated_price || serviceDoc.base_price || appointment.estimated_price || 0;
  const serviceType = getServiceType(service, serviceDoc);

  return {
    id: appointmentId,
    appointmentId,
    routeId: appointmentId,
    staffId,
    code: appointment.appointment_code || appointmentId,
    vehicle: vehicleName,
    plate: vehicle.license_plate || "Chua cap nhat",
    customer: customer.full_name || "Khach hang",
    phone: customer.phone || "Chua cap nhat",
    email: customer.email || "",
    time: appointment.start_time || appointment.time_slot || "--:--",
    date: appointment.appointment_date || "",
    serviceIcon: SERVICE_ICON[serviceType] || "build",
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
    model: [vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "Chua cap nhat",
    mileage: typeof vehicle.odometer === "number" ? `${vehicle.odometer.toLocaleString("vi-VN")} km` : "Chua cap nhat",
    issue,
    estimate: formatDuration(estimatedDuration),
    estimatedDuration,
    laborCost: formatCurrency(estimatedPrice),
    laborCostValue: estimatedPrice,
    recommendation:
      appointment.staff_notes ||
      service.description ||
      "Kiem tra, cap nhat ghi chu ky thuat va gui quan ly xac nhan khi hoan thanh.",
    raw: appointment,
  };
}

function getJobActions(statusKey) {
  if (statusKey === "assigned") return ["Chi tiet", "Bat dau"];
  if (statusKey === "in_progress") return ["Them vat tu", "Hoan thanh"];
  return ["Chi tiet"];
}

export function filterJobsByUiStatus(jobs, filter) {
  if (!filter || filter === "ALL") return jobs;
  if (filter === "ASSIGNED") return jobs.filter((job) => job.statusKey === "assigned");
  if (filter === "IN_PROGRESS") return jobs.filter((job) => job.statusKey === "in_progress");
  if (filter === "COMPLETED") return jobs.filter((job) => job.statusKey === "completed");
  return jobs;
}

export function getNextJob(jobs) {
  return jobs.find(canStartJob) || jobs.find((job) => job.statusKey === "assigned") || null;
}
