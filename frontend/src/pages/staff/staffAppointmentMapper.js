const STATUS_META = {
  PENDING: { label: "CHỜ XÁC NHẬN", key: "pending", className: "status-blue" },
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

export function hasFullJobAssignment(job = {}) {
  return Boolean(job.staffId);
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
  if (!minutes) return "Chưa có";
  if (minutes < 60) return `${minutes} phút`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function formatAssignedAt(value) {
  if (!value) return "Chưa cập nhật";
  const assignedAt = new Date(value);
  if (Number.isNaN(assignedAt.getTime())) return "Chưa cập nhật";
  const now = new Date();
  const minutes = Math.max(0, Math.floor((now - assignedAt) / 60000));
  if (minutes < 60) return minutes < 1 ? "Vừa giao" : `Giao ${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Giao ${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `Giao ${days} ngày trước`;
}

export function formatAppointmentDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });
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
  const serviceName = service.name || serviceDoc.service_name || "Dịch vụ sửa xe";
  const issue =
    service.repair_issue ||
    service.issue_description ||
    appointment.customer_note ||
    appointment.customer_notes ||
    "Chưa có ghi chú từ khách.";
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
    plate: vehicle.license_plate || "Chưa cập nhật",
    customer: customer.full_name || "Khách hàng",
    phone: customer.phone || "Chưa cập nhật",
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
    model: [vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "Chưa cập nhật",
    mileage: typeof vehicle.odometer === "number" ? `${vehicle.odometer.toLocaleString("vi-VN")} km` : "Chưa cập nhật",
    issue,
    estimate: formatDuration(estimatedDuration),
    estimatedDuration,
    laborCost: formatCurrency(estimatedPrice),
    laborCostValue: estimatedPrice,
    diagnosisNotes: appointment.diagnosis_notes || "",
    contactLog: appointment.contact_log?.status
      ? {
          status: appointment.contact_log.status,
          notes: appointment.contact_log.notes || "",
          contacted_at: appointment.contact_log.contacted_at || null,
        }
      : null,
    repairLog: appointment.repair_log?.status
      ? {
          status: appointment.repair_log.status,
          notes: appointment.repair_log.notes || "",
          completed_at: appointment.repair_log.completed_at || null,
        }
      : null,
    paymentInfo: appointment.payment_info?.order_code ? appointment.payment_info : null,
    assignedAt: appointment.assigned_at || null,
    priceType: String(serviceDoc.price_type || service.price_type || "FIXED").toUpperCase(),
    recommendation:
      appointment.staff_notes ||
      service.description ||
      "Kiểm tra, cập nhật ghi chú kỹ thuật và gửi quản lý xác nhận khi hoàn thành.",
    raw: appointment,
  };
}

function getJobActions(statusKey) {
  if (statusKey === "assigned") return ["Chi tiết", "Bắt đầu"];
  if (statusKey === "in_progress") return ["Thêm vật tư", "Hoàn thành"];
  return ["Chi tiết"];
}

const JOB_PRIORITY_ORDER = {
  assigned: 0,
  in_progress: 1,
  pending: 2,
  completed: 3,
  cancelled: 4,
};

export function sortStaffJobsByPriority(jobs = []) {
  return [...jobs].sort((left, right) => {
    const leftOrder = JOB_PRIORITY_ORDER[left.statusKey] ?? 99;
    const rightOrder = JOB_PRIORITY_ORDER[right.statusKey] ?? 99;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;

    const leftDate = left.raw?.appointment_date || left.date || "";
    const rightDate = right.raw?.appointment_date || right.date || "";
    if (leftDate !== rightDate) return String(leftDate).localeCompare(String(rightDate));

    return String(left.time || "").localeCompare(String(right.time || ""));
  });
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
