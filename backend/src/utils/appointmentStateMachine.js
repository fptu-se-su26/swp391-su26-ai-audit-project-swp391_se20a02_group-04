const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED', 'NO_SHOW'];

const ALLOWED_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PROGRESS', 'NO_SHOW', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: []
};

const VALID_STATUSES = Object.keys(ALLOWED_TRANSITIONS);

function hasFullAssignment(appointment) {
  return Boolean(appointment?.staff_id && appointment?.repair_bay_id);
}

function validateAppointmentTransition(appointment, nextStatus) {
  const current = String(appointment?.status || '').toUpperCase();
  const target = String(nextStatus || '').toUpperCase();

  if (!VALID_STATUSES.includes(target)) {
    return {
      ok: false,
      statusCode: 400,
      message: 'Invalid status'
    };
  }

  if (TERMINAL_STATUSES.includes(current)) {
    return {
      ok: false,
      statusCode: 422,
      message: 'Appointment đã kết thúc, không thể thay đổi trạng thái'
    };
  }

  if (!ALLOWED_TRANSITIONS[current]?.includes(target)) {
    return {
      ok: false,
      statusCode: 422,
      message: `Không thể chuyển trạng thái appointment từ ${current} sang ${target}`
    };
  }

  if (['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(target) && !hasFullAssignment(appointment)) {
    return {
      ok: false,
      statusCode: 422,
      message: target === 'CONFIRMED'
        ? 'Appointment phải được phân công kỹ thuật viên và kệ sửa chữa trước khi xác nhận'
        : 'Appointment chưa được phân công đầy đủ kỹ thuật viên và kệ sửa chữa'
    };
  }

  return { ok: true, target };
}

module.exports = {
  ALLOWED_TRANSITIONS,
  TERMINAL_STATUSES,
  VALID_STATUSES,
  hasFullAssignment,
  validateAppointmentTransition
};
