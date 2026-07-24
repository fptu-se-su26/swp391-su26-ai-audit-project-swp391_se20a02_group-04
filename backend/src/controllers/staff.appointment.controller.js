const Appointment = require('../models/Appointment.model');
const User = require('../models/User.model');
const UserAudit = require('../models/UserAudit.model');
const StaffAttendance = require('../models/StaffAttendance.model');
const WorkSchedule = require('../models/WorkSchedule.model');
const InventoryTransaction = require('../models/InventoryTransaction.model');
const Service = require('../models/Service.model');
const payosService = require('../services/payos.service');
const { successResponse, errorResponse } = require('../utils/response.util');
const { hasFullAssignment, validateAppointmentTransition } = require('../utils/appointmentStateMachine');
const mongoose = require('mongoose');

const toDateString = (date = new Date()) => {
  return date.toISOString().slice(0, 10);
};

const STAFF_APPOINTMENT_SORT_FIELDS = new Set(['appointment_date', 'start_time', 'time_slot', 'status', 'created_at', 'assigned_at']);

const normalizeAppointmentSort = (sortBy = 'assigned_at', sortOrder = 'asc') => {
  const safeSortBy = STAFF_APPOINTMENT_SORT_FIELDS.has(sortBy) ? sortBy : 'assigned_at';
  const normalizedOrder = String(sortOrder).toLowerCase();
  const safeSortOrder = normalizedOrder === 'desc' || normalizedOrder === '-1' ? -1 : 1;
  return { safeSortBy, safeSortOrder };
};

const getStaffAppointmentSort = (sortBy, sortOrder) => ({
  [sortBy]: sortOrder,
  appointment_date: 1,
  start_time: 1
});

const ensureInProgressAppointment = (appointment, user) => {
  const ownership = checkStaffAppointmentOwnership(appointment, user);
  if (!ownership.ok) return ownership;
  if (appointment.status !== 'IN_PROGRESS') {
    return { ok: false, statusCode: 422, message: 'Workflow actions are only available for in-progress appointments' };
  }
  return { ok: true };
};

const getAddonServicesTotal = (appointment) => {
  const addons = Array.isArray(appointment.addon_services) ? appointment.addon_services : [];
  return addons.reduce((sum, item) => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    return sum + Number(item.price || 0) * qty;
  }, 0);
};

// REPAIR is booked as "quote after inspection" (estimated_price null).
// Do not fall back to catalog base_price for REPAIR — that invents a fake labor line.
const getLaborPrice = (appointment) => {
  const serviceSnap = appointment.service || {};
  const serviceType = String(serviceSnap.type || '').toUpperCase();
  const quoted = serviceSnap.estimated_price;

  if (quoted !== null && quoted !== undefined && quoted !== '') {
    return Number(quoted) || 0;
  }

  if (serviceType === 'REPAIR') {
    return 0;
  }

  const serviceDoc = appointment.service_id && typeof appointment.service_id === 'object'
    ? appointment.service_id
    : null;
  return Number(serviceDoc?.base_price || 0);
};

const getBillDetails = async (appointment) => {
  const basePrice = getLaborPrice(appointment);
  const materials = await InventoryTransaction.find({
    reference_type: 'APPOINTMENT',
    reference_id: appointment._id,
    transaction_type: 'STOCK_OUT',
    is_reversed: { $ne: true }
  }).select('total_cost');
  const materialsTotal = materials.reduce((sum, transaction) => sum + Number(transaction.total_cost || 0), 0);
  const addonTotal = getAddonServicesTotal(appointment);

  return {
    basePrice,
    materialsTotal,
    addonTotal,
    total: Math.round(basePrice + materialsTotal + addonTotal)
  };
};

// PayOS requires a positive safe integer order code. The ObjectId-derived code is stable
// per appointment and is persisted in payment_info for webhook/status lookups.
const getPayOSOrderCode = (appointment) => {
  const existing = Number(appointment.payment_info?.order_code);
  if (Number.isSafeInteger(existing) && existing > 0) return existing;
  return parseInt(String(appointment._id).slice(-12), 16) || Date.now();
};

const applyPaidPayment = async (appointment, payment) => {
  const now = payment.paid_at ? new Date(payment.paid_at) : new Date();
  appointment.payment_info = {
    ...(appointment.payment_info?.toObject?.() || appointment.payment_info || {}),
    status: 'PAID',
    paid_at: now,
    amount: Number(payment.amount || appointment.payment_info?.amount || 0),
    method: 'PAYOS'
  };
  appointment.final_cost = Number(payment.amount || appointment.payment_info?.amount || 0);
  appointment.status = 'COMPLETED';
  appointment.completed_at = appointment.completed_at || now;
  appointment.actual_end_time = appointment.actual_end_time || now;
  await appointment.save();
};

const getDateDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - Number(days || 0));
  return toDateString(date);
};

const isPrivileged = (user = {}) => {
  const roles = user.roles || [];
  return roles.includes('ADMIN') || roles.includes('MANAGER');
};

const createAuditSafely = async (req, action, metadata = {}, userId = req.user.userId) => {
  try {
    await UserAudit.create({
      user_id: userId,
      action,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata
    });
  } catch (error) {
    console.warn('Staff audit log failed:', error.message);
  }
};

const getEntityId = (value) => {
  if (!value) return null;
  return value._id || value.id || value;
};

const checkStaffAppointmentOwnership = (appointment, user) => {
  if (!appointment) return { ok: false, statusCode: 404, message: 'Appointment not found' };
  if (isPrivileged(user)) return { ok: true };
  const assignedStaffId = getEntityId(appointment.staff_id);
  if (assignedStaffId && String(assignedStaffId) === String(user.userId)) {
    return { ok: true };
  }
  return { ok: false, statusCode: 403, message: 'You can only access appointments assigned to you' };
};

const getCurrentWeekRange = () => {
  const now = new Date();
  const day = now.getDay() || 7;
  const start = new Date(now);
  start.setDate(now.getDate() - day + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return [toDateString(start), toDateString(end)];
};

const getWeekRange = (weekValue) => {
  if (!weekValue) return getCurrentWeekRange();
  const match = String(weekValue).match(/^(\d{4})-W(\d{2})$/);
  if (!match) return getCurrentWeekRange();
  const year = Number(match[1]);
  const week = Number(match[2]);
  const firstDay = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const day = firstDay.getUTCDay() || 7;
  firstDay.setUTCDate(firstDay.getUTCDate() - day + 1);
  const end = new Date(firstDay);
  end.setUTCDate(firstDay.getUTCDate() + 6);
  return [firstDay.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
};

const populateStaffAppointment = (query) => query
  .populate('customer_id', 'full_name email phone avatar_url')
  .populate('staff_id', 'full_name email phone specialization')
  .populate('service_id', 'service_name description base_price estimated_duration category')
  .populate('repair_bay_id', 'name code location equipment status')
  .populate('cancelled_by', 'full_name email')
  .populate('acknowledged_by', 'full_name email');

const scheduleResponse = (schedule) => {
  if (!schedule) return null;
  return {
    id: String(schedule._id),
    staff_id: String(schedule.staff_id),
    work_date: schedule.work_date,
    shift: schedule.shift,
    shift_start: schedule.shift_start,
    shift_end: schedule.shift_end,
    status: schedule.status,
    note: schedule.note || ''
  };
};

const attendanceResponse = (attendance) => {
  if (!attendance) return null;
  return {
    id: String(attendance._id),
    staff_id: String(attendance.staff_id),
    work_date: attendance.work_date,
    check_in_at: attendance.check_in_at,
    check_out_at: attendance.check_out_at,
    total_minutes: attendance.total_minutes || 0,
    status: attendance.status,
    check_in_note: attendance.check_in_note || '',
    check_out_note: attendance.check_out_note || ''
  };
};

const getDashboard = async (req, res) => {
  try {
    const staffId = req.user.userId;
    const today = toDateString();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekDate = toDateString(nextWeek);

    const [
      profile,
      schedules,
      attendance,
      appointmentsToday,
      pendingJobs,
      inProgressJobs,
      completedToday,
      upcomingThisWeek
    ] = await Promise.all([
      User.findById(staffId).select('full_name email phone avatar_url specialization created_at'),
      WorkSchedule.find({ staff_id: staffId, work_date: today, status: { $ne: 'CANCELLED' } }).sort({ shift_start: 1 }),
      StaffAttendance.findOne({ staff_id: staffId, work_date: today }),
      populateStaffAppointment(Appointment.find({ staff_id: staffId, appointment_date: today }).sort({ start_time: 1 })),
      Appointment.countDocuments({ staff_id: staffId, status: { $in: ['PENDING', 'CONFIRMED'] } }),
      Appointment.countDocuments({ staff_id: staffId, status: 'IN_PROGRESS' }),
      Appointment.countDocuments({ staff_id: staffId, status: 'COMPLETED', appointment_date: today }),
      Appointment.countDocuments({
        staff_id: staffId,
        appointment_date: { $gte: today, $lte: nextWeekDate },
        status: { $in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] }
      })
    ]);

    return successResponse(res, 200, 'Staff dashboard retrieved successfully', {
      today: {
        work_date: today,
        schedule: schedules.length === 1 ? scheduleResponse(schedules[0]) : schedules.map(scheduleResponse),
        attendance: attendanceResponse(attendance),
        appointments_today: appointmentsToday
      },
      overview: {
        pending_jobs: pendingJobs,
        in_progress_jobs: inProgressJobs,
        completed_today: completedToday,
        upcoming_this_week: upcomingThisWeek
      },
      profile: profile ? {
        id: String(profile._id),
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        specialization: profile.specialization || '',
        created_at: profile.created_at
      } : null
    });
  } catch (error) {
    console.error('Get staff dashboard error:', error);
    return errorResponse(res, 500, 'Failed to retrieve staff dashboard');
  }
};

const getMySchedule = async (req, res) => {
  try {
    const staffId = req.user.userId;
    let dateFrom = req.query.date_from;
    let dateTo = req.query.date_to;
    if (!dateFrom && !dateTo) {
      [dateFrom, dateTo] = getWeekRange(req.query.week);
    }

    const [schedules, attendanceRecords, appointments] = await Promise.all([
      WorkSchedule.find({ staff_id: staffId, work_date: { $gte: dateFrom, $lte: dateTo } }).sort({ work_date: 1, shift_start: 1 }),
      StaffAttendance.find({ staff_id: staffId, work_date: { $gte: dateFrom, $lte: dateTo } }),
      Appointment.aggregate([
        { $match: { staff_id: new mongoose.Types.ObjectId(staffId), appointment_date: { $gte: dateFrom, $lte: dateTo } } },
        { $group: { _id: '$appointment_date', count: { $sum: 1 } } }
      ])
    ]);

    const attendanceByDate = new Map(attendanceRecords.map((record) => [record.work_date, attendanceResponse(record)]));
    const countByDate = new Map(appointments.map((row) => [row._id, row.count]));
    const grouped = schedules.reduce((acc, schedule) => {
      if (!acc[schedule.work_date]) {
        acc[schedule.work_date] = {
          work_date: schedule.work_date,
          schedules: [],
          attendance: attendanceByDate.get(schedule.work_date) || null,
          appointment_count: countByDate.get(schedule.work_date) || 0
        };
      }
      acc[schedule.work_date].schedules.push(scheduleResponse(schedule));
      return acc;
    }, {});

    return successResponse(res, 200, 'Staff schedule retrieved successfully', {
      date_from: dateFrom,
      date_to: dateTo,
      items: Object.values(grouped)
    });
  } catch (error) {
    console.error('Get staff schedule error:', error);
    return errorResponse(res, 500, 'Failed to retrieve staff schedule');
  }
};

const getTodaySchedule = async (req, res) => {
  try {
    const today = toDateString();
    const [schedules, attendance, appointments] = await Promise.all([
      WorkSchedule.find({ staff_id: req.user.userId, work_date: today, status: { $ne: 'CANCELLED' } }).sort({ shift_start: 1 }),
      StaffAttendance.findOne({ staff_id: req.user.userId, work_date: today }),
      populateStaffAppointment(Appointment.find({ staff_id: req.user.userId, appointment_date: today }).sort({ start_time: 1 }))
    ]);

    return successResponse(res, 200, 'Today schedule retrieved successfully', {
      work_date: today,
      schedules: schedules.map(scheduleResponse),
      attendance: attendanceResponse(attendance),
      appointments
    });
  } catch (error) {
    console.error('Get today schedule error:', error);
    return errorResponse(res, 500, 'Failed to retrieve today schedule');
  }
};

/**
 * Get staff's assigned appointments
 * GET /api/staff/appointments
 */
const getMyAssignedAppointments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = '',
      date_from = '',
      date_to = '',
      service_category = '',
      sort_by = 'assigned_at',
      sort_order = 'asc'
    } = req.query;

    const query = { staff_id: req.user.userId };

    if (status) {
      query.status = status.toUpperCase();
    }

    // Date range filter
    if (date_from || date_to) {
      query.appointment_date = {};
      if (date_from) {
        query.appointment_date.$gte = date_from;
      }
      if (date_to) {
        query.appointment_date.$lte = date_to;
      }
    }

    const skip = (page - 1) * limit;
    const { safeSortBy, safeSortOrder } = normalizeAppointmentSort(sort_by, sort_order);

    let appointments;
    let total;
    const sort = getStaffAppointmentSort(safeSortBy, safeSortOrder);

    if (service_category) {
      const staffObjectId = new mongoose.Types.ObjectId(req.user.userId);
      const category = String(service_category).toUpperCase();
      const pipeline = [
        { $match: { ...query, staff_id: staffObjectId } },
        { $lookup: { from: 'services', localField: 'service_id', foreignField: '_id', as: 'svc' } },
        { $match: { 'svc.category': category } }
      ];
      const [rows, countRows] = await Promise.all([
        Appointment.aggregate([...pipeline, { $sort: sort }, { $skip: skip }, { $limit: Number(limit) }]),
        Appointment.aggregate([...pipeline, { $count: 'total' }])
      ]);
      const ids = rows.map((row) => row._id);
      const populated = await populateStaffAppointment(Appointment.find({ _id: { $in: ids } }));
      const byId = new Map(populated.map((item) => [String(item._id), item]));
      appointments = ids.map((id) => byId.get(String(id))).filter(Boolean);
      total = countRows[0]?.total || 0;
    } else {
      [appointments, total] = await Promise.all([
        populateStaffAppointment(Appointment.find(query))
          .sort(sort)
          .limit(parseInt(limit, 10))
          .skip(skip),
        Appointment.countDocuments(query)
      ]);
    }

    return successResponse(res, 200, 'Assigned appointments retrieved successfully', {
      appointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get assigned appointments error:', error);
    return errorResponse(res, 500, 'Failed to retrieve assigned appointments');
  }
};

/**
 * Get all appointments (for staff to see workload)
 * GET /api/staff/appointments/all
 */
const getAllAppointments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = '',
      date_from = '',
      date_to = '',
      staff_id = '',
      sort_by = 'appointment_date',
      sort_order = 'asc'
    } = req.query;

    const query = {};

    if (!isPrivileged(req.user)) {
      query.staff_id = req.user.userId;
    }

    if (status) {
      query.status = status.toUpperCase();
    }

    if (staff_id && isPrivileged(req.user)) {
      if (staff_id === 'unassigned') {
        query.staff_id = null;
      } else {
        query.staff_id = staff_id;
      }
    }

    // Date range filter
    if (date_from || date_to) {
      query.appointment_date = {};
      if (date_from) {
        query.appointment_date.$gte = date_from;
      }
      if (date_to) {
        query.appointment_date.$lte = date_to;
      }
    }

    const skip = (page - 1) * limit;
    const { safeSortBy, safeSortOrder } = normalizeAppointmentSort(sort_by, sort_order);

    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .populate('customer_id', 'full_name email phone')
        .populate('staff_id', 'full_name email')
        .populate('service_id', 'service_name base_price estimated_duration')
        .sort({ [safeSortBy]: safeSortOrder })
        .limit(parseInt(limit))
        .skip(skip),
      Appointment.countDocuments(query)
    ]);

    return successResponse(res, 200, 'All appointments retrieved successfully', {
      appointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all appointments error:', error);
    return errorResponse(res, 500, 'Failed to retrieve appointments');
  }
};

/**
 * Get appointment by ID
 * GET /api/staff/appointments/:id
 */
const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await populateStaffAppointment(Appointment.findById(id));

    if (!appointment) {
      return errorResponse(res, 404, 'Appointment not found');
    }

    const ownership = checkStaffAppointmentOwnership(appointment, req.user);
    if (!ownership.ok) {
      return errorResponse(res, ownership.statusCode, ownership.message);
    }

    const materials_used = await InventoryTransaction.find({
      reference_type: 'APPOINTMENT',
      reference_id: appointment._id,
      transaction_type: 'STOCK_OUT',
      is_reversed: { $ne: true }
    })
      .populate('inventory_item_id', 'item_code item_name unit unit_price quantity')
      .populate('performed_by', 'full_name email')
      .sort({ created_at: -1 });

    return successResponse(res, 200, 'Appointment retrieved successfully', {
      appointment,
      materials_used
    });

  } catch (error) {
    console.error('Get appointment by ID error:', error);
    return errorResponse(res, 500, 'Failed to retrieve appointment');
  }
};

/**
 * Update appointment status (Staff can update status of their assigned appointments)
 * PUT /api/staff/appointments/:id/status
 */
const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, actual_duration } = req.body;

    if (!status) {
      return errorResponse(res, 400, 'Status is required');
    }

    const validStatuses = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW'];
    if (!validStatuses.includes(status.toUpperCase())) {
      return errorResponse(res, 400, 'Invalid status. Staff can only set: CONFIRMED, IN_PROGRESS, COMPLETED, NO_SHOW');
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return errorResponse(res, 404, 'Appointment not found');
    }

    const ownership = checkStaffAppointmentOwnership(appointment, req.user);
    if (!ownership.ok) {
      return errorResponse(res, ownership.statusCode, ownership.message);
    }

    const transition = validateAppointmentTransition(appointment, status);
    if (!transition.ok) {
      return errorResponse(res, transition.statusCode, transition.message);
    }

    const oldStatus = appointment.status;
    appointment.status = transition.target;

    if (transition.target === 'IN_PROGRESS' && !appointment.actual_start_time) {
      appointment.actual_start_time = new Date();
    }

    if (transition.target === 'COMPLETED' && !appointment.completed_at) {
      appointment.completed_at = new Date();
      appointment.actual_end_time = appointment.actual_end_time || appointment.completed_at;
      if (actual_duration) {
        appointment.actual_duration = parseInt(actual_duration);
      }
    }

    if (notes) {
      appointment.staff_notes = notes;
    }

    await appointment.save();

    // Log audit
    await UserAudit.create({
      user_id: appointment.customer_id,
      action: 'APPOINTMENT_STATUS_CHANGED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        updated_by: req.user.userId,
        appointment_id: id,
        old_status: oldStatus,
        new_status: appointment.status,
        updated_by_role: 'STAFF'
      }
    });

    return successResponse(res, 200, 'Appointment status updated successfully', {
      appointment: {
        _id: appointment._id,
        status: appointment.status,
        completed_at: appointment.completed_at,
        actual_duration: appointment.actual_duration
      }
    });

  } catch (error) {
    console.error('Update appointment status error:', error);
    return errorResponse(res, 500, 'Failed to update appointment status');
  }
};

/**
 * Add notes to appointment (Staff can add notes to any appointment)
 * PUT /api/staff/appointments/:id/notes
 */
const addAppointmentNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    if (!notes || notes.trim() === '') {
      return errorResponse(res, 400, 'Notes are required');
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return errorResponse(res, 404, 'Appointment not found');
    }

    const ownership = checkStaffAppointmentOwnership(appointment, req.user);
    if (!ownership.ok) {
      return errorResponse(res, ownership.statusCode, ownership.message);
    }

    const oldNotes = appointment.staff_notes;
    appointment.staff_notes = notes.trim();
    await appointment.save();

    // Log audit
    await UserAudit.create({
      user_id: appointment.customer_id,
      action: 'APPOINTMENT_NOTES_ADDED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        updated_by: req.user.userId,
        appointment_id: id,
        old_notes: oldNotes,
        new_notes: notes.trim()
      }
    });

    return successResponse(res, 200, 'Notes added successfully', {
      appointment: {
        _id: appointment._id,
        staff_notes: appointment.staff_notes
      }
    });

  } catch (error) {
    console.error('Add appointment notes error:', error);
    return errorResponse(res, 500, 'Failed to add notes');
  }
};

const acknowledgeAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return errorResponse(res, 404, 'Appointment not found');

    const ownership = checkStaffAppointmentOwnership(appointment, req.user);
    if (!ownership.ok) return errorResponse(res, ownership.statusCode, ownership.message);
    if (appointment.status !== 'CONFIRMED') {
      return errorResponse(res, 400, 'Only confirmed appointments can be acknowledged');
    }
    if (appointment.acknowledged_at) {
      const updated = await populateStaffAppointment(Appointment.findById(appointment._id));
      return successResponse(res, 200, 'Appointment đã được xác nhận trước đó', { appointment: updated });
    }

    appointment.acknowledged_at = new Date();
    appointment.acknowledged_by = req.user.userId;
    await appointment.save();

    await createAuditSafely(req, 'APPOINTMENT_ACKNOWLEDGED', { appointment_id: appointment._id });
    const updated = await populateStaffAppointment(Appointment.findById(appointment._id));
    return successResponse(res, 200, 'Appointment acknowledged successfully', { appointment: updated });
  } catch (error) {
    console.error('Acknowledge appointment error:', error);
    return errorResponse(res, 500, 'Failed to acknowledge appointment');
  }
};

const startAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return errorResponse(res, 404, 'Appointment not found');

    const ownership = checkStaffAppointmentOwnership(appointment, req.user);
    if (!ownership.ok) return errorResponse(res, ownership.statusCode, ownership.message);
    if (appointment.status !== 'CONFIRMED') {
      return errorResponse(res, 400, 'Only confirmed appointments can be started');
    }
    if (!hasFullAssignment(appointment)) {
      return errorResponse(res, 422, 'Appointment chưa được phân công kỹ thuật viên');
    }

    const oldStatus = appointment.status;
    appointment.status = 'IN_PROGRESS';
    appointment.actual_start_time = new Date();
    if (req.body.notes) appointment.staff_notes = req.body.notes.trim();
    await appointment.save();

    await createAuditSafely(req, 'APPOINTMENT_STATUS_CHANGED', {
      appointment_id: appointment._id,
      old_status: oldStatus,
      new_status: appointment.status
    });

    const updated = await populateStaffAppointment(Appointment.findById(appointment._id));
    return successResponse(res, 200, 'Appointment started successfully', { appointment: updated });
  } catch (error) {
    console.error('Start appointment error:', error);
    return errorResponse(res, 500, 'Failed to start appointment');
  }
};

const completeAppointment = async (req, res) => {
  try {
    const { completion_notes = '', actual_duration, final_cost } = req.body;
    const appointment = await Appointment.findById(req.params.id).populate('service_id', 'service_name base_price');
    if (!appointment) return errorResponse(res, 404, 'Appointment not found');

    const ownership = checkStaffAppointmentOwnership(appointment, req.user);
    if (!ownership.ok) return errorResponse(res, ownership.statusCode, ownership.message);
    if (appointment.status !== 'IN_PROGRESS') {
      return errorResponse(res, 400, 'Only in-progress appointments can be completed');
    }
    if (!hasFullAssignment(appointment)) {
      return errorResponse(res, 422, 'Appointment chưa được phân công kỹ thuật viên');
    }

    const now = new Date();
    const oldStatus = appointment.status;
    const bill = await getBillDetails(appointment);
    const paidAmount = final_cost !== undefined && final_cost !== null && final_cost !== ''
      ? Number(final_cost)
      : bill.total;

    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      return errorResponse(res, 400, 'Final cost must be a non-negative number');
    }

    appointment.status = 'COMPLETED';
    appointment.completed_at = now;
    appointment.actual_end_time = now;
    appointment.completion_notes = completion_notes || appointment.completion_notes;
    if (completion_notes) appointment.staff_notes = completion_notes.trim();
    if (actual_duration) {
      appointment.actual_duration = Number(actual_duration);
    } else if (appointment.actual_start_time) {
      appointment.actual_duration = Math.max(1, Math.round((now - appointment.actual_start_time) / 60000));
    }

    appointment.final_cost = paidAmount;
    const existingPayment = appointment.payment_info?.toObject?.() || appointment.payment_info || {};
    appointment.payment_info = {
      ...existingPayment,
      status: 'PAID',
      paid_at: now,
      amount: paidAmount,
      method: existingPayment.method === 'PAYOS' || existingPayment.order_code ? (existingPayment.method || 'PAYOS') : 'CASH'
    };
    // Cash path always records CASH unless this was already a PayOS order that got settled at counter
    if (!existingPayment.order_code) {
      appointment.payment_info.method = 'CASH';
    }

    await appointment.save();

    await createAuditSafely(req, 'APPOINTMENT_STATUS_CHANGED', {
      appointment_id: appointment._id,
      old_status: oldStatus,
      new_status: appointment.status,
      actual_duration: appointment.actual_duration,
      payment_method: appointment.payment_info.method,
      final_cost: appointment.final_cost
    });

    const updated = await populateStaffAppointment(Appointment.findById(appointment._id));
    return successResponse(res, 200, 'Appointment completed successfully', { appointment: updated });
  } catch (error) {
    console.error('Complete appointment error:', error);
    return errorResponse(res, 500, 'Failed to complete appointment');
  }
};

const saveDiagnosis = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return errorResponse(res, 404, 'Appointment not found');

    const access = ensureInProgressAppointment(appointment, req.user);
    if (!access.ok) return errorResponse(res, access.statusCode, access.message);

    appointment.diagnosis_notes = req.body.diagnosis_notes.trim();

    // Staff sets labor quote after inspection (especially for REPAIR bookings).
    if (req.body.quoted_price !== undefined && req.body.quoted_price !== null && req.body.quoted_price !== '') {
      const quotedPrice = Number(req.body.quoted_price);
      if (!Number.isFinite(quotedPrice) || quotedPrice < 0) {
        return errorResponse(res, 400, 'Quoted labor price must be a non-negative number');
      }
      if (!appointment.service) appointment.service = {};
      appointment.service.estimated_price = quotedPrice;
      appointment.markModified('service');
    }

    await appointment.save();
    await createAuditSafely(req, 'APPOINTMENT_DIAGNOSIS_SAVED', {
      appointment_id: appointment._id,
      quoted_price: appointment.service?.estimated_price ?? null
    });

    return successResponse(res, 200, 'Diagnosis saved successfully', {
      appointment: {
        _id: appointment._id,
        diagnosis_notes: appointment.diagnosis_notes,
        service: appointment.service
      }
    });
  } catch (error) {
    console.error('Save appointment diagnosis error:', error);
    return errorResponse(res, 500, 'Failed to save diagnosis');
  }
};

const saveContactLog = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return errorResponse(res, 404, 'Appointment not found');

    const access = ensureInProgressAppointment(appointment, req.user);
    if (!access.ok) return errorResponse(res, access.statusCode, access.message);

    appointment.contact_log = {
      status: req.body.status,
      notes: (req.body.notes || '').trim(),
      contacted_at: new Date()
    };
    await appointment.save();
    await createAuditSafely(req, 'APPOINTMENT_CONTACT_LOG_SAVED', {
      appointment_id: appointment._id,
      status: appointment.contact_log.status
    });

    return successResponse(res, 200, 'Customer contact result saved successfully', {
      appointment: {
        _id: appointment._id,
        contact_log: appointment.contact_log
      }
    });
  } catch (error) {
    console.error('Save appointment contact log error:', error);
    return errorResponse(res, 500, 'Failed to save customer contact result');
  }
};

const saveRepairLog = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return errorResponse(res, 404, 'Appointment not found');

    const access = ensureInProgressAppointment(appointment, req.user);
    if (!access.ok) return errorResponse(res, access.statusCode, access.message);

    appointment.repair_log = {
      status: req.body.status,
      notes: (req.body.notes || '').trim(),
      completed_at: new Date()
    };
    await appointment.save();
    await createAuditSafely(req, 'APPOINTMENT_REPAIR_LOG_SAVED', {
      appointment_id: appointment._id,
      status: appointment.repair_log.status
    });

    return successResponse(res, 200, 'Repair step saved successfully', {
      appointment: {
        _id: appointment._id,
        repair_log: appointment.repair_log
      }
    });
  } catch (error) {
    console.error('Save appointment repair log error:', error);
    return errorResponse(res, 500, 'Failed to save repair step');
  }
};

const createPartsHold = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return errorResponse(res, 404, 'Appointment not found');

    const ownership = checkStaffAppointmentOwnership(appointment, req.user);
    if (!ownership.ok) {
      return errorResponse(res, ownership.statusCode, ownership.message);
    }

    const holdStatus = String(appointment.parts_hold?.status || '').toUpperCase();
    if (appointment.status === 'WAITING_PARTS' || ['PENDING_MANAGER', 'PENDING_CONSENT', 'APPROVED'].includes(holdStatus)) {
      return errorResponse(
        res,
        422,
        'Lịch này đã báo thiếu phụ tùng. Manager đang liên hệ khách — không cần báo lại.'
      );
    }

    if (appointment.status !== 'IN_PROGRESS') {
      return errorResponse(res, 422, 'Chỉ báo thiếu phụ tùng khi lịch đang ở trạng thái đang sửa chữa.');
    }

    const paymentStatus = appointment.payment_info?.status;
    if (paymentStatus === 'PENDING' || paymentStatus === 'PAID') {
      return errorResponse(res, 422, 'Không thể tạm dừng chờ hàng sau khi đã tạo thanh toán.');
    }

    const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
    const items = rawItems
      .map((item) => ({
        name: String(item.name || '').trim(),
        quantity: Math.max(1, Number(item.quantity) || 1),
        note: String(item.note || '').trim()
      }))
      .filter((item) => item.name);

    if (!items.length) {
      return errorResponse(res, 400, 'Cần ít nhất một phụ tùng thiếu');
    }
    if (items.length > 20) {
      return errorResponse(res, 400, 'Không thể yêu cầu quá 20 loại phụ tùng');
    }

    // ETA / chi phí / nội dung gửi khách do Manager xử lý khi liên hệ khách
    let etaDays = null;
    if (req.body.eta_days !== undefined && req.body.eta_days !== null && req.body.eta_days !== '') {
      etaDays = Number(req.body.eta_days);
      if (!Number.isInteger(etaDays) || etaDays < 1 || etaDays > 90) {
        return errorResponse(res, 400, 'ETA phải từ 1 đến 90 ngày');
      }
    }

    let estimatedCost = null;
    if (req.body.estimated_cost !== undefined && req.body.estimated_cost !== null && req.body.estimated_cost !== '') {
      estimatedCost = Number(req.body.estimated_cost);
      if (!Number.isFinite(estimatedCost) || estimatedCost < 0) {
        return errorResponse(res, 400, 'Chi phí dự kiến không hợp lệ');
      }
    }

    const customerMessage = String(req.body.customer_message || '').trim();
    const now = new Date();
    const partsSummary = items.map((item) => item.name).join(', ');

    appointment.parts_hold = {
      status: 'PENDING_MANAGER',
      items,
      eta_days: etaDays,
      estimated_cost: estimatedCost,
      customer_message: customerMessage || '',
      requested_at: now,
      requested_by: req.user.userId,
      consent: {
        status: 'PENDING',
        responded_at: null,
        note: '',
        contacted_by: null
      },
      ready_at: null,
      ready_by: null
    };
    appointment.repair_log = {
      status: 'WAITING_PARTS',
      notes: `Chờ phụ tùng: ${partsSummary}`,
      completed_at: null
    };
    appointment.status = 'WAITING_PARTS';
    await appointment.save();

    await createAuditSafely(req, 'APPOINTMENT_PARTS_HOLD_CREATED', {
      appointment_id: appointment._id,
      eta_days: etaDays,
      items_count: items.length
    });

    const Notification = require('../models/Notification.model');
    const Role = require('../models/Role.model');
    const UserRole = require('../models/UserRole.model');
    const code = appointment.appointment_code || appointment._id;
    const partsList = items.map((item) => `${item.name} x${item.quantity}`).join(', ');
    const plate = appointment.vehicle?.license_plate || appointment.vehicle_info?.license_plate || '';

    // Báo Manager/Admin — Manager sẽ liên hệ khách (ETA/chi phí/ghi chú)
    try {
      const targetRoles = await Role.find({ role_name: { $in: ['MANAGER', 'ADMIN'] } });
      const roleIds = targetRoles.map((role) => role._id);
      if (roleIds.length > 0) {
        const managerRoles = await UserRole.find({ role_id: { $in: roleIds } }).select('user_id');
        const managerIds = [...new Set(managerRoles.map((row) => String(row.user_id)))];
        const notifications = managerIds.map((managerId) => ({
          user_id: managerId,
          appointment_id: appointment._id,
          type: 'APPOINTMENT_UPDATED',
          title: 'Staff báo thiếu phụ tùng — cần liên hệ khách',
          message: `Lịch ${code}${plate ? ` (${plate})` : ''}: thiếu ${partsList}. Vui lòng gọi khách xác nhận đồng ý chờ hàng.`,
          metadata: {
            kind: 'PARTS_HOLD_MANAGER_REVIEW',
            appointment_id: String(appointment._id),
            appointment_code: code,
            status: 'WAITING_PARTS',
            eta_days: etaDays,
            parts: items
          }
        }));
        if (notifications.length) {
          await Notification.insertMany(notifications);
        }
      }
    } catch (notifyError) {
      console.warn('Parts hold manager notify failed:', notifyError.message);
    }

    return successResponse(res, 200, 'Đã báo Manager. Manager sẽ liên hệ khách để xác nhận chờ phụ tùng.', {
      appointment: {
        _id: appointment._id,
        status: appointment.status,
        repair_log: appointment.repair_log,
        parts_hold: appointment.parts_hold
      }
    });
  } catch (error) {
    console.error('Create parts hold error:', error);
    return errorResponse(res, 500, 'Không thể tạo yêu cầu chờ phụ tùng');
  }
};

const markPartsReady = async (req, res) => {
  return errorResponse(
    res,
    403,
    'Staff không mở lại sửa chữa tại bước này. Manager nhập phụ tùng vào kho rồi mở lại; sau đó Staff lấy phụ tùng từ kho.'
  );
};

const saveAddonServices = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return errorResponse(res, 404, 'Appointment not found');

    const access = ensureInProgressAppointment(appointment, req.user);
    if (!access.ok) return errorResponse(res, access.statusCode, access.message);

    const paymentStatus = appointment.payment_info?.status;
    if (paymentStatus === 'PENDING' || paymentStatus === 'PAID') {
      return errorResponse(
        res,
        422,
        'Không thể đổi dịch vụ bổ sung sau khi đã tạo QR PayOS hoặc đã thanh toán (tránh lệch số tiền hóa đơn).'
      );
    }

    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (items.length > 20) {
      return errorResponse(res, 400, 'Cannot add more than 20 add-on services');
    }

    if (items.length === 0) {
      appointment.addon_services = [];
      await appointment.save();
      await createAuditSafely(req, 'APPOINTMENT_ADDON_SERVICES_CLEARED', {
        appointment_id: appointment._id
      });
      return successResponse(res, 200, 'Add-on services cleared successfully', {
        appointment: {
          _id: appointment._id,
          addon_services: appointment.addon_services
        }
      });
    }

    const serviceIds = [...new Set(items.map((item) => String(item.service_id || '')).filter(Boolean))];
    if (serviceIds.length !== items.length) {
      return errorResponse(res, 400, 'Each add-on item requires a valid service_id');
    }

    const services = await Service.find({
      _id: { $in: serviceIds },
      is_active: true
    }).select('service_name base_price');

    if (services.length !== serviceIds.length) {
      return errorResponse(res, 400, 'One or more add-on services were not found or inactive');
    }

    const serviceMap = new Map(services.map((service) => [String(service._id), service]));
    const now = new Date();
    const staffId = req.user.userId || req.user._id || null;

    appointment.addon_services = items.map((item) => {
      const service = serviceMap.get(String(item.service_id));
      const quantity = Math.min(20, Math.max(1, Number.parseInt(item.quantity, 10) || 1));
      return {
        service_id: service._id,
        name: service.service_name,
        price: Number(service.base_price || 0),
        quantity,
        added_at: now,
        added_by: staffId
      };
    });

    await appointment.save();
    await createAuditSafely(req, 'APPOINTMENT_ADDON_SERVICES_SAVED', {
      appointment_id: appointment._id,
      count: appointment.addon_services.length,
      total: getAddonServicesTotal(appointment)
    });

    return successResponse(res, 200, 'Add-on services saved successfully', {
      appointment: {
        _id: appointment._id,
        addon_services: appointment.addon_services
      }
    });
  } catch (error) {
    console.error('Save appointment add-on services error:', error);
    return errorResponse(res, 500, 'Failed to save add-on services');
  }
};

const createPayment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate('service_id', 'service_name base_price');
    if (!appointment) return errorResponse(res, 404, 'Appointment not found');

    const access = ensureInProgressAppointment(appointment, req.user);
    if (!access.ok) return errorResponse(res, access.statusCode, access.message);

    if (appointment.payment_info?.status === 'PENDING' && appointment.payment_info.payment_url) {
      return successResponse(res, 200, 'Payment link already created', {
        payment_url: appointment.payment_info.payment_url,
        qr_code: appointment.payment_info.qr_code,
        order_code: appointment.payment_info.order_code
      });
    }

    const bill = await getBillDetails(appointment);
    if (!Number.isSafeInteger(bill.total) || bill.total <= 0) {
      return errorResponse(res, 422, 'Payment amount must be greater than zero');
    }

    const orderCode = getPayOSOrderCode(appointment);
    const serviceName = appointment.service_id?.service_name || appointment.service?.name || 'Repair service';
    const plate = appointment.vehicle?.license_plate || appointment.vehicle_info?.license_plate || '';
    const appUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const payment = await payosService.createPaymentLink(
      orderCode,
      bill.total,
      `${serviceName} ${plate}`.trim(),
      `${appUrl}/staff/jobs/${appointment._id}`,
      `${appUrl}/staff/jobs/${appointment._id}`
    );

    appointment.payment_info = {
      order_code: String(orderCode),
      payment_url: payment.payment_url,
      qr_code: payment.qr_code,
      status: 'PENDING',
      paid_at: null,
      amount: bill.total,
      method: 'PAYOS'
    };
    await appointment.save();
    await createAuditSafely(req, 'APPOINTMENT_PAYMENT_CREATED', {
      appointment_id: appointment._id,
      order_code: String(orderCode),
      amount: bill.total
    });

    return successResponse(res, 200, 'Payment link created successfully', {
      payment_url: payment.payment_url,
      qr_code: payment.qr_code,
      order_code: String(orderCode)
    });
  } catch (error) {
    console.error('Create PayOS payment error:', error);
    const isConfigurationError = error.code === 'PAYOS_NOT_CONFIGURED';
    return errorResponse(res, isConfigurationError ? 500 : 502,
      isConfigurationError ? error.message : 'Unable to create payment link. Please try again.');
  }
};

const getPaymentStatus = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return errorResponse(res, 404, 'Appointment not found');

    const ownership = checkStaffAppointmentOwnership(appointment, req.user);
    if (!ownership.ok) return errorResponse(res, ownership.statusCode, ownership.message);
    if (!appointment.payment_info?.order_code) {
      return errorResponse(res, 404, 'No payment has been created for this appointment');
    }

    const payment = await payosService.getPaymentStatus(appointment.payment_info.order_code);
    if (payment.status === 'PAID' && appointment.status !== 'COMPLETED') {
      await applyPaidPayment(appointment, payment);
    } else if (payment.status === 'CANCELLED' && appointment.payment_info.status !== 'PAID') {
      appointment.payment_info.status = 'CANCELLED';
      await appointment.save();
    }

    return successResponse(res, 200, 'Payment status retrieved successfully', payment);
  } catch (error) {
    console.error('Get PayOS payment status error:', error);
    const isConfigurationError = error.code === 'PAYOS_NOT_CONFIGURED';
    return errorResponse(res, isConfigurationError ? 500 : 502,
      isConfigurationError ? error.message : 'Unable to retrieve payment status. Please try again.');
  }
};

const markNoShow = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return errorResponse(res, 404, 'Appointment not found');

    const ownership = checkStaffAppointmentOwnership(appointment, req.user);
    if (!ownership.ok) return errorResponse(res, ownership.statusCode, ownership.message);
    if (appointment.status !== 'CONFIRMED') {
      return errorResponse(res, 400, 'Only confirmed appointments can be marked no-show');
    }

    const oldStatus = appointment.status;
    appointment.status = 'NO_SHOW';
    if (req.body.notes) appointment.staff_notes = req.body.notes.trim();
    await appointment.save();

    await createAuditSafely(req, 'APPOINTMENT_STATUS_CHANGED', {
      appointment_id: appointment._id,
      old_status: oldStatus,
      new_status: appointment.status
    });

    const updated = await populateStaffAppointment(Appointment.findById(appointment._id));
    return successResponse(res, 200, 'Appointment marked no-show successfully', { appointment: updated });
  } catch (error) {
    console.error('No-show appointment error:', error);
    return errorResponse(res, 500, 'Failed to mark no-show');
  }
};

const getAppointmentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, date_from = '', date_to = '' } = req.query;
    const query = {
      staff_id: req.user.userId,
      status: { $in: ['COMPLETED', 'NO_SHOW'] }
    };
    if (date_from || date_to) {
      query.appointment_date = {};
      if (date_from) query.appointment_date.$gte = date_from;
      if (date_to) query.appointment_date.$lte = date_to;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [appointments, total] = await Promise.all([
      populateStaffAppointment(Appointment.find(query))
        .sort({ appointment_date: -1, start_time: -1 })
        .limit(Number(limit))
        .skip(skip),
      Appointment.countDocuments(query)
    ]);

    return successResponse(res, 200, 'Appointment history retrieved successfully', {
      appointments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get appointment history error:', error);
    return errorResponse(res, 500, 'Failed to retrieve appointment history');
  }
};

/**
 * Get today's appointments for staff
 * GET /api/staff/appointments/today
 */
const getTodayAppointments = async (req, res) => {
  try {
    const today = toDateString();

    const query = {
      appointment_date: today
    };

    // If staff, show only their appointments. If admin/manager, show all
    if (req.user.roles.includes('STAFF') && !req.user.roles.includes('ADMIN') && !req.user.roles.includes('MANAGER')) {
      query.staff_id = req.user.userId;
    }

    const appointments = await Appointment.find(query)
      .populate('customer_id', 'full_name email phone')
      .populate('staff_id', 'full_name email')
      .populate('service_id', 'service_name estimated_duration')
      .sort({ start_time: 1 });

    return successResponse(res, 200, "Today's appointments retrieved successfully", {
      appointments,
      total: appointments.length,
      date: today
    });

  } catch (error) {
    console.error("Get today's appointments error:", error);
    return errorResponse(res, 500, "Failed to retrieve today's appointments");
  }
};

/**
 * Get staff workload statistics
 * GET /api/staff/appointments/my-stats
 */
const getMyWorkloadStats = async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const staffId = req.user.userId;
    const dateFrom = getDateDaysAgo(parseInt(period));
    const sevenDaysAgo = getDateDaysAgo(7);
    const today = toDateString();
    const staffObjectId = mongoose.Types.ObjectId.isValid(staffId)
      ? new mongoose.Types.ObjectId(staffId)
      : staffId;

    // Get staff's appointment statistics
    const [
      totalAssigned,
      completedAppointments,
      inProgressAppointments,
      upcomingAppointments,
      todayAppointments,
      noShowAppointments,
      attendanceRecords
    ] = await Promise.all([
      Appointment.countDocuments({ 
        staff_id: staffId,
        appointment_date: { $gte: dateFrom }
      }),
      Appointment.countDocuments({ 
        staff_id: staffId,
        status: 'COMPLETED',
        appointment_date: { $gte: dateFrom }
      }),
      Appointment.countDocuments({ 
        staff_id: staffId,
        status: 'IN_PROGRESS'
      }),
      Appointment.countDocuments({ 
        staff_id: staffId,
        status: { $in: ['PENDING', 'CONFIRMED'] },
        appointment_date: { $gte: today }
      }),
      Appointment.countDocuments({ 
        staff_id: staffId,
        appointment_date: today
      }),
      Appointment.countDocuments({
        staff_id: staffId,
        status: 'NO_SHOW',
        appointment_date: { $gte: dateFrom }
      }),
      StaffAttendance.find({
        staff_id: staffId,
        work_date: { $gte: dateFrom }
      }).select('total_minutes')
    ]);

    // Get completion rate
    const completionRate = totalAssigned > 0 
      ? ((completedAppointments / totalAssigned) * 100).toFixed(2)
      : 0;

    // Get appointments by date (last 7 days)
    const appointmentsByDate = await Appointment.aggregate([
      {
        $match: {
          staff_id: staffObjectId,
          appointment_date: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: '$appointment_date',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const totalMinutes = attendanceRecords.reduce((sum, record) => sum + (record.total_minutes || 0), 0);
    const overview = {
      total_assigned: totalAssigned,
      completed: completedAppointments,
      in_progress: inProgressAppointments,
      no_show: noShowAppointments,
      upcoming: upcomingAppointments,
      today: todayAppointments,
      completion_rate: parseFloat(completionRate),
      total_working_hours: Number((totalMinutes / 60).toFixed(2)),
      appointments_by_date: appointmentsByDate
    };

    return successResponse(res, 200, 'Workload statistics retrieved successfully', {
      ...overview,
      overview,
      charts: {
        appointments_by_date: appointmentsByDate
      },
      period_days: parseInt(period)
    });

  } catch (error) {
    console.error('Get workload stats error:', error);
    return errorResponse(res, 500, 'Failed to retrieve workload statistics');
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('full_name email phone avatar_url specialization created_at is_active');
    if (!user) return errorResponse(res, 404, 'Profile not found');

    return successResponse(res, 200, 'Staff profile retrieved successfully', {
      user: {
        id: String(user._id),
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        avatar_url: user.avatar_url,
        specialization: user.specialization || '',
        created_at: user.created_at,
        is_active: user.is_active
      }
    });
  } catch (error) {
    console.error('Get staff profile error:', error);
    return errorResponse(res, 500, 'Failed to retrieve staff profile');
  }
};

const updateProfile = async (req, res) => {
  try {
    const allowedFields = ['full_name', 'phone', 'specialization'];
    const unknownFields = Object.keys(req.body || {}).filter((field) => !allowedFields.includes(field));
    if (unknownFields.length > 0) {
      return errorResponse(res, 400, `Fields not allowed: ${unknownFields.join(', ')}`);
    }

    const { full_name, phone, specialization } = req.body;
    if (phone && !/^[0-9]{10,11}$/.test(String(phone))) {
      return errorResponse(res, 400, 'Phone must contain 10-11 digits');
    }

    if (phone) {
      const duplicate = await User.findOne({ phone, _id: { $ne: req.user.userId } }).select('_id');
      if (duplicate) return errorResponse(res, 409, 'Phone number already exists');
    }

    const user = await User.findById(req.user.userId);
    if (!user) return errorResponse(res, 404, 'Profile not found');

    if (full_name !== undefined) user.full_name = String(full_name).trim();
    if (phone !== undefined) user.phone = String(phone).trim();
    if (specialization !== undefined) user.specialization = String(specialization).trim();
    await user.save();

    await createAuditSafely(req, 'PROFILE_UPDATED', {
      updated_fields: Object.keys(req.body || {})
    });

    return successResponse(res, 200, 'Staff profile updated successfully', {
      user: user.toSafeObject()
    });
  } catch (error) {
    console.error('Update staff profile error:', error);
    return errorResponse(res, 500, 'Failed to update staff profile');
  }
};

module.exports = {
  acknowledgeAppointment,
  completeAppointment,
  getAppointmentHistory,
  getDashboard,
  getMyAssignedAppointments,
  getAllAppointments,
  getAppointmentById,
  getMySchedule,
  getProfile,
  updateAppointmentStatus,
  updateProfile,
  addAppointmentNotes,
  saveDiagnosis,
  saveContactLog,
  saveRepairLog,
  createPartsHold,
  markPartsReady,
  saveAddonServices,
  createPayment,
  getPaymentStatus,
  markNoShow,
  startAppointment,
  getTodaySchedule,
  getTodayAppointments,
  getMyWorkloadStats
};
