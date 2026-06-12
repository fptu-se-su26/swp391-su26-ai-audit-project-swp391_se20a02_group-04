const MOCK_DELAY = 450;

const normalizeId = (appointment = {}) => String(appointment.id || "").replace(/^#/, "") || "MC-99281";

const wait = (payload) =>
  new Promise((resolve) => {
    window.setTimeout(() => resolve(payload), MOCK_DELAY);
  });

const withAudit = (appointment, patch) => ({
  ...appointment,
  ...patch,
  updatedAt: new Date().toISOString(),
  mockSynced: true,
});

export function mockConfirmAppointment(appointment) {
  return wait({
    success: true,
    message: `Đã xác nhận lịch hẹn #${normalizeId(appointment)}.`,
    data: withAudit(appointment, {
      status: "CONFIRMED",
      statusText: "Đã xác nhận",
    }),
  });
}

export function mockStartAppointmentProcessing(appointment) {
  return wait({
    success: true,
    message: `Đã bắt đầu xử lý lịch hẹn #${normalizeId(appointment)}.`,
    data: withAudit(appointment, {
      status: "IN_PROGRESS",
      statusText: "Đang xử lý",
      startTime: appointment.startTime || appointment.hour || "09:00",
    }),
  });
}

export function mockCompleteAppointment(appointment) {
  return wait({
    success: true,
    message: `Đã hoàn tất lịch hẹn #${normalizeId(appointment)}.`,
    data: withAudit(appointment, {
      status: "COMPLETED",
      statusText: "Hoàn tất",
      completedAt: new Date().toISOString(),
    }),
  });
}

export function mockUpdateAppointmentSchedule(appointment, payload) {
  return wait({
    success: true,
    message: `Đã cập nhật lịch hẹn #${normalizeId(appointment)}.`,
    data: withAudit(appointment, {
      time: payload.appointmentDate,
      hour: payload.appointmentHour,
      channel: payload.channel,
      vehicleType: payload.vehicleName,
      plate: payload.vehiclePlate,
      year: payload.vehicleYear,
      odometer: payload.vehicleMileage,
      customerNote: payload.customerNote,
      garageNote: payload.garageNote,
    }),
  });
}

export function mockCancelAppointmentDetail(appointment) {
  return wait({
    success: true,
    message: `Đã hủy lịch hẹn #${normalizeId(appointment)}.`,
    data: withAudit(appointment, {
      status: "CANCELLED",
      statusText: "Đã hủy",
    }),
  });
}

export function mockSendAppointmentSms(appointment) {
  return wait({
    success: true,
    message: `Đã gửi SMS cho khách hàng của lịch hẹn #${normalizeId(appointment)}.`,
    data: withAudit(appointment, { lastSmsAt: new Date().toISOString() }),
  });
}

export function mockSendAppointmentEmail(appointment) {
  return wait({
    success: true,
    message: `Đã gửi Email cho khách hàng của lịch hẹn #${normalizeId(appointment)}.`,
    data: withAudit(appointment, { lastEmailAt: new Date().toISOString() }),
  });
}

export function mockPrintServiceTicket(appointment) {
  return wait({
    success: true,
    message: `Đã tạo phiếu dịch vụ cho lịch hẹn #${normalizeId(appointment)}.`,
    data: withAudit(appointment, { lastPrintedAt: new Date().toISOString() }),
  });
}
