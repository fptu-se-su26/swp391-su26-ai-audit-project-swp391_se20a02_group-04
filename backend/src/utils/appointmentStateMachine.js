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
  return Boolean(appointment?.staff_id);
}

function validateAppointmentTransition(appointment, nextStatus) {
  const current = String(appointment?.status || '').toUpperCase();
  const target = String(nextStatus || '').toUpperCase();

  if (!VALID_STATUSES.includes(target)) {
    return {
      ok: false,
      statusCode: 400,
      message: 'Invalid appointment status'
    };
  }

  if (TERMINAL_STATUSES.includes(current)) {
    return {
      ok: false,
      statusCode: 422,
      message: 'Appointment is already closed and cannot change status'
    };
  }

  if (!ALLOWED_TRANSITIONS[current]?.includes(target)) {
    return {
      ok: false,
      statusCode: 422,
      message: `Cannot move appointment status from ${current} to ${target}`
    };
  }

  if (['IN_PROGRESS', 'COMPLETED'].includes(target) && !hasFullAssignment(appointment)) {
    return {
      ok: false,
      statusCode: 422,
      message: 'Appointment must be assigned to a technician before it can be started'
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
