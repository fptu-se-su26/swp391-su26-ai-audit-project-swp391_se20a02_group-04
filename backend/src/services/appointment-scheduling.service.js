const Appointment = require('../models/Appointment.model');
const AppointmentAssignment = require('../models/AppointmentAssignment.model');
const RepairBay = require('../models/RepairBay.model');
const Service = require('../models/Service.model');
const User = require('../models/User.model');
const UserRole = require('../models/UserRole.model');
const Role = require('../models/Role.model');
const { notifyStaffAssigned } = require('../utils/staffNotification.util');

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'WAITING_PARTS'];

function buildDateTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;
  const datePart = String(dateValue).slice(0, 10);
  const [hours, minutes] = String(timeValue).split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  const date = new Date(`${datePart}T00:00:00.000Z`);
  date.setUTCHours(hours, minutes, 0, 0);
  return date;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + Number(minutes || 0) * 60 * 1000);
}

function getAppointmentStart(appointment) {
  return appointment.appointment_start_at || buildDateTime(appointment.appointment_date, appointment.start_time || appointment.time_slot);
}

function getDurationFromAppointment(appointment, populatedService) {
  return Number(
    appointment.total_service_duration_minutes ||
    appointment.service?.estimated_duration_minutes ||
    populatedService?.estimated_duration ||
    appointment.estimated_duration ||
    60
  );
}

async function calculateServiceDuration(appointment) {
  let service = null;
  if (appointment.service_id) {
    service = await Service.findById(appointment.service_id).select('estimated_duration');
  }
  return getDurationFromAppointment(appointment, service);
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

async function findAppointmentConflicts(query, startTime, endTime, excludeAppointmentId) {
  const conflictQuery = {
    ...query,
    status: { $in: ACTIVE_STATUSES }
  };

  if (excludeAppointmentId) {
    conflictQuery._id = { $ne: excludeAppointmentId };
  }

  const candidates = await Appointment.find(conflictQuery)
    .select('appointment_code appointment_date start_time time_slot appointment_start_at estimated_end_time estimated_duration total_service_duration_minutes status staff_id repair_bay_id')
    .populate('staff_id', 'full_name')
    .populate('repair_bay_id', 'name code');

  return candidates.filter((candidate) => {
    const candidateStart = getAppointmentStart(candidate);
    const candidateEnd = candidate.estimated_end_time || addMinutes(candidateStart, getDurationFromAppointment(candidate));
    return candidateStart && candidateEnd && rangesOverlap(candidateStart, candidateEnd, startTime, endTime);
  });
}

async function getStaffRoleId() {
  const role = await Role.findOne({ role_name: 'STAFF', is_active: true }).select('_id');
  return role?._id || null;
}

async function isStaffUser(userId) {
  const staffRoleId = await getStaffRoleId();
  if (!staffRoleId) return false;

  const userRole = await UserRole.findOne({
    user_id: userId,
    role_id: staffRoleId
  });

  return Boolean(userRole);
}

async function listTechnicians() {
  const staffRoleId = await getStaffRoleId();
  if (!staffRoleId) return [];

  const userRoles = await UserRole.find({ role_id: staffRoleId }).select('user_id');
  const userIds = userRoles.map((role) => role.user_id);

  return User.find({ _id: { $in: userIds }, is_active: true })
    .select('full_name email phone avatar_url specialization is_active')
    .sort({ full_name: 1 });
}

async function checkTechnicianAvailability(technicianId, startTime, endTime, excludeAppointmentId) {
  const conflicts = await findAppointmentConflicts(
    { staff_id: technicianId },
    startTime,
    endTime,
    excludeAppointmentId
  );

  return {
    available: conflicts.length === 0,
    conflicts
  };
}

async function checkRepairBayAvailability(repairBayId, startTime, endTime, excludeAppointmentId) {
  const bay = await RepairBay.findById(repairBayId);
  if (!bay || !bay.is_active || bay.status !== 'AVAILABLE') {
    return {
      available: false,
      conflicts: [],
      reason: !bay ? 'Repair bay not found' : 'Repair bay is not available'
    };
  }

  const conflicts = await findAppointmentConflicts(
    { repair_bay_id: repairBayId },
    startTime,
    endTime,
    excludeAppointmentId
  );

  return {
    available: conflicts.length < bay.capacity,
    conflicts,
    capacity: bay.capacity
  };
}

async function assignAppointment({ appointmentId, technicianId, repairBayId, assignedBy, notes, force = false }) {
  const forceReassign = force === true || force === 'true';
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    const error = new Error('Appointment not found');
    error.statusCode = 404;
    throw error;
  }

  if (appointment.status !== 'CONFIRMED') {
    const error = new Error('Appointment must be confirmed before assigning technician');
    error.statusCode = 400;
    throw error;
  }

  const existingAssignment = await AppointmentAssignment.findOne({ appointment_id: appointment._id });
  const alreadyAssigned = Boolean(existingAssignment || appointment.staff_id);
  if (alreadyAssigned && appointment.status === 'CONFIRMED' && forceReassign !== true) {
    const error = new Error('Appointment đã được phân công. Hãy huỷ phân công hiện tại trước khi phân công lại');
    error.statusCode = 409;
    throw error;
  }

  const technician = await User.findById(technicianId);
  if (!technician || !technician.is_active || !(await isStaffUser(technicianId))) {
    const error = new Error('Technician not found or inactive');
    error.statusCode = 404;
    throw error;
  }

  let repairBay = null;
  if (repairBayId) {
    repairBay = await RepairBay.findById(repairBayId);
    if (!repairBay || !repairBay.is_active || repairBay.status !== 'AVAILABLE') {
      const error = new Error('Repair bay not found or unavailable');
      error.statusCode = 400;
      throw error;
    }
  }

  const estimatedStartTime = getAppointmentStart(appointment);
  if (!estimatedStartTime) {
    const error = new Error('Appointment start time is invalid');
    error.statusCode = 400;
    throw error;
  }

  const durationMinutes = await calculateServiceDuration(appointment);
  const estimatedEndTime = addMinutes(estimatedStartTime, durationMinutes);

  const techAvailability = await checkTechnicianAvailability(
    technicianId,
    estimatedStartTime,
    estimatedEndTime,
    appointment._id
  );

  if (!techAvailability.available) {
    const error = new Error('Technician is not available for this time slot');
    error.statusCode = 400;
    error.details = { conflicts: techAvailability.conflicts };
    throw error;
  }

  if (repairBay) {
    const bayAvailability = await checkRepairBayAvailability(
      repairBay._id,
      estimatedStartTime,
      estimatedEndTime,
      appointment._id
    );
    if (!bayAvailability.available) {
      const error = new Error(bayAvailability.reason || 'Repair bay is not available for this time slot');
      error.statusCode = 400;
      error.details = { conflicts: bayAvailability.conflicts };
      throw error;
    }
  }

  const assignmentPayload = {
    technician_id: technician._id,
    assigned_by: assignedBy,
    assigned_at: new Date(),
    estimated_start_time: estimatedStartTime,
    estimated_end_time: estimatedEndTime,
    duration_minutes: durationMinutes,
    notes,
    status: 'ASSIGNED'
  };
  if (repairBay) {
    assignmentPayload.repair_bay_id = repairBay._id;
  }

  let assignment;
  if (existingAssignment) {
    existingAssignment.set(assignmentPayload);
    if (!repairBay) existingAssignment.repair_bay_id = undefined;
    assignment = await existingAssignment.save();
  } else {
    assignment = await AppointmentAssignment.create({
      appointment_id: appointment._id,
      ...assignmentPayload
    });
  }

  const previousStaffId = appointment.staff_id ? String(appointment.staff_id) : null;

  appointment.staff_id = technician._id;
  appointment.repair_bay_id = repairBay ? repairBay._id : null;
  appointment.assignment_id = assignment._id;
  appointment.assigned_at = assignment.assigned_at;
  appointment.appointment_start_at = estimatedStartTime;
  appointment.estimated_end_time = estimatedEndTime;
  appointment.total_service_duration_minutes = durationMinutes;
  appointment.status = 'CONFIRMED';
  appointment.confirmed_at = appointment.confirmed_at || new Date();
  if (notes) appointment.staff_notes = notes;

  await appointment.save();

  await notifyStaffAssigned(appointment, technician._id, { previousStaffId });

  return Appointment.findById(appointment._id)
    .populate('customer_id', 'full_name email phone avatar_url')
    .populate('staff_id', 'full_name email phone specialization')
    .populate('service_id', 'service_name description base_price estimated_duration category')
    .populate('repair_bay_id', 'name code location equipment status')
    .populate('assignment_id');
}

async function startAppointment(appointmentId, userId) {
  const appointment = await Appointment.findById(appointmentId).populate('assignment_id');
  if (!appointment) {
    const error = new Error('Appointment not found');
    error.statusCode = 404;
    throw error;
  }

  if (appointment.status !== 'CONFIRMED') {
    const error = new Error('Only confirmed appointments can be started');
    error.statusCode = 400;
    throw error;
  }

  if (!appointment.staff_id) {
    const error = new Error('Appointment must be assigned to a staff member before it can be started');
    error.statusCode = 409;
    throw error;
  }

  const now = new Date();
  appointment.status = 'IN_PROGRESS';
  appointment.actual_start_time = now;
  if (appointment.assignment_id) {
    appointment.assignment_id.status = 'IN_PROGRESS';
    appointment.assignment_id.actual_start_time = now;
    await appointment.assignment_id.save();
  }

  await appointment.save();
  return appointment;
}

async function completeAppointment(appointmentId, { finalCost, completionNotes }) {
  const appointment = await Appointment.findById(appointmentId).populate('assignment_id');
  if (!appointment) {
    const error = new Error('Appointment not found');
    error.statusCode = 404;
    throw error;
  }

  if (appointment.status !== 'IN_PROGRESS') {
    const error = new Error('Only in-progress appointments can be completed');
    error.statusCode = 400;
    throw error;
  }

  if (!appointment.staff_id) {
    const error = new Error('Appointment chưa được phân công kỹ thuật viên');
    error.statusCode = 422;
    throw error;
  }

  const numericFinalCost = Number(finalCost);
  if (
    finalCost === undefined ||
    finalCost === null ||
    Number.isNaN(numericFinalCost) ||
    numericFinalCost <= 0
  ) {
    const error = new Error('Chi phí thực tế phải là số dương');
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  appointment.status = 'COMPLETED';
  appointment.actual_end_time = now;
  appointment.completed_at = now;
  appointment.final_cost = numericFinalCost;
  appointment.completion_notes = completionNotes || appointment.completion_notes;
  if (completionNotes) appointment.staff_notes = completionNotes;

  if (appointment.actual_start_time) {
    appointment.actual_duration = Math.max(1, Math.round((now - appointment.actual_start_time) / 60000));
  }

  if (appointment.assignment_id) {
    appointment.assignment_id.status = 'COMPLETED';
    appointment.assignment_id.actual_end_time = now;
    await appointment.assignment_id.save();
  }

  await appointment.save();
  return appointment;
}

module.exports = {
  addMinutes,
  assignAppointment,
  buildDateTime,
  calculateServiceDuration,
  checkRepairBayAvailability,
  checkTechnicianAvailability,
  completeAppointment,
  getAppointmentStart,
  listTechnicians,
  startAppointment
};
