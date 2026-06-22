import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Bike,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  CreditCard,
  Edit3,
  Flame,
  Gauge,
  Globe,
  Hash,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  Printer,
  Search,
  Send,
  Shield,
  User,
  Users,
  Wrench,
  XCircle
} from "lucide-react";
import "../../styles/manager/AppointmentDetailTheme.css";
import "../../styles/manager/AppointmentDetailPage.css";
import AppointmentAssignmentDialog from "./AppointmentAssignmentDialog";
import {
  mockCancelAppointmentDetail,
  mockCompleteAppointment,
  mockConfirmAppointment,
  mockPrintServiceTicket,
  mockSendAppointmentEmail,
  mockSendAppointmentSms,
  mockStartAppointmentProcessing,
  mockUpdateAppointmentSchedule
} from "../../services/appointmentDetailMockApi";

const pendingStatuses = ["pending", "waiting_confirmation"];

const normalizeStatus = (status = "pending") => {
  const normalized = String(status).toLowerCase();
  if (normalized === "in_progress") return "processing";
  if (normalized === "completed" || normalized === "paid") return "done";
  if (normalized === "cancelled") return "cancelled";
  if (normalized === "confirmed") return "confirmed";
  if (normalized === "waiting_confirmation") return "waiting_confirmation";
  return "pending";
};

const buildAppointmentDetail = (appointment = {}) => {
  const status = normalizeStatus(appointment.status);
  const raw = appointment.raw || {};
  const customerRaw = raw.customer_id || raw.customer_snapshot || {};
  const vehicleRaw = raw.vehicle_info || raw.vehicle || {};
  const serviceRaw = raw.service_id || raw.service || {};
  const staffRaw = raw.staff_id || {};
  const bayRaw = raw.repair_bay_id || {};
  const assignmentRaw = raw.assignment_id || {};
  const vehicleParts = String(appointment.vehicle || "").split(" - ");
  const vehicleName = vehicleParts[0] || "Honda CBR1000RR-R";
  const vehiclePlate = appointment.plate || vehicleParts[vehicleParts.length - 1] || "29A1-12345";
  const fallbackServices = [
    { name: appointment.service || "Bảo dưỡng định kỳ 10.000km", time: "60 phút", price: 450000, quantity: 1 },
    { name: "Thay nhớt Motul 7100 10W40", time: "20 phút", price: 180000, quantity: 1 }
  ];
  const services = (appointment.services && appointment.services.length ? appointment.services : fallbackServices).map((service) => ({
    name: service.name || service.service_name || "Dịch vụ chưa cập nhật",
    time: service.time || service.duration || `${service.estimated_duration || service.estimated_duration_minutes || 0} phút`,
    price: Number(service.price || service.base_price || service.estimated_price || 0),
    quantity: Number(service.quantity || service.qty || 1),
    paymentStatus: service.paymentStatus || appointment.paymentStatus || raw.payment_status || "unpaid"
  }));
  const materials = appointment.materials || raw.materials_used || raw.materials || [];
  const activityLogs = appointment.activityLogs || raw.activity_logs || raw.history || [];

  return {
    id: appointment.id || "MC-99281",
    status,
    priority: appointment.priority || "high",
    createdDate: appointment.createdDate || "20/10/2026",
    appointmentDate: appointment.time || "24/10/2026",
    appointmentHour: appointment.hour || "09:00",
    channel: appointment.channel || "Website",
    createdBy: appointment.createdBy || raw.created_by?.full_name || raw.created_by_name || "Hệ thống",
    lastUpdated: appointment.lastUpdated || raw.updated_at || raw.updatedAt || "10:45 hôm nay",
    customer: {
      initials: appointment.customerInitials || getInitials(appointment.customer || "Khách hàng"),
      name: appointment.customer || "Nguyễn Minh Quân",
      tier: appointment.customerTier || customerRaw.member_tier || customerRaw.tier || "Chưa cập nhật",
      phone: appointment.phone || customerRaw.phone || "0901 234 567",
      email: appointment.email || customerRaw.email || "Chưa cập nhật",
      address: appointment.address || customerRaw.address || "Chưa cập nhật"
    },
    vehicle: {
      name: vehicleName,
      type: appointment.vehicleType || "Fireblade SP · Sport",
      plate: vehiclePlate,
      year: appointment.year || "2024",
      odometer: appointment.odometer || (vehicleRaw.odometer ? `${Number(vehicleRaw.odometer).toLocaleString("vi-VN")} km` : "Chưa cập nhật"),
      lastHistory: appointment.lastHistory || vehicleRaw.last_service || raw.last_service_history || "Chưa cập nhật",
      maintenanceNote: appointment.maintenanceNote || vehicleRaw.maintenance_note || "Chưa có ghi chú bảo dưỡng."
    },
    services,
    paymentStatus: appointment.paymentStatus || raw.payment_status || serviceRaw.payment_status || services[0]?.paymentStatus || "unpaid",
    assignment: {
      bay: appointment.bay || bayRaw.name || "Kệ sửa 02",
      area: appointment.repairBayLocation || bayRaw.location || bayRaw.code || "Khu sửa chữa chính",
      technician: appointment.techAssigned || staffRaw.full_name || "Nguyễn Văn A",
      receptionist: appointment.receptionist || raw.receptionist_id?.full_name || raw.receptionist_name || "Chưa cập nhật",
      startTime: appointment.startTime || appointment.hour || "09:00",
      expectedDone: appointment.expectedDone || "11:00",
      actualDone: appointment.actualDone || raw.completed_at || assignmentRaw.actual_end_time || "--:--"
    },
    materials,
    activityLogs,
    customerNote:
      appointment.customerNote ||
      "Xe bị rung đầu khi chạy trên 80km/h. Mong kiểm tra kỹ phần lốp và phuộc trước.",
    garageNote:
      appointment.garageNote ||
      "Phát hiện lốp trước mòn 70%, đề xuất thay thế. Đã tư vấn khách hàng qua điện thoại."
  };
};

const getInitials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const getStatusText = (status) => {
  const labels = {
    pending: "Chờ xác nhận",
    waiting_confirmation: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    processing: "Đang xử lý",
    done: "Hoàn tất",
    cancelled: "Đã hủy"
  };
  return labels[status] || labels.pending;
};

const getPriorityText = (priority) => {
  const labels = {
    low: "Ưu tiên thấp",
    medium: "Ưu tiên TB",
    high: "Ưu tiên cao"
  };
  return labels[priority] || labels.medium;
};

const getPaymentText = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (["paid", "completed", "đã thanh toán", "da_thanh_toan"].includes(normalized)) return "Đã thanh toán";
  if (["deposit", "deposited", "partial", "đã cọc", "da_coc"].includes(normalized)) return "Đã cọc";
  return "Chưa thanh toán";
};

const formatCurrency = (value) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;

const getFieldValue = (value, fallback = "Chưa cập nhật") => {
  if (value === 0) return value;
  return value ? value : fallback;
};

const formatDisplayDateTime = (value) => {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
};

const toDateInputValue = (dateValue) => {
  if (!dateValue) return "";
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

  return normalized;
};

const getShortAppointmentId = (appointmentId = "") => {
  const normalized = String(appointmentId || "").replace(/^#/, "");
  if (normalized.length <= 16) return String(appointmentId || "");
  return `#${normalized.slice(0, 8)}...${normalized.slice(-4)}`;
};

const getNumericValue = (value = "") => String(value || "").replace(/[^\d]/g, "");

const isPlaceholderText = (value = "") => /^chưa\s+/i.test(String(value || "").trim());

const hasAppointmentAssignment = (appointment = {}, detail = {}) => {
  const raw = appointment.raw || {};
  const hasRawStaff = Boolean(raw.staff_id || appointment.rawStaffId || appointment.staff_id);
  const hasRawBay = Boolean(raw.repair_bay_id || appointment.rawRepairBayId || appointment.repair_bay_id);
  if (hasRawStaff && hasRawBay) return true;

  return Boolean(
    detail.assignment?.technician &&
    detail.assignment?.bay &&
    !isPlaceholderText(detail.assignment.technician) &&
    !isPlaceholderText(detail.assignment.bay)
  );
};

const getServiceDurationMinutes = (service = {}) => {
  const match = String(service.time || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const validateEditDraft = (draft = {}) => {
  const errors = {};

  if (!draft.appointmentDate) errors.appointmentDate = "Vui lòng chọn ngày hẹn.";
  if (!draft.appointmentHour) errors.appointmentHour = "Vui lòng nhập giờ hẹn.";
  if (draft.customerPhone && !/^[0-9+\-\s().]{8,15}$/.test(draft.customerPhone)) {
    errors.customerPhone = "Số điện thoại không hợp lệ.";
  }
  if (draft.customerEmail && !/^\S+@\S+\.\S+$/.test(draft.customerEmail)) {
    errors.customerEmail = "Email không hợp lệ.";
  }
  if (draft.vehicleYear && !/^\d{4}$/.test(String(draft.vehicleYear))) {
    errors.vehicleYear = "Năm sản xuất phải gồm 4 chữ số.";
  }
  if (draft.vehicleMileage && Number(getNumericValue(draft.vehicleMileage)) < 0) {
    errors.vehicleMileage = "Số km hiện tại phải lớn hơn hoặc bằng 0.";
  }
  if (draft.assignmentTechnician && !draft.assignmentStartTime) {
    errors.assignmentStartTime = "Cần có giờ bắt đầu khi đã chọn kỹ thuật viên.";
  }
  if (
    draft.assignmentStartTime &&
    draft.assignmentEndTime &&
    draft.assignmentEndTime !== "--:--" &&
    draft.assignmentEndTime < draft.assignmentStartTime
  ) {
    errors.assignmentEndTime = "Dự kiến xong không được nhỏ hơn giờ bắt đầu.";
  }

  return errors;
};

export default function AppointmentDetailPage({
  appointment,
  onBack,
  onConfirm,
  onStart,
  onComplete,
  onUpdateSchedule,
  onCancel,
  onAppointmentChange
}) {
  const [localAppointment, setLocalAppointment] = useState(appointment || {});
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const detail = buildAppointmentDetail(localAppointment);
  const isApproved = !pendingStatuses.includes(detail.status);
  const hasAssignment = hasAppointmentAssignment(localAppointment, detail);
  const totalPrice = detail.services.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
  const progress = detail.status === "done" ? 100 : detail.status === "processing" ? 75 : detail.status === "confirmed" ? 50 : 25;

  useEffect(() => {
    setLocalAppointment(appointment || {});
  }, [appointment]);

  useEffect(() => {
    if (!editDraft) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [editDraft]);

  const applyAppointmentUpdate = (updatedAppointment) => {
    setLocalAppointment(updatedAppointment);
    onAppointmentChange?.(updatedAppointment);
  };

  const runMappedOrFallbackAction = async (handler, fallback, currentAppointment, payload) => {
    const result = handler ? await handler(currentAppointment, payload) : undefined;
    return result === undefined ? fallback(currentAppointment, payload) : result;
  };

  const getUpdatedAppointmentFromResult = (result, fallbackAppointment) => {
    if (!result) return fallbackAppointment;
    if (result.data?.appointment) return result.data.appointment;
    if (result.data && !result.data.appointment) return result.data;
    if (result.appointment) return result.appointment;
    return result;
  };

  const runAppointmentAction = async (request, afterSuccess) => {
    if (isActionLoading) return;
    setIsActionLoading(true);
    setActionMessage(null);

    try {
      const result = await request(localAppointment);
      const updatedAppointment = getUpdatedAppointmentFromResult(result, localAppointment);
      applyAppointmentUpdate(updatedAppointment);
      afterSuccess?.(updatedAppointment);
      setActionMessage({ type: "success", text: result.message || "Thao tác đã hoàn tất." });
    } catch (error) {
      setActionMessage({ type: "error", text: error.message || "Không thể hoàn tất thao tác. Vui lòng thử lại." });
    } finally {
      setIsActionLoading(false);
    }
  };

  const openEditModal = () => {
    const appointmentCode = String(detail.id || "").replace(/^#/, "");
    const assignmentStartTime = detail.assignment.startTime || detail.appointmentHour;
    const services = detail.services || [];

    setEditDraft({
      appointmentCode,
      appointmentDate: toDateInputValue(localAppointment.apiDate || detail.appointmentDate),
      appointmentHour: detail.appointmentHour,
      channel: detail.channel,
      priority: detail.priority,
      status: detail.status,
      customerName: detail.customer.name,
      customerPhone: detail.customer.phone,
      customerEmail: detail.customer.email,
      customerAddress: detail.customer.address,
      customerTier: detail.customer.tier,
      vehicleName: detail.vehicle.name,
      vehiclePlate: detail.vehicle.plate,
      vehicleYear: detail.vehicle.year,
      vehicleMileage: detail.vehicle.odometer,
      services,
      totalDuration: services.reduce((sum, service) => sum + getServiceDurationMinutes(service), 0),
      totalPrice: services.reduce((sum, service) => sum + Number(service.price || 0), 0),
      assignmentBay: detail.assignment.bay,
      assignmentTechnician: detail.assignment.technician,
      assignmentStartTime,
      assignmentEndTime: detail.assignment.expectedDone,
      customerNote: detail.customerNote,
      garageNote: detail.garageNote
    });
    setEditErrors({});
    setActionMessage(null);
  };

  const closeEditModal = () => {
    if (!isActionLoading) {
      setEditDraft(null);
      setEditErrors({});
    }
  };

  const submitScheduleEdit = async (event) => {
    event.preventDefault();
    if (!editDraft || isActionLoading) return;
    const validationErrors = validateEditDraft(editDraft);
    setEditErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsActionLoading(true);
    setActionMessage(null);

    try {
      const result = await runMappedOrFallbackAction(onUpdateSchedule, mockUpdateAppointmentSchedule, localAppointment, editDraft);
      applyAppointmentUpdate(getUpdatedAppointmentFromResult(result, localAppointment));
      setEditDraft(null);
      setActionMessage({ type: "success", text: result.message || "Đã cập nhật lịch hẹn." });
    } catch (error) {
      setActionMessage({ type: "error", text: error.message || "Không thể cập nhật lịch hẹn. Vui lòng thử lại." });
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="appointment-detail-page appointment-record-page">
      <RecordHeader appointment={detail} onBack={onBack} />

      <div className="record-layout">
        <div className="record-main">
          <section className="record-panel">
            <div className="record-section-header">
              <div>
                <span>Thông tin đặt lịch</span>
                <h3>Lịch hẹn và tiếp nhận</h3>
              </div>
              <StatusBadge status={detail.status} />
            </div>
            <div className="record-field-grid">
              <DetailField label="Mã lịch" value={String(detail.id).startsWith("#") ? detail.id : `#${detail.id}`} />
              <DetailField label="Ngày tạo" value={detail.createdDate} />
              <DetailField label="Ngày hẹn" value={detail.appointmentDate} />
              <DetailField label="Giờ hẹn" value={detail.appointmentHour} />
              <DetailField label="Kênh đặt" value={detail.channel} />
              <DetailField label="Mức ưu tiên" value={getPriorityText(detail.priority)} tone="red" />
              <DetailField label="Người tạo" value={detail.createdBy} />
              <DetailField label="Cập nhật cuối" value={formatDisplayDateTime(detail.lastUpdated)} />
            </div>
          </section>

          <section className="record-panel">
            <div className="record-section-header">
              <div>
                <span>Hồ sơ liên quan</span>
                <h3>Khách hàng và xe</h3>
              </div>
            </div>
            <div className="record-entity-grid">
              <RecordEntity
                icon={User}
                title={detail.customer.name}
                subtitle={detail.customer.tier}
                rows={[
                  ["Số điện thoại", detail.customer.phone],
                  ["Email", detail.customer.email],
                  ["Ghi chú khách", detail.customerNote]
                ]}
              />
              <RecordEntity
                icon={Bike}
                title={detail.vehicle.name}
                subtitle={detail.vehicle.plate}
                rows={[
                  ["Dòng xe", detail.vehicle.type],
                  ["Năm SX", detail.vehicle.year],
                  ["Số km", detail.vehicle.odometer],
                  ["Lịch sử gần nhất", detail.vehicle.lastHistory],
                  ["Ghi chú bảo dưỡng", detail.vehicle.maintenanceNote]
                ]}
              />
            </div>
          </section>

          <ServicesRecord services={detail.services} totalPrice={totalPrice} paymentStatus={detail.paymentStatus} />

          <div className="record-split">
            <AssignmentRecord assignment={detail.assignment} hasAssignment={hasAssignment} status={detail.status} />
            <MaterialsRecord materials={detail.materials} />
          </div>

          <div className="record-split record-split-compact">
            <ProcessRecord status={detail.status} appointment={detail} hasAssignment={hasAssignment} />
            <ActivityRecord logs={detail.activityLogs} status={detail.status} appointment={detail} hasAssignment={hasAssignment} />
          </div>

          <section className="record-panel record-notes-panel">
            <div className="record-section-header">
              <div>
                <span>Ghi chú nội bộ</span>
                <h3>Ghi chú garage</h3>
              </div>
            </div>
            <p>{detail.garageNote}</p>
          </section>
        </div>

        <aside className="record-aside">
          <RecordSummary appointment={detail} totalPrice={totalPrice} progress={progress} isApproved={isApproved} />
          <FooterActions
            status={detail.status}
            hasAssignment={hasAssignment}
            isLoading={isActionLoading}
            onConfirm={() => runAppointmentAction((current) => runMappedOrFallbackAction(onConfirm, mockConfirmAppointment, current))}
            onStart={() => runAppointmentAction((current) => runMappedOrFallbackAction(onStart, mockStartAppointmentProcessing, current))}
            onComplete={() => runAppointmentAction((current) => runMappedOrFallbackAction(onComplete, mockCompleteAppointment, current))}
            onEdit={openEditModal}
            onAssign={() => {
              setActionMessage(null);
              setShowAssignmentDialog(true);
            }}
            onPrint={() => runAppointmentAction(mockPrintServiceTicket)}
            onSendSms={() => runAppointmentAction(mockSendAppointmentSms)}
            onSendEmail={() => runAppointmentAction(mockSendAppointmentEmail)}
            onCancel={() => runAppointmentAction((current) => runMappedOrFallbackAction(onCancel, mockCancelAppointmentDetail, current))}
          />
          {actionMessage && (
            <p className={`appointment-action-message ${actionMessage.type || "success"}`}>
              {actionMessage.text}
            </p>
          )}
        </aside>
      </div>
      {editDraft && (
        <EditScheduleModal
          draft={editDraft}
          errors={editErrors}
          isLoading={isActionLoading}
          onChange={setEditDraft}
          onClose={closeEditModal}
          onSubmit={submitScheduleEdit}
        />
      )}
      {showAssignmentDialog && (
        <AppointmentAssignmentDialog
          appointment={localAppointment}
          onClose={() => setShowAssignmentDialog(false)}
          onSuccess={(updatedAppointment) => {
            applyAppointmentUpdate(updatedAppointment);
            setShowAssignmentDialog(false);
            setActionMessage({ type: "success", text: "Đã phân công lịch hẹn thành công." });
          }}
          onError={(message) => {
            setActionMessage({ type: "error", text: message || "Không thể phân công lịch hẹn." });
          }}
        />
      )}
    </div>
  );
}

function DetailTopBar() {
  return (
    <div className="appointment-detail-topbar">
      <span className="detail-topbar-label">Điều phối garage</span>
      <label className="detail-search">
        <Search size={18} />
        <input placeholder="Tìm mã lịch, khách hàng, biển số..." />
      </label>
      <button className="detail-notification-btn" aria-label="Thông báo">
        <Bell size={20} />
      </button>
    </div>
  );
}

function RecordHeader({ appointment, onBack }) {
  const displayId = String(appointment.id).startsWith("#") ? appointment.id : `#${appointment.id}`;

  return (
    <header className="record-header">
      <div className="record-header-main">
        <button className="record-back" type="button" onClick={onBack}>
          <ArrowLeft size={17} /> Danh sách lịch hẹn
        </button>
        <div>
          <div className="record-code-row">
            <h1>{displayId}</h1>
            <StatusBadge status={appointment.status} />
            <PriorityBadge priority={appointment.priority} />
          </div>
          <p>
            {appointment.customer.name} · {appointment.vehicle.name} · {appointment.appointmentDate} lúc {appointment.appointmentHour}
          </p>
        </div>
      </div>
      <div className="record-header-tools">
        <label className="record-search">
          <Search size={17} />
          <input placeholder="Tìm mã lịch, khách hàng, biển số" />
        </label>
        <button className="record-icon-button" type="button" aria-label="Thông báo">
          <Bell size={18} />
        </button>
        <span className="record-updated"><Clock size={15} /> {formatDisplayDateTime(appointment.lastUpdated)}</span>
      </div>
    </header>
  );
}

function DetailField({ label, value, tone }) {
  return (
    <div className="record-field">
      <span>{label}</span>
      <strong className={tone === "red" ? "is-red" : ""}>{getFieldValue(value)}</strong>
    </div>
  );
}

function RecordEntity({ icon: Icon, title, subtitle, rows }) {
  return (
    <div className="record-entity">
      <div className="record-entity-title">
        <span>{Icon && <Icon size={18} />}</span>
        <div>
          <h4>{title}</h4>
          <p>{subtitle}</p>
        </div>
      </div>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{getFieldValue(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ServicesRecord({ services, totalPrice, paymentStatus }) {
  return (
    <section className="record-panel">
      <div className="record-section-header">
        <div>
          <span>Dịch vụ</span>
          <h3>Dịch vụ đã đặt</h3>
        </div>
        <em className="record-payment-status"><CreditCard size={14} /> {getPaymentText(paymentStatus)}</em>
      </div>
      <div className="record-table">
        <div className="record-table-head">
          <span>Dịch vụ</span>
          <span>Thời gian</span>
          <span>SL</span>
          <span>Đơn giá</span>
          <span>Thành tiền</span>
        </div>
        {services.map((service) => {
          const quantity = Number(service.quantity || 1);
          const price = Number(service.price || 0);
          return (
            <div className="record-table-row" key={service.name}>
              <strong>{service.name}</strong>
              <span>{service.time}</span>
              <span>{quantity}</span>
              <span>{formatCurrency(price)}</span>
              <b>{formatCurrency(price * quantity)}</b>
            </div>
          );
        })}
        <div className="record-table-total">
          <span>Tổng chi phí dự kiến</span>
          <strong>{formatCurrency(totalPrice)}</strong>
        </div>
      </div>
    </section>
  );
}

function AssignmentRecord({ assignment, hasAssignment, status }) {
  const isPending = pendingStatuses.includes(status);
  const displayAssignment = hasAssignment
    ? assignment
    : {
        ...assignment,
        bay: "Chưa phân kệ",
        technician: "Chưa phân công",
        receptionist: "Chưa cập nhật",
        expectedDone: "--:--",
        actualDone: "--:--"
      };

  return (
    <section className="record-panel">
      <div className="record-section-header">
        <div>
          <span>Vận hành</span>
          <h3>{isPending ? "Phân công sau xác nhận" : "Phân công xử lý"}</h3>
        </div>
      </div>
      {isPending && !hasAssignment ? (
        <div className="record-empty record-flow-empty">
          Xác nhận lịch hẹn trước. Sau khi hệ thống gửi thông báo vào tài khoản khách hàng và email xác nhận, Admin/Manager mới phân công kỹ thuật viên và kệ sửa.
        </div>
      ) : (
      <div className="record-list">
        <DetailField label="Kệ sửa / khu vực" value={`${displayAssignment.bay} · ${displayAssignment.area}`} />
        <DetailField label="Kỹ thuật viên" value={displayAssignment.technician} />
        <DetailField label="Nhân viên tiếp nhận" value={displayAssignment.receptionist} />
        <DetailField label="Bắt đầu" value={displayAssignment.startTime} />
        <DetailField label="Dự kiến hoàn thành" value={displayAssignment.expectedDone} />
        <DetailField label="Thực tế hoàn tất" value={formatDisplayDateTime(displayAssignment.actualDone)} />
      </div>
      )}
    </section>
  );
}

function MaterialsRecord({ materials = [] }) {
  const normalizedMaterials = materials.map((material, index) => ({
    id: material._id || material.id || `${material.name || material.material_name}-${index}`,
    name: material.name || material.material_name || material.item_name || "Vật tư chưa cập nhật",
    quantity: material.quantity || material.qty || 0,
    unit: material.unit || material.uom || "cái",
    cost: Number(material.cost || material.price || material.total_cost || 0)
  }));

  return (
    <section className="record-panel">
      <div className="record-section-header">
        <div>
          <span>Kho</span>
          <h3>Vật tư sử dụng</h3>
        </div>
      </div>
      {normalizedMaterials.length === 0 ? (
        <div className="record-empty">Chưa ghi nhận vật tư sử dụng</div>
      ) : (
        <div className="record-material-list">
          {normalizedMaterials.map((material) => (
            <div key={material.id}>
              <strong>{material.name}</strong>
              <span>{material.quantity} {material.unit}</span>
              <b>{formatCurrency(material.cost)}</b>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ProcessRecord({ status, appointment, hasAssignment }) {
  const isTerminal = status === "done" || status === "cancelled";
  const currentIndex = isTerminal
    ? 4
    : status === "processing"
      ? 3
      : status === "confirmed" && hasAssignment
        ? 2
        : status === "confirmed"
          ? 1
          : 0;
  const steps = [
    {
      key: "pending",
      label: "Chờ xác nhận",
      time: appointment.appointmentHour || "--:--",
      note: "Admin/Manager kiểm tra yêu cầu đặt lịch"
    },
    {
      key: "confirmed",
      label: "Đã xác nhận",
      time: pendingStatuses.includes(status) ? "--:--" : formatDisplayDateTime(appointment.lastUpdated),
      note: "Gửi email xác nhận lịch hẹn cho khách hàng"
    },
    {
      key: "assigned",
      label: "Đã phân công",
      time: hasAssignment ? appointment.assignment.startTime : "--:--",
      note: "Kỹ thuật viên nhận đơn và chuẩn bị tiếp nhận xe"
    },
    {
      key: "inspection",
      label: "Kiểm tra xe",
      time: ["processing", "done"].includes(status) ? appointment.assignment.startTime : "--:--",
      note: "Nhân viên kiểm tra tình trạng, báo hạng mục và vật tư cần thay"
    },
    {
      key: "done",
      label: "Hoàn tất",
      time: status === "done" ? formatDisplayDateTime(appointment.assignment.actualDone) : "--:--",
      note: "Bàn giao xe và hoàn tất thanh toán"
    }
  ];

  return (
    <section className="record-panel">
      <div className="record-section-header">
        <div>
          <span>Tiến độ</span>
          <h3>Tiến trình xử lý</h3>
        </div>
      </div>
      <div className="record-process">
        {steps.map((step, index) => {
          const isDone = index < currentIndex || status === "done";
          const isCurrent = index === currentIndex && status !== "done";
          return (
            <div className={`${isDone ? "done" : ""} ${isCurrent ? "current" : ""}`} key={step.key}>
              <i />
              <div>
                <strong>{step.label}</strong>
                <small>{step.note}</small>
              </div>
              <span>{step.time}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ActivityRecord({ logs = [], status, appointment, hasAssignment }) {
  const fallbackLogs = [
    {
      time: appointment.appointmentHour || "--:--",
      text: "Khách hàng tạo yêu cầu đặt lịch",
      who: appointment.createdBy || "Hệ thống"
    },
    ...(!pendingStatuses.includes(status)
      ? [
          {
            time: formatDisplayDateTime(appointment.lastUpdated),
            text: "Admin/Manager xác nhận lịch hẹn, gửi thông báo tài khoản và email cho khách hàng",
            who: appointment.assignment.receptionist || "Hệ thống"
          }
        ]
      : []),
    ...(hasAssignment
      ? [
          {
            time: appointment.assignment.startTime || "--:--",
            text: `Phân công ${appointment.assignment.technician} tại ${appointment.assignment.bay}`,
            who: "Điều phối"
          }
        ]
      : []),
    ...(["processing", "done"].includes(status)
      ? [
          {
            time: appointment.assignment.startTime || "--:--",
            text: "Nhân viên nhận đơn, kiểm tra tình trạng xe và chuẩn bị báo khách",
            who: appointment.assignment.technician || "Kỹ thuật viên"
          }
        ]
      : []),
    ...(status === "done"
      ? [
          {
            time: formatDisplayDateTime(appointment.assignment.actualDone),
            text: "Hoàn tất xử lý lịch hẹn",
            who: appointment.assignment.technician || "Kỹ thuật viên"
          }
        ]
      : [])
  ];
  const displayLogs = logs.length
    ? logs.map((log) => ({
        time: log.time || formatDisplayDateTime(log.created_at || log.createdAt),
        text: log.text || log.content || log.message || log.action || "Cập nhật lịch hẹn",
        who: log.who || log.actor || log.actor_name || log.created_by?.full_name || "Hệ thống"
      }))
    : fallbackLogs;

  return (
    <section className="record-panel">
      <div className="record-section-header">
        <div>
          <span>Audit</span>
          <h3>Lịch sử cập nhật</h3>
        </div>
      </div>
      <ol className="record-activity">
        {displayLogs.map((log) => (
          <li key={`${log.time}-${log.text}`}>
            <time>{log.time}</time>
            <p>{log.text}</p>
            <span>{log.who}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function RecordSummary({ appointment, totalPrice, progress, isApproved }) {
  return (
    <section className="record-side-panel">
      <span className="record-side-eyebrow">Tóm tắt</span>
      <h3>{appointment.customer.name}</h3>
      <p>{appointment.vehicle.name} · {appointment.vehicle.plate}</p>
      <div className="record-side-status">
        <StatusBadge status={appointment.status} />
        <strong>{formatCurrency(totalPrice)}</strong>
      </div>
      <dl>
        <div><dt>Dịch vụ</dt><dd>{appointment.services.length}</dd></div>
        <div><dt>Thanh toán</dt><dd>{getPaymentText(appointment.paymentStatus)}</dd></div>
        <div><dt>KTV</dt><dd>{appointment.assignment.technician}</dd></div>
        {isApproved && <div><dt>Dự kiến xong</dt><dd>{appointment.assignment.expectedDone}</dd></div>}
      </dl>
      {isApproved && (
        <div className="record-side-progress">
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
    </section>
  );
}

function PageHeader({ appointment, onBack }) {
  const displayId = String(appointment.id).startsWith("#") ? appointment.id : `#${appointment.id}`;
  const shortDisplayId = getShortAppointmentId(displayId);

  return (
    <div className="appointment-detail-header">
      <button className="appointment-back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Quay lại danh sách
      </button>
      <div className="appointment-header-divider" />
      <div className="appointment-title-group">
        <h2 title={displayId}>{shortDisplayId}</h2>
        <StatusBadge status={appointment.status} />
        <PriorityBadge priority={appointment.priority} />
      </div>
      <div className="appointment-last-update">
        <Clock size={16} />
        Cập nhật lần cuối: {getFieldValue(appointment.lastUpdated)}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  return <span className={`appointment-status-badge ${status}`}>{getStatusText(status)}</span>;
}

function PriorityBadge({ priority }) {
  return (
    <span className={`appointment-priority-badge ${priority}`}>
      <Flame size={13} /> {getPriorityText(priority)}
    </span>
  );
}

function DetailCard({ title, icon: Icon, children, meta }) {
  return (
    <section className="appointment-detail-card">
      <header className="appointment-detail-card-header">
        <div>
          <span className="appointment-detail-card-icon">{Icon && <Icon size={18} />}</span>
          <h3>{title}</h3>
        </div>
        {meta && <span className="appointment-card-meta">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

function InfoRow({ icon: Icon, label, value, accent }) {
  return (
    <div className="appointment-info-row">
      <span className="appointment-info-icon">{Icon && <Icon size={17} />}</span>
      <div className="appointment-info-content">
        <p>{label}</p>
        <strong className={accent ? "accent" : ""} title={typeof value === "string" ? value : undefined}>
          {value}
        </strong>
      </div>
    </div>
  );
}

function AppointmentInfo({ appointment }) {
  const displayId = String(appointment.id).startsWith("#") ? appointment.id : `#${appointment.id}`;

  return (
    <DetailCard title="Thông tin lịch hẹn" icon={Calendar}>
      <div className="appointment-info-grid">
        <InfoRow icon={Hash} label="Mã lịch" value={getShortAppointmentId(displayId)} />
        <InfoRow icon={CalendarDays} label="Ngày tạo" value={appointment.createdDate} />
        <InfoRow icon={Calendar} label="Ngày hẹn" value={appointment.appointmentDate} />
        <InfoRow icon={Clock} label="Giờ hẹn" value={appointment.appointmentHour} />
        <InfoRow icon={Globe} label="Kênh đặt lịch" value={appointment.channel} />
        <InfoRow icon={Flame} label="Mức ưu tiên" value={getPriorityText(appointment.priority).replace("Ưu tiên ", "")} accent />
        <InfoRow icon={User} label="Người tạo lịch" value={appointment.createdBy} />
        <InfoRow icon={Clock} label="Cập nhật lần cuối" value={getFieldValue(appointment.lastUpdated)} />
      </div>
    </DetailCard>
  );
}

function CustomerCard({ appointment }) {
  return (
    <DetailCard title="Khách hàng" icon={User}>
      <div className="appointment-person-row">
        <Avatar initials={appointment.customer.initials} />
        <div>
          <h4>{appointment.customer.name}</h4>
          <span className="member-chip">★ {appointment.customer.tier}</span>
          <div className="contact-list">
          <span><Phone size={15} /> {appointment.customer.phone}</span>
          <span><Mail size={15} /> {appointment.customer.email}</span>
          <span><MapPin size={15} /> {appointment.customer.address}</span>
        </div>
      </div>
      </div>
    </DetailCard>
  );
}

function VehicleCard({ appointment }) {
  return (
    <DetailCard title="Thông tin xe" icon={Bike}>
      <div className="appointment-vehicle-row">
        <span className="vehicle-icon-box"><Bike size={30} /></span>
        <div>
          <h4>{appointment.vehicle.name}</h4>
          <p>{appointment.vehicle.type}</p>
          <div className="vehicle-meta-grid">
            <span><small>Biển số</small><strong>{appointment.vehicle.plate}</strong></span>
            <span><small>Năm SX</small><strong>{appointment.vehicle.year}</strong></span>
            <span><small><Gauge size={12} /> Số km hiện tại</small><strong>{appointment.vehicle.odometer}</strong></span>
            <span><small>Lịch sử gần nhất</small><strong>{appointment.vehicle.lastHistory}</strong></span>
          </div>
          <p className="vehicle-maintenance-note">{appointment.vehicle.maintenanceNote}</p>
        </div>
      </div>
    </DetailCard>
  );
}

function ServicesCard({ services, totalPrice }) {
  return (
    <DetailCard title="Dịch vụ đã đặt" icon={Wrench} meta={<><CreditCard size={14} /> {getPaymentText(services[0]?.paymentStatus)}</>}>
      <div className="service-list">
        {services.map((service) => (
          <div className="service-row" key={service.name}>
            <span className="service-icon"><Wrench size={18} /></span>
            <div>
              <h4>{service.name}</h4>
              <p><Clock size={13} /> {service.time} <span>Số lượng: {service.quantity || 1}</span></p>
            </div>
            <strong>{formatCurrency(Number(service.price || 0) * Number(service.quantity || 1))}</strong>
          </div>
        ))}
      </div>
      <div className="service-total">
        <div>
          <span>Tổng chi phí dự kiến</span>
          <small>{services.length} dịch vụ</small>
        </div>
        <strong>{formatCurrency(totalPrice)}</strong>
      </div>
    </DetailCard>
  );
}

function AssignmentCard({ assignment, hasAssignment }) {
  const displayAssignment = hasAssignment
    ? assignment
    : {
        ...assignment,
        bay: "Chưa phân kệ",
        technician: "Chưa phân công",
        expectedDone: "--:--"
      };

  return (
    <DetailCard title="Phân công xử lý" icon={Users}>
      <div className="assignment-grid">
        <InfoRow icon={Wrench} label="Kệ sửa" value={displayAssignment.bay} />
        <InfoRow icon={MapPin} label="Khu vực xử lý" value={displayAssignment.area} />
        <InfoRow icon={User} label="Kỹ thuật viên" value={displayAssignment.technician} />
        <InfoRow icon={Shield} label="Nhân viên tiếp nhận" value={displayAssignment.receptionist} />
        <InfoRow icon={Clock} label="Bắt đầu" value={displayAssignment.startTime} />
        <InfoRow icon={CheckCircle2} label="Dự kiến xong" value={displayAssignment.expectedDone} />
        <InfoRow icon={CheckCircle2} label="Thời gian thực tế" value={displayAssignment.actualDone} />
      </div>
    </DetailCard>
  );
}

function MaterialsCard({ materials = [] }) {
  const normalizedMaterials = materials.map((material, index) => ({
    id: material._id || material.id || `${material.name || material.material_name}-${index}`,
    name: material.name || material.material_name || material.item_name || "Vật tư chưa cập nhật",
    quantity: material.quantity || material.qty || 0,
    unit: material.unit || material.uom || "cái",
    cost: Number(material.cost || material.price || material.total_cost || 0)
  }));

  return (
    <DetailCard title="Vật tư sử dụng" icon={Package}>
      {normalizedMaterials.length === 0 ? (
        <EmptyState icon={Package} title="Chưa ghi nhận vật tư sử dụng" />
      ) : (
        <div className="material-list">
          {normalizedMaterials.map((material) => (
            <div className="material-row" key={material.id}>
              <div>
                <strong>{material.name}</strong>
                <span>{material.quantity} {material.unit}</span>
              </div>
              <b>{formatCurrency(material.cost)}</b>
            </div>
          ))}
        </div>
      )}
    </DetailCard>
  );
}

function EmptyState({ icon: Icon, title }) {
  return (
    <div className="appointment-empty-state">
      <span>{Icon && <Icon size={20} />}</span>
      <p>{title}</p>
    </div>
  );
}

function TimelineCard({ status, appointment }) {
  const steps = [
    { key: "pending", label: "Chờ xác nhận", time: appointment.appointmentHour || "--:--", by: "Hệ thống" },
    { key: "confirmed", label: "Đã xác nhận", time: status === "pending" ? "--:--" : "09:00", by: status === "pending" ? "Chưa cập nhật" : appointment.assignment.receptionist },
    { key: "processing", label: "Đang xử lý", time: ["processing", "done"].includes(status) ? appointment.assignment.startTime : "--:--", by: ["processing", "done"].includes(status) ? appointment.assignment.technician : "Chưa cập nhật" },
    { key: "done", label: "Hoàn tất", time: status === "done" ? appointment.assignment.actualDone : "--:--", by: status === "done" ? appointment.assignment.technician : "Chưa cập nhật" }
  ];
  const order = ["pending", "confirmed", "processing", "done"];
  const currentIndex = Math.max(0, order.indexOf(status));

  return (
    <DetailCard title="Tiến trình xử lý" icon={Clock}>
      <div className="timeline-steps">
        {steps.map((step, index) => {
          const isDone = index < currentIndex || status === "done";
          const isCurrent = index === currentIndex && status !== "done";
          return (
            <div className={`timeline-step ${isDone ? "done" : ""} ${isCurrent ? "current" : ""}`} key={step.key}>
              <span>{isDone ? <CheckCircle2 size={18} /> : isCurrent ? <Wrench size={18} /> : <Circle size={16} />}</span>
              <strong>{step.label}</strong>
              <small>{step.time}</small>
              <small>{step.by}</small>
            </div>
          );
        })}
      </div>
    </DetailCard>
  );
}

function NoteCard({ title, body, tone }) {
  return (
    <DetailCard title={title} icon={MessageSquare}>
      <div className={`note-box ${tone}`}>{body}</div>
    </DetailCard>
  );
}

function ActivityLog({ logs = [], status }) {
  const fallbackLogs = [
    { time: "09:00", text: "Xác nhận lịch hẹn", who: "Nhân viên A", color: "blue" },
    { time: "09:15", text: "Chuyển sang Kệ sửa 02", who: "Điều phối", color: "purple" },
    { time: "09:30", text: "Bắt đầu bảo dưỡng", who: "KTV Văn A", color: "orange" },
    ...(status === "done" ? [{ time: "10:45", text: "Hoàn tất lịch hẹn", who: "KTV Văn A", color: "green" }] : [])
  ];
  const displayLogs = logs.length
    ? logs.map((log, index) => ({
        time: log.time || log.created_at || log.createdAt || "--:--",
        text: log.text || log.content || log.message || log.action || "Cập nhật lịch hẹn",
        who: log.who || log.actor || log.actor_name || log.created_by?.full_name || "Hệ thống",
        color: ["blue", "purple", "orange", "green"][index % 4]
      }))
    : fallbackLogs;

  return (
    <DetailCard title="Lịch sử cập nhật" icon={Clock}>
      <ol className="activity-list">
        {displayLogs.map((log) => (
          <li key={`${log.time}-${log.text}`}>
            <span className={`activity-dot ${log.color}`} />
            <strong>{log.time}</strong>
            <span>- {log.text}</span>
            <small>· {log.who}</small>
          </li>
        ))}
      </ol>
    </DetailCard>
  );
}

function QuickInfoCard({ appointment, totalPrice, progress, isApproved }) {
  return (
    <section className="appointment-detail-card quick-info-card">
      <p className="side-title">Tóm tắt nhanh</p>
      <div className="quick-customer">
        <Avatar initials={appointment.customer.initials} />
        <div>
          <h4>{appointment.customer.name}</h4>
          <span className="member-chip">★ {appointment.customer.tier}</span>
        </div>
      </div>
      <div className="quick-block">
        <small>Xe</small>
        <strong>{appointment.vehicle.name}</strong>
        <span>{appointment.vehicle.plate}</span>
      </div>
      <dl className="quick-list">
        <Row label="Trạng thái" value={<StatusBadge status={appointment.status} />} />
        <Row label="Số dịch vụ" value={<strong>{appointment.services.length}</strong>} />
        <Row label="Tổng chi phí" value={<strong className="price">{formatCurrency(totalPrice)}</strong>} />
        {isApproved && <Row label="Dự kiến xong" value={<strong>{appointment.assignment.expectedDone}</strong>} />}
      </dl>
      {isApproved && (
        <div className="quick-progress">
          <small>Tiến độ</small>
          <div><span style={{ width: `${progress}%` }} /></div>
          <p>{progress === 100 ? "4/4" : progress === 75 ? "3/4" : "2/4"} bước hoàn thành</p>
        </div>
      )}
    </section>
  );
}

function FooterActions({
  status,
  hasAssignment,
  isLoading,
  onConfirm,
  onStart,
  onComplete,
  onEdit,
  onAssign,
  onPrint,
  onSendSms,
  onSendEmail,
  onCancel
}) {
  const isApproved = !pendingStatuses.includes(status);
  const isTerminal = status === "done" || status === "cancelled";
  const isPending = pendingStatuses.includes(status);
  const primaryAction =
    status === "processing"
      ? { label: "Hoàn tất xử lý", onClick: onComplete }
      : status === "confirmed"
        ? hasAssignment
          ? { label: "Bắt đầu kiểm tra xe", onClick: onStart }
          : { label: "Phân công nhân viên", onClick: onAssign }
        : status === "done"
          ? { label: "Lịch hẹn đã hoàn tất", onClick: undefined }
          : status === "cancelled"
            ? { label: "Lịch hẹn đã hủy", onClick: undefined }
            : { label: "Xác nhận lịch hẹn", onClick: onConfirm };
  const isPrimaryDisabled = !primaryAction.onClick || isLoading;
  const flowMessage = isPending
    ? "Bước hiện tại: xác nhận lịch hẹn. Sau khi xác nhận, hệ thống gửi thông báo vào tài khoản khách hàng và gửi email, rồi mới phân công nhân viên/kệ sửa."
    : status === "confirmed" && !hasAssignment
      ? "Bước tiếp theo: phân công kỹ thuật viên và kệ sửa. Nhân viên sẽ tiếp nhận việc, kiểm tra xe và báo lại tình trạng thực tế cho khách."
      : status === "confirmed" && hasAssignment
        ? "Lịch đã được phân công. Nhân viên tiếp nhận đơn, sau đó kiểm tra xe khi khách mang xe đến garage."
        : status === "processing"
          ? "Nhân viên đang xử lý/kiểm tra xe. Các hạng mục cần sửa và vật tư thay thế sẽ được báo lại khách trước khi thực hiện."
          : "";

  return (
    <section className="appointment-detail-card action-card">
      <p className="side-title muted">Hành động</p>
      <button className={`detail-primary-btn ${isTerminal ? "state-only" : ""}`} onClick={primaryAction.onClick} disabled={isPrimaryDisabled}>
        <CheckCircle2 size={17} /> {isLoading ? "Đang xử lý..." : primaryAction.label}
      </button>
      {flowMessage && <p className="detail-flow-note">{flowMessage}</p>}
      {!isTerminal && (
        <button className="detail-edit-btn" onClick={onEdit} disabled={isLoading}>
          <Edit3 size={17} /> Chỉnh sửa lịch
        </button>
      )}
      {isApproved && !isTerminal && hasAssignment && (
        <button className="detail-print-btn" onClick={onPrint} disabled={isLoading}>
          <Printer size={17} /> In phiếu dịch vụ
        </button>
      )}
      <div className="detail-secondary-grid">
        {isTerminal && <SecondaryButton icon={Printer} label="In phiếu" onClick={onPrint} disabled={isLoading} />}
        <SecondaryButton icon={MessageSquare} label="Gửi SMS" onClick={onSendSms} disabled={isLoading || isTerminal} />
        <SecondaryButton icon={Send} label="Gửi Email" onClick={onSendEmail} disabled={isLoading || isTerminal} />
        <SecondaryButton icon={XCircle} label="Hủy lịch" onClick={onCancel} disabled={isLoading || isTerminal} danger />
      </div>
    </section>
  );
}

function SecondaryButton({ icon: Icon, label, danger, disabled, onClick }) {
  return (
    <button className={`detail-secondary-btn ${danger ? "danger" : ""}`} onClick={onClick} disabled={disabled}>
      <Icon size={15} /> {label}
    </button>
  );
}

function EditScheduleModal({ draft, errors = {}, isLoading, onChange, onClose, onSubmit }) {
  const updateDraft = (field, value) => {
    onChange((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="appointment-edit-layer" role="presentation">
      <button className="appointment-edit-backdrop" type="button" aria-label="Đóng modal" onClick={onClose} disabled={isLoading} />
      <form className="appointment-edit-modal" onSubmit={onSubmit} role="dialog" aria-modal="true" aria-labelledby="appointment-edit-title">
        <div className="appointment-edit-header">
          <div>
            <p>Sửa lịch hẹn</p>
            <h3 id="appointment-edit-title">Cập nhật thông tin lịch</h3>
            <span>Cập nhật thông tin khách hàng, xe, dịch vụ và lịch hẹn</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" disabled={isLoading}>
            <XCircle size={20} />
          </button>
        </div>

        <div className="appointment-edit-body">
          <EditSection title="Thông tin lịch hẹn" description="Trạng thái và ưu tiên đang hiển thị theo dữ liệu hiện tại.">
            <div className="appointment-edit-grid">
              <EditField label="Mã lịch"><input value={draft.appointmentCode || ""} disabled readOnly /></EditField>
              <EditField label="Ngày hẹn" error={errors.appointmentDate}>
                <input type="date" value={draft.appointmentDate || ""} onChange={(event) => updateDraft("appointmentDate", event.target.value)} />
              </EditField>
              <EditField label="Giờ hẹn" error={errors.appointmentHour}>
                <input type="time" value={draft.appointmentHour || ""} onChange={(event) => updateDraft("appointmentHour", event.target.value)} />
              </EditField>
              <EditField label="Kênh đặt lịch">
                <input value={draft.channel || ""} onChange={(event) => updateDraft("channel", event.target.value)} placeholder="Website" />
              </EditField>
              <EditField label="Mức ưu tiên">
                <select value={String(draft.priority || "medium").toLowerCase()} disabled>
                  <option value="low">LOW</option>
                  <option value="medium">MEDIUM</option>
                  <option value="high">HIGH</option>
                </select>
              </EditField>
              <EditField label="Trạng thái lịch hẹn">
                <select value={draft.status || "pending"} disabled>
                  <option value="pending">PENDING</option>
                  <option value="waiting_confirmation">WAITING_CONFIRMATION</option>
                  <option value="confirmed">CONFIRMED</option>
                  <option value="processing">IN_PROGRESS</option>
                  <option value="done">COMPLETED</option>
                  <option value="cancelled">CANCELLED</option>
                </select>
              </EditField>
            </div>
          </EditSection>

          <EditSection title="Thông tin khách hàng" description="Thông tin khách hàng được quản lý ở module Khách hàng.">
            <div className="appointment-edit-grid">
              <EditField label="Tên khách hàng"><input value={draft.customerName || ""} disabled readOnly /></EditField>
              <EditField label="Số điện thoại" error={errors.customerPhone}><input value={draft.customerPhone || ""} disabled readOnly /></EditField>
              <EditField label="Email" error={errors.customerEmail}><input value={draft.customerEmail || ""} disabled readOnly /></EditField>
              <EditField label="Địa chỉ"><input value={draft.customerAddress || ""} disabled readOnly /></EditField>
              <EditField label="Hạng thành viên"><input value={draft.customerTier || ""} disabled readOnly /></EditField>
            </div>
          </EditSection>

          <EditSection title="Thông tin xe" description="Backend hiện hỗ trợ cập nhật thông tin xe cơ bản qua appointment.">
            <div className="appointment-edit-grid">
              <EditField label="Tên xe / dòng xe">
                <input value={draft.vehicleName || ""} onChange={(event) => updateDraft("vehicleName", event.target.value)} />
              </EditField>
              <EditField label="Biển số">
                <input value={draft.vehiclePlate || ""} onChange={(event) => updateDraft("vehiclePlate", event.target.value)} />
              </EditField>
              <EditField label="Năm sản xuất" error={errors.vehicleYear}>
                <input inputMode="numeric" value={draft.vehicleYear || ""} onChange={(event) => updateDraft("vehicleYear", event.target.value)} />
              </EditField>
              <EditField label="Số km hiện tại" error={errors.vehicleMileage}>
                <input inputMode="numeric" value={draft.vehicleMileage || ""} onChange={(event) => updateDraft("vehicleMileage", event.target.value)} />
              </EditField>
            </div>
          </EditSection>

          <EditSection title="Dịch vụ đã đặt" description="Danh sách dịch vụ hiện chỉ hiển thị readonly trong modal này.">
            <div className="appointment-edit-services">
              {(draft.services || []).map((service) => (
                <div className="appointment-edit-service-row" key={`${service.name}-${service.time}`}>
                  <div><strong>{service.name}</strong><span>{service.time}</span></div>
                  <b>{Number(service.price || 0).toLocaleString("vi-VN")}đ</b>
                </div>
              ))}
              <div className="appointment-edit-total-row"><span>Tổng thời gian</span><strong>{draft.totalDuration || 0} phút</strong></div>
              <div className="appointment-edit-total-row"><span>Tổng chi phí</span><strong>{Number(draft.totalPrice || 0).toLocaleString("vi-VN")}đ</strong></div>
            </div>
          </EditSection>

          <EditSection title="Phân công xử lý" description="Đổi kỹ thuật viên/kệ sửa dùng nút Phân công xử lý để có kiểm tra availability.">
            <div className="appointment-edit-grid">
              <EditField label="Kệ sửa"><input value={draft.assignmentBay || "Chưa phân kệ"} disabled readOnly /></EditField>
              <EditField label="Kỹ thuật viên"><input value={draft.assignmentTechnician || "Chưa phân công"} disabled readOnly /></EditField>
              <EditField label="Bắt đầu" error={errors.assignmentStartTime}><input value={draft.assignmentStartTime || ""} disabled readOnly /></EditField>
              <EditField label="Dự kiến xong" error={errors.assignmentEndTime}><input value={draft.assignmentEndTime || "--:--"} disabled readOnly /></EditField>
            </div>
          </EditSection>

          <EditSection title="Ghi chú">
            <div className="appointment-edit-grid">
              <EditField label="Ghi chú khách hàng" wide><textarea value={draft.customerNote || ""} rows={3} disabled readOnly /></EditField>
              <EditField label="Ghi chú nội bộ garage" wide>
                <textarea value={draft.garageNote || ""} onChange={(event) => updateDraft("garageNote", event.target.value)} rows={4} />
              </EditField>
            </div>
          </EditSection>
        </div>

        <div className="appointment-edit-actions">
          <button type="button" className="detail-secondary-btn" onClick={onClose} disabled={isLoading}>Hủy</button>
          <button type="submit" className="detail-primary-btn" disabled={isLoading}>{isLoading ? "Đang lưu..." : "Lưu thay đổi"}</button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="appointment-edit-backdrop" role="presentation">
      <form className="appointment-edit-modal" onSubmit={onSubmit}>
        <div className="appointment-edit-header">
          <div>
            <p>Sửa lịch hẹn</p>
            <h3>Cập nhật thông tin lịch</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" disabled={isLoading}>
            <XCircle size={20} />
          </button>
        </div>

        <div className="appointment-edit-grid">
          <label>
            <span>Ngày hẹn</span>
            <input
              type="date"
              value={draft.appointmentDate}
              onChange={(event) => updateDraft("appointmentDate", event.target.value)}
            />
          </label>
          <label>
            <span>Giờ hẹn</span>
            <input
              value={draft.appointmentHour}
              onChange={(event) => updateDraft("appointmentHour", event.target.value)}
              placeholder="09:00"
            />
          </label>
          <label>
            <span>Kênh đặt lịch</span>
            <input
              value={draft.channel}
              onChange={(event) => updateDraft("channel", event.target.value)}
              placeholder="Website"
            />
          </label>
          <label className="wide">
            <span>Ghi chú khách hàng</span>
            <textarea
              value={draft.customerNote}
              onChange={(event) => updateDraft("customerNote", event.target.value)}
              rows={4}
            />
          </label>
        </div>

        <div className="appointment-edit-actions">
          <button type="button" className="detail-secondary-btn" onClick={onClose} disabled={isLoading}>
            Hủy
          </button>
          <button type="submit" className="detail-primary-btn" disabled={isLoading}>
            {isLoading ? "Đang lưu..." : "Sửa lịch"}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditSection({ title, description, children }) {
  return (
    <section className="appointment-edit-section">
      <div className="appointment-edit-section-heading">
        <h4>{title}</h4>
        {description && <p>{description}</p>}
      </div>
      {children}
    </section>
  );
}

function EditField({ label, error, wide, children }) {
  return (
    <label className={`appointment-edit-field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      {children}
      {error && <small className="appointment-edit-error">{error}</small>}
    </label>
  );
}

function Avatar({ initials }) {
  return <span className="detail-avatar">{initials}</span>;
}

function Row({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

