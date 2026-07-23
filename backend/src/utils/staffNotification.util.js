const Notification = require('../models/Notification.model');

/**
 * Notify a staff member they were assigned (or reassigned) a job.
 * Safe to call repeatedly — failures are logged and never block assign.
 */
async function notifyStaffAssigned(appointment, staffId, { previousStaffId = null } = {}) {
  if (!staffId || !appointment?._id) return null;

  const staffUserId = String(staffId);
  const previousId = previousStaffId ? String(previousStaffId) : null;
  if (previousId && previousId === staffUserId) return null;

  const code = appointment.appointment_code || String(appointment._id).slice(-6).toUpperCase();
  const plate = appointment.vehicle?.license_plate || appointment.vehicle_info?.license_plate || '';
  const serviceName =
    appointment.service?.name ||
    appointment.service?.repair_issue ||
    appointment.service_id?.service_name ||
    'dịch vụ';
  const when = [appointment.appointment_date, appointment.start_time || appointment.time_slot]
    .filter(Boolean)
    .join(' · ');

  const isReassign = Boolean(previousId);
  const title = isReassign ? 'Công việc được phân công lại cho bạn' : 'Bạn nhận được công việc mới';
  const message = [
    `Lịch hẹn ${code}`,
    serviceName ? `· ${serviceName}` : '',
    plate ? `· xe ${plate}` : '',
    when ? `· ${when}` : '',
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  try {
    return await Notification.create({
      user_id: staffUserId,
      appointment_id: appointment._id,
      type: 'APPOINTMENT_ASSIGNED',
      title,
      message,
      metadata: {
        appointment_code: appointment.appointment_code || null,
        appointment_date: appointment.appointment_date || null,
        start_time: appointment.start_time || appointment.time_slot || null,
        license_plate: plate || null,
        previous_staff_id: previousId,
      },
    });
  } catch (error) {
    console.error('Failed to create staff assignment notification:', error.message);
    return null;
  }
}

module.exports = {
  notifyStaffAssigned,
};
