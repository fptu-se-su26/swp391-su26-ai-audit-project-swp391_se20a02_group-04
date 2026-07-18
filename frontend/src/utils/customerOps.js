const ACTIVE_BOOKING_STATUSES = new Set(["PENDING", "CONFIRMED", "IN_PROGRESS"]);
const STATUS_LABELS = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  IN_PROGRESS: "Đang xử lý",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
  NO_SHOW: "Không đến",
};

function toId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value._id || value.id || "");
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMoney(amount) {
  const value = Number(amount) || 0;
  if (value <= 0) return "0đ";
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}tr`;
  }
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "KH";
  return parts
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getVehicleFromAppointment(appointment = {}) {
  const vehicle = appointment.vehicle_info || appointment.vehicle || {};
  const name = [vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "Chưa cập nhật xe";
  const plate = vehicle.license_plate || "Chưa có biển số";
  return { name, plate, key: `${name}__${plate}`.toLowerCase() };
}

function getServiceName(appointment = {}) {
  const service = appointment.service_id || appointment.service || {};
  return service.service_name || service.name || service.repair_issue || "Dịch vụ chưa cập nhật";
}

function getAppointmentCost(appointment = {}) {
  const service = appointment.service_id || appointment.service || {};
  return Number(appointment.final_cost || service.base_price || appointment.service?.estimated_price || 0);
}

function getAppointmentSortTime(appointment = {}) {
  return (
    parseDate(appointment.appointment_start_at) ||
    parseDate(appointment.appointment_date) ||
    parseDate(appointment.created_at) ||
    new Date(0)
  );
}

function isNewThisMonth(dateValue) {
  const date = parseDate(dateValue);
  if (!date) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function deriveActivity(appointments = []) {
  const upcoming = appointments.find((item) => ACTIVE_BOOKING_STATUSES.has(item.status));
  if (upcoming) {
    if (upcoming.status === "IN_PROGRESS") {
      return { key: "in_progress", label: "Đang xử lý", tone: "info" };
    }
    if (upcoming.status === "PENDING") {
      return { key: "upcoming", label: "Chờ xác nhận", tone: "warning" };
    }
    return { key: "upcoming", label: "Có lịch sắp tới", tone: "success" };
  }

  if (!appointments.length) {
    return { key: "new", label: "Chưa đặt lịch", tone: "neutral" };
  }

  const latest = appointments[0];
  if (latest.status === "COMPLETED") {
    return { key: "stable", label: "Ổn định", tone: "success" };
  }
  if (latest.status === "CANCELLED" || latest.status === "NO_SHOW") {
    return { key: "attention", label: "Cần chăm sóc", tone: "danger" };
  }

  return { key: "stable", label: STATUS_LABELS[latest.status] || "Đã từng đến", tone: "neutral" };
}

function ensureCustomerBucket(map, seed = {}) {
  const id = toId(seed.id || seed._id);
  if (!id) return null;

  if (!map.has(id)) {
    const name = seed.full_name || seed.name || "Khách hàng";
    map.set(id, {
      id,
      code: `KH-${String(id).slice(-6).toUpperCase()}`,
      name,
      initials: getInitials(name),
      phone: seed.phone || "Chưa cập nhật",
      email: seed.email || "Chưa có email",
      createdAt: seed.created_at || seed.createdAt || null,
      isActive: seed.is_active !== false,
      visits: 0,
      completedVisits: 0,
      spent: 0,
      lastVisitAt: null,
      lastVisitLabel: "—",
      vehicles: [],
      vehicleMap: new Map(),
      appointments: [],
      activity: { key: "new", label: "Chưa đặt lịch", tone: "neutral" },
    });
  }

  return map.get(id);
}

function attachAppointment(customer, appointment) {
  const status = String(appointment.status || "PENDING").toUpperCase();
  const sortTime = getAppointmentSortTime(appointment);
  const vehicle = getVehicleFromAppointment(appointment);
  const cost = getAppointmentCost(appointment);

  customer.appointments.push({
    id: toId(appointment._id || appointment.id),
    code: appointment.appointment_code || String(appointment._id || "").slice(-6).toUpperCase(),
    service: getServiceName(appointment),
    status,
    statusLabel: STATUS_LABELS[status] || status,
    dateLabel: formatDate(appointment.appointment_date || appointment.appointment_start_at),
    cost,
    costLabel: formatMoney(cost),
    vehicle,
    sortTime,
  });

  customer.visits += 1;
  if (status === "COMPLETED") {
    customer.completedVisits += 1;
    customer.spent += cost;
  }

  if (!customer.lastVisitAt || sortTime > customer.lastVisitAt) {
    customer.lastVisitAt = sortTime;
    customer.lastVisitLabel = formatDate(sortTime);
  }

  if (!customer.vehicleMap.has(vehicle.key)) {
    customer.vehicleMap.set(vehicle.key, vehicle);
    customer.vehicles.push(vehicle);
  }

  if ((!customer.phone || customer.phone === "Chưa cập nhật") && (appointment.customer_snapshot?.phone || appointment.customer_id?.phone)) {
    customer.phone = appointment.customer_snapshot?.phone || appointment.customer_id?.phone;
  }

  if ((!customer.email || customer.email === "Chưa có email") && (appointment.customer_snapshot?.email || appointment.customer_id?.email)) {
    customer.email = appointment.customer_snapshot?.email || appointment.customer_id?.email;
  }
}

export function buildCustomerProfiles({ users = [], appointments = [] } = {}) {
  const map = new Map();

  users.forEach((user) => {
    ensureCustomerBucket(map, user);
  });

  appointments.forEach((appointment) => {
    const customerRef = appointment.customer_id || appointment.customer_snapshot || {};
    const customerId = toId(customerRef._id || customerRef.id || appointment.customer_id);
    if (!customerId) return;

    const customer = ensureCustomerBucket(map, {
      ...customerRef,
      id: customerId,
      full_name: customerRef.full_name || customerRef.name || appointment.customer_snapshot?.full_name,
      phone: customerRef.phone || appointment.customer_snapshot?.phone,
      email: customerRef.email || appointment.customer_snapshot?.email,
    });

    if (customer) attachAppointment(customer, appointment);
  });

  return Array.from(map.values())
    .map((customer) => {
      const appointmentsSorted = [...customer.appointments].sort((a, b) => b.sortTime - a.sortTime);
      const primaryVehicle = customer.vehicles[0] || { name: "Chưa có xe", plate: "—" };
      const activity = deriveActivity(appointmentsSorted);

      return {
        ...customer,
        appointments: appointmentsSorted.slice(0, 8),
        vehicle: primaryVehicle.name,
        plate: primaryVehicle.plate,
        vehicleCount: customer.vehicles.length,
        spentLabel: formatMoney(customer.spent),
        activity,
        status: activity.label,
        statusTone: activity.tone,
        isNew: isNewThisMonth(customer.createdAt) || (customer.visits > 0 && customer.visits <= 1 && isNewThisMonth(customer.lastVisitAt)),
        hasUpcoming: activity.key === "upcoming" || activity.key === "in_progress",
        needsAttention: activity.key === "attention",
        vehicleMap: undefined,
      };
    })
    .sort((a, b) => {
      const aTime = a.lastVisitAt ? a.lastVisitAt.getTime() : 0;
      const bTime = b.lastVisitAt ? b.lastVisitAt.getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
      return a.name.localeCompare(b.name, "vi");
    });
}

export function summarizeCustomers(customers = []) {
  const newThisMonth = customers.filter((item) => isNewThisMonth(item.createdAt) || item.isNew).length;
  const upcoming = customers.filter((item) => item.hasUpcoming).length;
  const completedVisits = customers.reduce((sum, item) => sum + item.completedVisits, 0);
  const totalSpent = customers.reduce((sum, item) => sum + item.spent, 0);

  return {
    total: customers.length,
    newThisMonth,
    upcoming,
    completedVisits,
    totalSpent,
    totalSpentLabel: formatMoney(totalSpent),
  };
}

export const CUSTOMER_FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "upcoming", label: "Có lịch sắp tới" },
  { key: "new", label: "Mới" },
  { key: "active", label: "Đã hoàn tất" },
  { key: "attention", label: "Cần chăm sóc" },
];

export function filterCustomers(customers, { filter = "all", search = "" } = {}) {
  const keyword = search.trim().toLowerCase();

  return customers.filter((customer) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "upcoming" && customer.hasUpcoming) ||
      (filter === "new" && (customer.isNew || customer.activity.key === "new")) ||
      (filter === "active" && customer.completedVisits > 0) ||
      (filter === "attention" && customer.needsAttention);

    if (!matchesFilter) return false;
    if (!keyword) return true;

    const haystack = [
      customer.name,
      customer.phone,
      customer.email,
      customer.code,
      customer.plate,
      customer.vehicle,
      ...customer.vehicles.map((item) => `${item.name} ${item.plate}`),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(keyword);
  });
}

export { formatDate, formatMoney, STATUS_LABELS };
