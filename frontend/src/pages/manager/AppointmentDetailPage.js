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
  Edit3,
  Flame,
  Gauge,
  Globe,
  Hash,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Printer,
  Search,
  Send,
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
  const vehicleParts = String(appointment.vehicle || "").split(" - ");
  const vehicleName = vehicleParts[0] || "Honda CBR1000RR-R";
  const vehiclePlate = appointment.plate || vehicleParts[vehicleParts.length - 1] || "29A1-12345";

  return {
    id: appointment.id || "MC-99281",
    status,
    priority: appointment.priority || "high",
    createdDate: appointment.createdDate || "20/10/2026",
    appointmentDate: appointment.time || "24/10/2026",
    appointmentHour: appointment.hour || "09:00",
    channel: appointment.channel || "Website",
    customer: {
      initials: appointment.customerInitials || getInitials(appointment.customer || "Khách hàng"),
      name: appointment.customer || "Nguyễn Minh Quân",
      tier: appointment.customerTier || "Gold Member",
      phone: appointment.phone || "0901 234 567",
      email: appointment.email || "quan@gmail.com",
      address: appointment.address || "123 Lê Lợi, Hà Nội"
    },
    vehicle: {
      name: vehicleName,
      type: appointment.vehicleType || "Fireblade SP · Sport",
      plate: vehiclePlate,
      year: appointment.year || "2024",
      odometer: appointment.odometer || "10.000 km"
    },
    services: appointment.services || [
      { name: appointment.service || "Bảo dưỡng định kỳ 10.000km", time: "60 phút", price: 450000 },
      { name: "Thay nhớt Motul 7100 10W40", time: "20 phút", price: 180000 }
    ],
    assignment: {
      bay: appointment.bay || "Kệ sửa 02",
      technician: appointment.techAssigned || "Nguyễn Văn A",
      startTime: appointment.startTime || appointment.hour || "09:00",
      expectedDone: appointment.expectedDone || "11:00"
    },
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
  const [actionMessage, setActionMessage] = useState("");
  const [editDraft, setEditDraft] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const detail = buildAppointmentDetail(localAppointment);
  const isApproved = !pendingStatuses.includes(detail.status);
  const hasAssignment = hasAppointmentAssignment(localAppointment, detail);
  const totalPrice = detail.services.reduce((sum, item) => sum + item.price, 0);
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
    setActionMessage("");

    try {
      const result = await request(localAppointment);
      const updatedAppointment = getUpdatedAppointmentFromResult(result, localAppointment);
      applyAppointmentUpdate(updatedAppointment);
      afterSuccess?.(updatedAppointment);
      setActionMessage(result.message || "Thao tác đã hoàn tất.");
    } catch (error) {
      setActionMessage(error.message || "Không thể hoàn tất thao tác. Vui lòng thử lại.");
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
    setActionMessage("");
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
    setActionMessage("");

    try {
      const result = await runMappedOrFallbackAction(onUpdateSchedule, mockUpdateAppointmentSchedule, localAppointment, editDraft);
      applyAppointmentUpdate(getUpdatedAppointmentFromResult(result, localAppointment));
      setEditDraft(null);
      setActionMessage(result.message || "Đã cập nhật lịch hẹn.");
    } catch (error) {
      setActionMessage(error.message || "Không thể cập nhật lịch hẹn. Vui lòng thử lại.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="appointment-detail-page">
      <DetailTopBar />
      <PageHeader appointment={detail} onBack={onBack} />

      <div className="appointment-detail-grid">
        <div className="appointment-detail-main">
          <AppointmentInfo appointment={detail} />
          <div className="appointment-two-column">
            <CustomerCard appointment={detail} />
            <VehicleCard appointment={detail} />
          </div>
          <ServicesCard services={detail.services} totalPrice={totalPrice} />
          <AssignmentCard assignment={detail.assignment} hasAssignment={hasAssignment} />

          {isApproved && (
            <>
              <TimelineCard status={detail.status} />
            </>
          )}

          <div className={`appointment-note-grid ${isApproved ? "" : "single"}`}>
            <NoteCard title="Ghi chú khách hàng" body={detail.customerNote} tone="orange" />
            {isApproved && <NoteCard title="Ghi chú garage" body={detail.garageNote} tone="red" />}
          </div>

          {isApproved && <ActivityLog />}
        </div>

        <aside className="appointment-detail-side">
          <QuickInfoCard appointment={detail} totalPrice={totalPrice} progress={progress} isApproved={isApproved} />
          <FooterActions
            status={detail.status}
            hasAssignment={hasAssignment}
            isLoading={isActionLoading}
            onConfirm={() => runAppointmentAction((current) => runMappedOrFallbackAction(onConfirm, mockConfirmAppointment, current))}
            onStart={() => runAppointmentAction((current) => runMappedOrFallbackAction(onStart, mockStartAppointmentProcessing, current))}
            onComplete={() => runAppointmentAction((current) => runMappedOrFallbackAction(onComplete, mockCompleteAppointment, current))}
            onEdit={openEditModal}
            onAssign={() => {
              setActionMessage("");
              setShowAssignmentDialog(true);
            }}
            onPrint={() => runAppointmentAction(mockPrintServiceTicket)}
            onSendSms={() => runAppointmentAction(mockSendAppointmentSms)}
            onSendEmail={() => runAppointmentAction(mockSendAppointmentEmail)}
            onCancel={() => runAppointmentAction((current) => runMappedOrFallbackAction(onCancel, mockCancelAppointmentDetail, current))}
          />
          {actionMessage && <p className="appointment-action-message">{actionMessage}</p>}
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
            setActionMessage("Đã phân công lịch hẹn thành công.");
          }}
          onError={(message) => {
            setActionMessage(message || "Không thể phân công lịch hẹn.");
          }}
        />
      )}
    </div>
  );
}

function DetailTopBar() {
  return (
    <div className="appointment-detail-topbar">
      <div>
        <p>Điều phối garage</p>
        <h1>Chi tiết lịch hẹn</h1>
      </div>
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
        Cập nhật lần cuối: 10:45 hôm nay
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

function DetailCard({ title, icon: Icon, children }) {
  return (
    <section className="appointment-detail-card">
      <header className="appointment-detail-card-header">
        <span className="appointment-detail-card-icon">{Icon && <Icon size={18} />}</span>
        <h3>{title}</h3>
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
          </div>
        </div>
      </div>
    </DetailCard>
  );
}

function ServicesCard({ services, totalPrice }) {
  return (
    <DetailCard title="Dịch vụ đã đặt" icon={Wrench}>
      <div className="service-list">
        {services.map((service) => (
          <div className="service-row" key={service.name}>
            <span className="service-icon"><Wrench size={18} /></span>
            <div>
              <h4>{service.name}</h4>
              <p><Clock size={13} /> {service.time}</p>
            </div>
            <strong>{service.price.toLocaleString("vi-VN")}đ</strong>
          </div>
        ))}
      </div>
      <div className="service-total">
        <div>
          <span>Tổng chi phí dự kiến</span>
          <small>{services.length} dịch vụ</small>
        </div>
        <strong>{totalPrice.toLocaleString("vi-VN")}đ</strong>
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
        <InfoRow icon={User} label="Kỹ thuật viên" value={displayAssignment.technician} />
        <InfoRow icon={Clock} label="Bắt đầu" value={displayAssignment.startTime} />
        <InfoRow icon={CheckCircle2} label="Dự kiến xong" value={displayAssignment.expectedDone} />
      </div>
    </DetailCard>
  );
}

function TimelineCard({ status }) {
  const steps = [
    { key: "pending", label: "Chờ xác nhận", time: "08:45", by: "Hệ thống" },
    { key: "confirmed", label: "Đã xác nhận", time: "09:00", by: "NV A" },
    { key: "processing", label: "Đang xử lý", time: "09:30", by: "KTV Văn A" },
    { key: "done", label: "Hoàn tất", time: status === "done" ? "11:00" : "-", by: status === "done" ? "KTV Văn A" : "-" }
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

function ActivityLog() {
  const logs = [
    { time: "09:00", text: "Xác nhận lịch hẹn", who: "Nhân viên A", color: "blue" },
    { time: "09:15", text: "Chuyển sang Kệ sửa 02", who: "Điều phối", color: "purple" },
    { time: "09:30", text: "Bắt đầu bảo dưỡng", who: "KTV Văn A", color: "orange" },
    { time: "10:45", text: "Hoàn thành thay nhớt", who: "KTV Văn A", color: "green" }
  ];

  return (
    <DetailCard title="Lịch sử cập nhật" icon={Clock}>
      <ol className="activity-list">
        {logs.map((log) => (
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
        <Row label="Tổng chi phí" value={<strong className="price">{totalPrice.toLocaleString("vi-VN")}đ</strong>} />
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
  const primaryAction =
    status === "processing"
      ? { label: "Hoàn tất lịch hẹn", onClick: onComplete }
      : status === "confirmed"
        ? hasAssignment
          ? { label: "Bắt đầu xử lý", onClick: onStart }
          : { label: "Phân công xử lý", onClick: onAssign }
        : status === "done"
          ? { label: "Lịch hẹn đã hoàn tất", onClick: undefined }
          : status === "cancelled"
            ? { label: "Lịch hẹn đã hủy", onClick: undefined }
            : { label: "Xác nhận lịch hẹn", onClick: onConfirm };
  const isPrimaryDisabled = !primaryAction.onClick || isLoading;

  return (
    <section className="appointment-detail-card action-card">
      <p className="side-title muted">Hành động</p>
      <button className="detail-primary-btn" onClick={primaryAction.onClick} disabled={isPrimaryDisabled}>
        <CheckCircle2 size={17} /> {isLoading ? "Đang xử lý..." : primaryAction.label}
      </button>
      {!isApproved && (
        <button className="detail-print-btn" onClick={onAssign} disabled={isLoading}>
          <Users size={17} /> Phân công xử lý
        </button>
      )}
      {isApproved && (
        <button className="detail-print-btn" onClick={onPrint} disabled={isLoading}>
          <Printer size={17} /> In phiếu dịch vụ
        </button>
      )}
      <div className="detail-secondary-grid">
        <SecondaryButton icon={Edit3} label="Chỉnh sửa" onClick={onEdit} disabled={isLoading} />
        <SecondaryButton icon={MessageSquare} label="Gửi SMS" onClick={onSendSms} disabled={isLoading} />
        <SecondaryButton icon={Send} label="Gửi Email" onClick={onSendEmail} disabled={isLoading} />
        <SecondaryButton icon={XCircle} label="Hủy lịch" onClick={onCancel} disabled={isLoading} danger />
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

