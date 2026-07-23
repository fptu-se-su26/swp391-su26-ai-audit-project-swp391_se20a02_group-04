const mongoose = require('mongoose');
const Appointment = require('../models/Appointment.model');
const AppointmentAssignment = require('../models/AppointmentAssignment.model');
const RepairBay = require('../models/RepairBay.model');
const Role = require('../models/Role.model');
const StaffAttendance = require('../models/StaffAttendance.model');
const User = require('../models/User.model');
const UserAudit = require('../models/UserAudit.model');
const UserRole = require('../models/UserRole.model');
const WorkSchedule = require('../models/WorkSchedule.model');
const Notification = require('../models/Notification.model');
const { successResponse, errorResponse } = require('../utils/response.util');
const {
  addMinutes,
  assignAppointment,
  buildDateTime,
  calculateServiceDuration,
  checkRepairBayAvailability,
  getAppointmentStart
} = require('../services/appointment-scheduling.service');

const ACTIVE_APPOINTMENT_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'];
const WORKLOAD_BUSY_IN_PROGRESS = 4;
const WORKLOAD_BUSY_ORDERS = 7;
const SHIFT_DEFAULTS = {
  MORNING: ['07:00', '12:00'],
  AFTERNOON: ['12:00', '18:00'],
  FULL_DAY: ['07:00', '18:00']
};

function todayString() {
  const localDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function isDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function normalizeDate(value) {
  if (!value) return todayString();
  return String(value).slice(0, 10);
}

/** Monday (local) of the week containing dateStr; returns YYYY-MM-DD */
function getMondayOfWeek(dateStr) {
  const date = new Date(`${normalizeDate(dateStr)}T12:00:00`);
  const day = date.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/** Mon→Sat (6 days) from Monday */
function getWorkWeekDates(weekStart) {
  const monday = getMondayOfWeek(weekStart);
  return Array.from({ length: 6 }, (_, index) => {
    const day = new Date(`${monday}T12:00:00`);
    day.setDate(day.getDate() + index);
    const local = new Date(day.getTime() - day.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  });
}

function getWorkloadStatus(inProgressCount, ordersReceived) {
  if (inProgressCount >= WORKLOAD_BUSY_IN_PROGRESS || ordersReceived >= WORKLOAD_BUSY_ORDERS) {
    return 'busy';
  }
  return 'ok';
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value || '').split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function rangeInsideSchedule(startTime, endTime, schedule) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const scheduleStart = timeToMinutes(schedule.shift_start);
  const scheduleEnd = timeToMinutes(schedule.shift_end);
  return start !== null && end !== null && start >= scheduleStart && end <= scheduleEnd;
}

function minutesBetween(startAt, endAt) {
  if (!startAt || !endAt) return 0;
  return Math.max(0, Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000));
}

function addMinutesToTime(time, minutes) {
  const start = timeToMinutes(time);
  if (start === null) return '';
  const total = start + Number(minutes || 0);
  const hours = Math.floor(total / 60) % 24;
  const mins = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function scheduleResponse(schedule) {
  if (!schedule) return null;
  const data = schedule.toObject ? schedule.toObject() : schedule;
  return {
    id: String(data._id || data.id),
    staff_id: String(data.staff_id?._id || data.staff_id),
    staff: data.staff_id && data.staff_id.full_name ? {
      id: String(data.staff_id._id),
      full_name: data.staff_id.full_name,
      email: data.staff_id.email,
      phone: data.staff_id.phone,
      specialization: data.staff_id.specialization
    } : undefined,
    work_date: data.work_date,
    shift: data.shift,
    shift_start: data.shift_start,
    shift_end: data.shift_end,
    status: data.status,
    note: data.note || '',
    created_at: data.created_at,
    updated_at: data.updated_at
  };
}

function attendanceResponse(attendance) {
  if (!attendance) return null;
  const data = attendance.toObject ? attendance.toObject() : attendance;
  const checkIn = data.check_in_time || data.check_in_at || null;
  const checkOut = data.check_out_time || data.check_out_at || null;
  const totalHours = Number(data.total_hours);
  const totalMinutes = Number.isFinite(totalHours) && totalHours > 0
    ? Math.round(totalHours * 60)
    : (checkOut && checkIn ? minutesBetween(checkIn, checkOut) : Number(data.total_minutes) || 0);

  return {
    id: String(data._id || data.id),
    staff_id: String(data.staff_id?._id || data.staff_id),
    work_date: data.work_date,
    check_in_at: checkIn,
    check_out_at: checkOut,
    check_in_time: checkIn,
    check_out_time: checkOut,
    total_minutes: totalMinutes,
    total_hours: Number.isFinite(totalHours) ? totalHours : Number((totalMinutes / 60).toFixed(2)),
    status: data.status,
    check_in_note: data.check_in_note || '',
    check_out_note: data.check_out_note || ''
  };
}

async function createAudit(req, action, metadata = {}) {
  try {
    await UserAudit.create({
      user_id: req.user.userId,
      action,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      metadata
    });
  } catch (error) {
    console.warn('Audit log failed:', error.message);
  }
}

async function getStaffRoleId() {
  const role = await Role.findOne({ role_name: 'STAFF', is_active: true }).select('_id');
  return role?._id || null;
}

async function getStaffIds() {
  const staffRoleId = await getStaffRoleId();
  if (!staffRoleId) return [];
  const userRoles = await UserRole.find({ role_id: staffRoleId }).select('user_id');
  return userRoles.map((item) => item.user_id);
}

async function isStaffUser(staffId) {
  const staffRoleId = await getStaffRoleId();
  if (!staffRoleId) return false;
  return Boolean(await UserRole.exists({ user_id: staffId, role_id: staffRoleId }));
}

async function getStaffBase(query = {}) {
  const staffIds = await getStaffIds();
  return User.find({ _id: { $in: staffIds }, ...query })
    .select('full_name email phone avatar_url specialization is_active created_at')
    .sort({ full_name: 1 });
}

function normalizeSchedulePayload(body) {
  const shift = String(body.shift || '').toUpperCase();
  let shiftStart = body.shift_start;
  let shiftEnd = body.shift_end;

  if (SHIFT_DEFAULTS[shift]) {
    shiftStart = shiftStart || SHIFT_DEFAULTS[shift][0];
    shiftEnd = shiftEnd || SHIFT_DEFAULTS[shift][1];
  }

  return {
    staff_id: body.staff_id,
    work_date: normalizeDate(body.work_date),
    shift,
    shift_start: shiftStart,
    shift_end: shiftEnd,
    status: body.status ? String(body.status).toUpperCase() : undefined,
    note: body.note || ''
  };
}

async function validateSchedulePayload(payload, excludeScheduleId = null, allowPastTimeEdit = false) {
  if (!mongoose.Types.ObjectId.isValid(payload.staff_id)) {
    return 'Staff ID không hợp lệ';
  }

  if (!await isStaffUser(payload.staff_id)) {
    return 'Staff không tồn tại hoặc không có role STAFF';
  }

  if (!isDateString(payload.work_date)) {
    return 'Ngày làm việc phải đúng định dạng YYYY-MM-DD';
  }

  if (!allowPastTimeEdit && payload.work_date < todayString()) {
    return 'Không thể tạo hoặc đổi giờ ca trong quá khứ';
  }

  if (!['MORNING', 'AFTERNOON', 'FULL_DAY', 'CUSTOM'].includes(payload.shift)) {
    return 'Shift không hợp lệ';
  }

  if (payload.shift === 'CUSTOM' && (!payload.shift_start || !payload.shift_end)) {
    return 'Ca CUSTOM bắt buộc nhập giờ bắt đầu và kết thúc';
  }

  const start = timeToMinutes(payload.shift_start);
  const end = timeToMinutes(payload.shift_end);
  if (start === null || end === null || end <= start) {
    return 'Giờ ca làm việc không hợp lệ';
  }

  const overlapQuery = {
    staff_id: payload.staff_id,
    work_date: payload.work_date,
    status: { $ne: 'CANCELLED' }
  };

  if (excludeScheduleId) {
    overlapQuery._id = { $ne: excludeScheduleId };
  }

  const schedules = await WorkSchedule.find(overlapQuery);
  const hasOverlap = schedules.some((schedule) => (
    rangesOverlap(start, end, timeToMinutes(schedule.shift_start), timeToMinutes(schedule.shift_end))
  ));

  return hasOverlap ? 'Staff đã có ca bị trùng giờ trong ngày này' : null;
}

async function getAppointmentConflicts({ staffId, repairBayId, date, startTime, endTime, excludeAppointmentId }) {
  const startAt = buildDateTime(date, startTime);
  const endAt = buildDateTime(date, endTime);
  if (!startAt || !endAt) return [];

  const query = {
    appointment_date: date,
    status: { $in: ACTIVE_APPOINTMENT_STATUSES }
  };
  if (staffId) query.staff_id = staffId;
  if (repairBayId) query.repair_bay_id = repairBayId;
  if (excludeAppointmentId) query._id = { $ne: excludeAppointmentId };

  const appointments = await Appointment.find(query)
    .select('appointment_code appointment_date start_time time_slot appointment_start_at estimated_end_time estimated_duration total_service_duration_minutes staff_id repair_bay_id status')
    .populate('staff_id', 'full_name')
    .populate('repair_bay_id', 'name code');

  return appointments.filter((appointment) => {
    const appointmentStart = getAppointmentStart(appointment);
    const appointmentEnd = appointment.estimated_end_time || addMinutes(
      appointmentStart,
      appointment.total_service_duration_minutes || appointment.estimated_duration || 60
    );
    return appointmentStart && appointmentEnd && rangesOverlap(appointmentStart, appointmentEnd, startAt, endAt);
  });
}

async function buildAvailabilityForStaff(staff, { date, start_time, end_time, appointment_id }) {
  const schedules = await WorkSchedule.find({
    staff_id: staff._id,
    work_date: date,
    status: { $nin: ['CANCELLED', 'ABSENT'] }
  }).sort({ shift_start: 1 });

  const attendance = await StaffAttendance.findOne({ staff_id: staff._id, work_date: date });
  const [dayAppointments, inProgressCount] = await Promise.all([
    Appointment.find({
      staff_id: staff._id,
      appointment_date: date,
      status: { $in: ACTIVE_APPOINTMENT_STATUSES }
    }).select('appointment_code status start_time time_slot estimated_end_time estimated_duration total_service_duration_minutes'),
    Appointment.countDocuments({ staff_id: staff._id, status: 'IN_PROGRESS' })
  ]);

  const ordersReceived = dayAppointments.length;
  const onDuty = Boolean(staff.is_active && schedules.length);
  const matchingSchedule = schedules.find((schedule) => rangeInsideSchedule(start_time, end_time, schedule));

  const busySlots = dayAppointments.map((appointment) => {
    const start = appointment.start_time || appointment.time_slot || '';
    const end = appointment.estimated_end_time
      ? new Date(appointment.estimated_end_time).toISOString().slice(11, 16)
      : addMinutesToTime(start, appointment.total_service_duration_minutes || appointment.estimated_duration || 60);
    return {
      appointment_id: String(appointment._id),
      appointment_code: appointment.appointment_code,
      start_time: start,
      end_time: end,
      status: appointment.status
    };
  });

  const conflicts = onDuty && start_time && end_time ? await getAppointmentConflicts({
    staffId: staff._id,
    date,
    startTime: start_time,
    endTime: end_time,
    excludeAppointmentId: appointment_id
  }) : [];

  const warnings = [];
  if (onDuty && schedules.length && start_time && end_time && !matchingSchedule) {
    warnings.push('Khung giờ hẹn nằm ngoài ca đăng ký (vẫn có thể phân công)');
  }
  if (conflicts.length) {
    warnings.push('Staff đã có lịch hẹn khác trong khung giờ này (vẫn có thể phân công)');
  }

  let presence = 'Nghỉ';
  if (onDuty) {
    if (attendance?.status === 'IN_SHIFT' || (attendance?.check_in_time && !attendance?.check_out_time)) {
      presence = 'Có mặt';
    } else if (attendance?.status === 'COMPLETED') {
      presence = 'Đã checkout';
    } else {
      presence = 'Có lịch';
    }
  }

  const workloadStatus = getWorkloadStatus(inProgressCount, ordersReceived);

  // selectable = đang làm ngày đó; available giữ tương thích FE (không chặn theo giờ)
  const available = onDuty;
  let reason = null;
  if (!staff.is_active) reason = 'Staff inactive';
  else if (!schedules.length) reason = 'Không làm việc ngày này';

  return {
    staff_id: String(staff._id),
    full_name: staff.full_name,
    email: staff.email,
    phone: staff.phone,
    specialization: staff.specialization || '',
    available,
    on_duty: onDuty,
    selectable: onDuty,
    reason,
    warnings,
    presence,
    in_progress_count: inProgressCount,
    orders_received_count: ordersReceived,
    appointment_count_today: ordersReceived,
    workload_status: workloadStatus,
    schedule: matchingSchedule ? scheduleResponse(matchingSchedule) : (schedules[0] ? scheduleResponse(schedules[0]) : null),
    attendance_status: attendance?.status || null,
    busy_slots: busySlots
  };
}

async function getWeeklyStaffMatrix(req, res) {
  try {
    const weekStart = getMondayOfWeek(req.query.week_start || todayString());
    const dates = getWorkWeekDates(weekStart);
    const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    const allStaff = await getStaffBase({ is_active: true });
    const schedules = await WorkSchedule.find({
      staff_id: { $in: allStaff.map((item) => item._id) },
      work_date: { $in: dates },
      status: { $nin: ['CANCELLED', 'ABSENT'] }
    }).select('staff_id work_date shift shift_start shift_end status');

    const scheduleSet = new Set(schedules.map((row) => `${row.staff_id}|${row.work_date}`));

    const technicians_per_day = dates.map((date, index) => ({
      date,
      label: dayLabels[index],
      working_count: allStaff.filter((staff) => scheduleSet.has(`${staff._id}|${date}`)).length
    }));

    const rows = allStaff.map((staff) => {
      const days = {};
      dates.forEach((date, index) => {
        const working = scheduleSet.has(`${staff._id}|${date}`);
        days[date] = {
          label: dayLabels[index],
          working,
          status: working ? 'WORKING' : 'OFF'
        };
      });
      return {
        staff_id: String(staff._id),
        full_name: staff.full_name,
        email: staff.email,
        specialization: staff.specialization || '',
        days
      };
    });

    return successResponse(res, 200, 'Lấy lịch tuần thành công', {
      week_start: weekStart,
      week_end: dates[dates.length - 1],
      dates,
      day_labels: dayLabels,
      technicians_per_day,
      rows
    });
  } catch (error) {
    console.error('Weekly staff matrix error:', error);
    return errorResponse(res, 500, 'Không thể lấy lịch tuần nhân sự');
  }
}

async function getManagerStaff(req, res) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const search = String(req.query.search || '').trim();
    const query = {};

    if (req.query.is_active !== undefined) {
      query.is_active = String(req.query.is_active) === 'true';
    }

    if (search) {
      query.$or = [
        { full_name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { specialization: new RegExp(search, 'i') }
      ];
    }

    const allStaff = await getStaffBase(query);
    const total = allStaff.length;
    const staff = allStaff.slice((page - 1) * limit, page * limit);
    const staffIds = staff.map((item) => item._id);
    const date = todayString();

    const [schedules, attendance, appointments, inProgress] = await Promise.all([
      WorkSchedule.find({ staff_id: { $in: staffIds }, work_date: date, status: { $ne: 'CANCELLED' } }).sort({ shift_start: 1 }),
      StaffAttendance.find({ staff_id: { $in: staffIds }, work_date: date }),
      Appointment.find({ staff_id: { $in: staffIds }, appointment_date: date, status: { $in: ACTIVE_APPOINTMENT_STATUSES } }).select('staff_id status'),
      Appointment.find({ staff_id: { $in: staffIds }, status: 'IN_PROGRESS' }).select('staff_id')
    ]);

    const items = staff.map((item) => {
      const itemSchedules = schedules.filter((schedule) => String(schedule.staff_id) === String(item._id) && schedule.status !== 'ABSENT');
      const itemAttendance = attendance.find((row) => String(row.staff_id) === String(item._id));
      const dayOrders = appointments.filter((appointment) => String(appointment.staff_id) === String(item._id));
      const inProgressCount = inProgress.filter((appointment) => String(appointment.staff_id) === String(item._id)).length;
      const onDuty = itemSchedules.length > 0;
      let presence = 'Nghỉ';
      if (onDuty) {
        if (itemAttendance?.status === 'IN_SHIFT' || (itemAttendance?.check_in_time && !itemAttendance?.check_out_time)) presence = 'Có mặt';
        else if (itemAttendance?.status === 'COMPLETED') presence = 'Đã checkout';
        else presence = 'Có lịch';
      }

      return {
        id: String(item._id),
        full_name: item.full_name,
        email: item.email,
        phone: item.phone,
        avatar_url: item.avatar_url,
        specialization: item.specialization || '',
        is_active: item.is_active,
        today_schedule: itemSchedules.length === 1 ? scheduleResponse(itemSchedules[0]) : itemSchedules.map(scheduleResponse),
        on_duty: onDuty,
        presence,
        attendance_status: itemAttendance?.status || null,
        in_progress_count: inProgressCount,
        orders_received_count: dayOrders.length,
        today_appointment_count: dayOrders.length,
        workload_status: getWorkloadStatus(inProgressCount, dayOrders.length)
      };
    });

    return successResponse(res, 200, 'Lấy danh sách staff thành công', {
      items,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Manager staff list error:', error);
    return errorResponse(res, 500, 'Không thể lấy danh sách staff');
  }
}

async function getManagerStaffById(req, res) {
  try {
    if (!await isStaffUser(req.params.id)) {
      return errorResponse(res, 404, 'Staff không tồn tại');
    }

    const staff = await User.findById(req.params.id).select('full_name email phone avatar_url specialization is_active created_at');
    if (!staff) return errorResponse(res, 404, 'Staff không tồn tại');

    const date = todayString();
    const now = new Date(date);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    const weekDates = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + index);
      return day.toISOString().slice(0, 10);
    });
    const monthPrefix = date.slice(0, 7);

    const [weeklySchedules, attendanceToday, todayAppointments, completedMonth] = await Promise.all([
      WorkSchedule.find({ staff_id: staff._id, work_date: { $in: weekDates } }).sort({ work_date: 1, shift_start: 1 }),
      StaffAttendance.findOne({ staff_id: staff._id, work_date: date }),
      Appointment.find({ staff_id: staff._id, appointment_date: date }).select('appointment_code service vehicle vehicle_info status start_time time_slot estimated_end_time'),
      Appointment.countDocuments({ staff_id: staff._id, appointment_date: new RegExp(`^${monthPrefix}`), status: 'COMPLETED' })
    ]);

    return successResponse(res, 200, 'Lấy chi tiết staff thành công', {
      staff: {
        id: String(staff._id),
        full_name: staff.full_name,
        email: staff.email,
        phone: staff.phone,
        avatar_url: staff.avatar_url,
        specialization: staff.specialization || '',
        is_active: staff.is_active,
        created_at: staff.created_at
      },
      weekly_schedules: weeklySchedules.map(scheduleResponse),
      attendance_today: attendanceResponse(attendanceToday),
      today_appointments: todayAppointments,
      completed_appointments_this_month: completedMonth
    });
  } catch (error) {
    console.error('Manager staff detail error:', error);
    return errorResponse(res, 500, 'Không thể lấy chi tiết staff');
  }
}

async function getStaffWorkload(req, res) {
  try {
    if (!await isStaffUser(req.params.id)) {
      return errorResponse(res, 404, 'Staff không tồn tại');
    }

    const date = normalizeDate(req.query.date);
    const nextWeek = new Date(date);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekDate = nextWeek.toISOString().slice(0, 10);

    const [inProgress, confirmedToday, upcoming, schedules, attendance] = await Promise.all([
      Appointment.countDocuments({ staff_id: req.params.id, status: 'IN_PROGRESS' }),
      Appointment.countDocuments({ staff_id: req.params.id, appointment_date: date, status: 'CONFIRMED' }),
      Appointment.find({ staff_id: req.params.id, appointment_date: { $gte: date, $lte: nextWeekDate }, status: { $in: ACTIVE_APPOINTMENT_STATUSES } })
        .select('appointment_code appointment_date start_time time_slot status service vehicle vehicle_info estimated_end_time'),
      WorkSchedule.find({ staff_id: req.params.id, work_date: date, status: { $ne: 'CANCELLED' } }),
      StaffAttendance.findOne({ staff_id: req.params.id, work_date: date })
    ]);

    const totalMinutes = schedules.reduce((sum, schedule) => (
      sum + Math.max(0, timeToMinutes(schedule.shift_end) - timeToMinutes(schedule.shift_start))
    ), 0);

    return successResponse(res, 200, 'Lấy workload thành công', {
      in_progress_count: inProgress,
      confirmed_today_count: confirmedToday,
      upcoming_7_days_count: upcoming.length,
      total_work_minutes_today: totalMinutes,
      attendance_status: attendance?.status || null,
      today_appointments: upcoming.filter((appointment) => appointment.appointment_date === date)
    });
  } catch (error) {
    console.error('Staff workload error:', error);
    return errorResponse(res, 500, 'Không thể lấy workload staff');
  }
}

async function createSchedule(req, res) {
  try {
    const payload = normalizeSchedulePayload(req.body);
    const validationError = await validateSchedulePayload(payload);
    if (validationError) return errorResponse(res, 400, validationError);

    const schedule = await WorkSchedule.create({
      ...payload,
      created_by: req.user.userId,
      updated_by: req.user.userId
    });

    await createAudit(req, 'SCHEDULE_CREATED', { schedule_id: schedule._id, staff_id: payload.staff_id, work_date: payload.work_date });
    return successResponse(res, 201, 'Tạo ca làm việc thành công', scheduleResponse(schedule));
  } catch (error) {
    console.error('Create schedule error:', error);
    return errorResponse(res, 500, 'Không thể tạo ca làm việc');
  }
}

async function bulkCreateSchedules(req, res) {
  try {
    const items = Array.isArray(req.body.schedules) ? req.body.schedules.slice(0, 50) : [];
    if (!items.length) return errorResponse(res, 400, 'Danh sách lịch làm việc không hợp lệ');

    const created = [];
    const skipped = [];
    const errors = [];

    for (const [index, item] of items.entries()) {
      const payload = normalizeSchedulePayload(item);
      const validationError = await validateSchedulePayload(payload);
      if (validationError) {
        errors.push({ index, message: validationError, payload });
        skipped.push(payload);
        continue;
      }

      const schedule = await WorkSchedule.create({
        ...payload,
        created_by: req.user.userId,
        updated_by: req.user.userId
      });
      created.push(scheduleResponse(schedule));
    }

    if (created.length) {
      await createAudit(req, 'SCHEDULE_CREATED', { bulk: true, created_count: created.length, skipped_count: skipped.length });
    }

    return successResponse(res, 201, 'Tạo lịch hàng loạt hoàn tất', { created, skipped, errors });
  } catch (error) {
    console.error('Bulk create schedules error:', error);
    return errorResponse(res, 500, 'Không thể tạo lịch hàng loạt');
  }
}

async function getSchedules(req, res) {
  try {
    const query = {};
    if (req.query.staff_id) query.staff_id = req.query.staff_id;
    if (req.query.date) query.work_date = normalizeDate(req.query.date);
    if (req.query.month) query.work_date = new RegExp(`^${String(req.query.month).slice(0, 7)}`);
    if (req.query.week) {
      const [year, week] = String(req.query.week).split('-W').map(Number);
      const firstDay = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
      const day = firstDay.getUTCDay();
      firstDay.setUTCDate(firstDay.getUTCDate() - day + (day === 0 ? -6 : 1));
      const dates = Array.from({ length: 7 }, (_, index) => {
        const current = new Date(firstDay);
        current.setUTCDate(firstDay.getUTCDate() + index);
        return current.toISOString().slice(0, 10);
      });
      query.work_date = { $in: dates };
    }

    const schedules = await WorkSchedule.find(query)
      .populate('staff_id', 'full_name email phone specialization')
      .sort({ work_date: 1, shift_start: 1 });

    if (req.query.week) {
      const grouped = schedules.reduce((acc, schedule) => {
        acc[schedule.work_date] = acc[schedule.work_date] || [];
        acc[schedule.work_date].push(scheduleResponse(schedule));
        return acc;
      }, {});
      return successResponse(res, 200, 'Lấy lịch làm việc thành công', grouped);
    }

    return successResponse(res, 200, 'Lấy lịch làm việc thành công', schedules.map(scheduleResponse));
  } catch (error) {
    console.error('Get schedules error:', error);
    return errorResponse(res, 500, 'Không thể lấy lịch làm việc');
  }
}

async function updateSchedule(req, res) {
  try {
    const schedule = await WorkSchedule.findById(req.params.id);
    if (!schedule) return errorResponse(res, 404, 'Không tìm thấy ca làm việc');

    const past = schedule.work_date < todayString();
    const nextPayload = {
      staff_id: schedule.staff_id,
      work_date: schedule.work_date,
      shift: req.body.shift ? String(req.body.shift).toUpperCase() : schedule.shift,
      shift_start: req.body.shift_start || schedule.shift_start,
      shift_end: req.body.shift_end || schedule.shift_end,
      status: req.body.status ? String(req.body.status).toUpperCase() : schedule.status,
      note: req.body.note !== undefined ? req.body.note : schedule.note
    };

    if (past && (req.body.shift || req.body.shift_start || req.body.shift_end)) {
      return errorResponse(res, 400, 'Ca đã qua chỉ được cập nhật trạng thái hoặc ghi chú');
    }

    const normalized = normalizeSchedulePayload(nextPayload);
    const validationError = await validateSchedulePayload(normalized, schedule._id, past);
    if (validationError) return errorResponse(res, 400, validationError);

    Object.assign(schedule, {
      shift: normalized.shift,
      shift_start: normalized.shift_start,
      shift_end: normalized.shift_end,
      status: normalized.status || schedule.status,
      note: normalized.note,
      updated_by: req.user.userId
    });
    await schedule.save();

    await createAudit(req, 'SCHEDULE_UPDATED', { schedule_id: schedule._id });
    return successResponse(res, 200, 'Cập nhật ca làm việc thành công', scheduleResponse(schedule));
  } catch (error) {
    console.error('Update schedule error:', error);
    return errorResponse(res, 500, 'Không thể cập nhật ca làm việc');
  }
}

async function cancelSchedule(req, res) {
  try {
    const schedule = await WorkSchedule.findById(req.params.id);
    if (!schedule) return errorResponse(res, 404, 'Không tìm thấy ca làm việc');

    schedule.status = 'CANCELLED';
    schedule.updated_by = req.user.userId;
    await schedule.save();

    await createAudit(req, 'SCHEDULE_CANCELLED', { schedule_id: schedule._id });
    return successResponse(res, 200, 'Hủy ca làm việc thành công', scheduleResponse(schedule));
  } catch (error) {
    console.error('Cancel schedule error:', error);
    return errorResponse(res, 500, 'Không thể hủy ca làm việc');
  }
}

async function getAvailableStaff(req, res) {
  try {
    const date = normalizeDate(req.query.date);
    const startTime = req.query.start_time;
    const endTime = req.query.end_time;
    if (!startTime || !endTime) return errorResponse(res, 400, 'start_time và end_time là bắt buộc');

    const staff = await getStaffBase({ is_active: true });
    const data = [];
    for (const item of staff) {
      data.push(await buildAvailabilityForStaff(item, {
        date,
        start_time: startTime,
        end_time: endTime,
        appointment_id: req.query.appointment_id
      }));
    }

    data.sort((a, b) => {
      if (a.on_duty !== b.on_duty) return a.on_duty ? -1 : 1;
      if (a.workload_status !== b.workload_status) return a.workload_status === 'ok' ? -1 : 1;
      return (a.in_progress_count || 0) - (b.in_progress_count || 0)
        || (a.orders_received_count || 0) - (b.orders_received_count || 0);
    });

    return successResponse(res, 200, 'Lấy staff availability thành công', data);
  } catch (error) {
    console.error('Available staff error:', error);
    return errorResponse(res, 500, 'Không thể kiểm tra staff availability');
  }
}

async function getStaffAvailability(req, res) {
  try {
    const staff = await User.findById(req.params.id).select('full_name email phone specialization is_active');
    if (!staff || !await isStaffUser(staff._id)) return errorResponse(res, 404, 'Staff không tồn tại');
    const date = normalizeDate(req.query.date);
    const result = await buildAvailabilityForStaff(staff, {
      date,
      start_time: req.query.start_time,
      end_time: req.query.end_time,
      appointment_id: req.query.appointment_id
    });

    return successResponse(res, 200, 'Kiểm tra availability thành công', {
      has_schedule: result.on_duty,
      is_available: result.available,
      on_duty: result.on_duty,
      presence: result.presence,
      in_progress_count: result.in_progress_count,
      orders_received_count: result.orders_received_count,
      workload_status: result.workload_status,
      warnings: result.warnings || [],
      attendance_status: result.attendance_status,
      appointment_count: result.appointment_count_today,
      busy_slots: result.busy_slots,
      reason: result.reason,
      schedule: result.schedule
    });
  } catch (error) {
    console.error('Staff availability error:', error);
    return errorResponse(res, 500, 'Không thể kiểm tra availability');
  }
}

async function getManagerAttendance(req, res) {
  try {
    const date = req.query.date ? normalizeDate(req.query.date) : null;
    const query = {};
    if (req.query.staff_id) query.staff_id = req.query.staff_id;
    if (date) query.work_date = date;
    if (req.query.date_from || req.query.date_to) {
      query.work_date = {};
      if (req.query.date_from) query.work_date.$gte = normalizeDate(req.query.date_from);
      if (req.query.date_to) query.work_date.$lte = normalizeDate(req.query.date_to);
    }

    const attendance = await StaffAttendance.find(query).populate('staff_id', 'full_name email phone specialization').sort({ work_date: -1 });

    if (!date) {
      return successResponse(res, 200, 'Lấy attendance thành công', attendance.map((row) => ({
        ...attendanceResponse(row),
        staff: row.staff_id && row.staff_id.full_name ? {
          id: String(row.staff_id._id),
          full_name: row.staff_id.full_name,
          email: row.staff_id.email,
          phone: row.staff_id.phone,
          specialization: row.staff_id.specialization || ''
        } : null
      })));
    }

    const staff = await getStaffBase(req.query.staff_id ? { _id: req.query.staff_id } : {});
    const schedules = await WorkSchedule.find({ staff_id: { $in: staff.map((item) => item._id) }, work_date: date, status: { $ne: 'CANCELLED' } });
    const items = staff.map((item) => {
      const staffAttendance = attendance.find((row) => String(row.staff_id?._id || row.staff_id) === String(item._id));
      const staffSchedules = schedules.filter((schedule) => String(schedule.staff_id) === String(item._id));
      let derivedStatus = 'off_schedule';
      if (staffSchedules.length) derivedStatus = staffAttendance ? 'checked_in' : 'absent';
      if (staffAttendance?.status === 'COMPLETED') derivedStatus = 'completed';
      if (staffAttendance?.status === 'IN_SHIFT') derivedStatus = 'checked_in';

      return {
        staff: {
          id: String(item._id),
          full_name: item.full_name,
          email: item.email,
          phone: item.phone,
          specialization: item.specialization || ''
        },
        work_date: date,
        schedules: staffSchedules.map(scheduleResponse),
        attendance: attendanceResponse(staffAttendance),
        derived_status: derivedStatus
      };
    });

    return successResponse(res, 200, 'Lấy attendance thành công', items);
  } catch (error) {
    console.error('Manager attendance error:', error);
    return errorResponse(res, 500, 'Không thể lấy attendance');
  }
}

async function createManualAttendance(req, res) {
  try {
    const { staff_id, work_date, check_in_at, check_out_at, note } = req.body;
    if (!await isStaffUser(staff_id)) return errorResponse(res, 404, 'Staff không tồn tại');
    if (await StaffAttendance.exists({ staff_id, work_date })) return errorResponse(res, 409, 'Attendance đã tồn tại cho staff và ngày này');

    const checkIn = new Date(check_in_at);
    const checkOut = check_out_at ? new Date(check_out_at) : null;
    if (Number.isNaN(checkIn.getTime())) return errorResponse(res, 400, 'Thời gian check-in không hợp lệ');
    if (checkOut && Number.isNaN(checkOut.getTime())) return errorResponse(res, 400, 'Thời gian check-out không hợp lệ');
    if (checkOut && checkOut < checkIn) return errorResponse(res, 400, 'Check-out không được nhỏ hơn check-in');

    const totalMinutes = checkOut ? minutesBetween(checkIn, checkOut) : 0;
    const attendance = await StaffAttendance.create({
      staff_id,
      work_date,
      check_in_time: checkIn,
      check_out_time: checkOut || undefined,
      total_hours: Number((totalMinutes / 60).toFixed(2)),
      status: checkOut ? 'COMPLETED' : 'IN_SHIFT',
      check_in_note: note || 'Manager tạo attendance thủ công',
      adjusted_by: req.user.userId
    });

    await createAudit(req, 'ATTENDANCE_MANUALLY_CREATED', { attendance_id: attendance._id, staff_id, work_date });
    return successResponse(res, 201, 'Tạo attendance thủ công thành công', attendanceResponse(attendance));
  } catch (error) {
    console.error('Create manual attendance error:', error);
    return errorResponse(res, 500, 'Không thể tạo attendance thủ công');
  }
}

async function updateAttendance(req, res) {
  try {
    const attendance = await StaffAttendance.findById(req.params.id);
    if (!attendance) return errorResponse(res, 404, 'Không tìm thấy attendance');

    if (req.body.check_in_at) attendance.check_in_time = new Date(req.body.check_in_at);
    if (req.body.check_out_at !== undefined) {
      attendance.check_out_time = req.body.check_out_at ? new Date(req.body.check_out_at) : undefined;
    }
    if (req.body.check_in_note !== undefined) attendance.check_in_note = req.body.check_in_note;
    if (req.body.check_out_note !== undefined) attendance.check_out_note = req.body.check_out_note;

    if (attendance.check_out_time && attendance.check_out_time < attendance.check_in_time) {
      return errorResponse(res, 400, 'Check-out không được nhỏ hơn check-in');
    }

    const totalMinutes = attendance.check_out_time
      ? minutesBetween(attendance.check_in_time, attendance.check_out_time)
      : 0;
    attendance.total_hours = Number((totalMinutes / 60).toFixed(2));
    attendance.status = attendance.check_out_time ? 'COMPLETED' : 'IN_SHIFT';
    attendance.adjusted_by = req.user.userId;
    await attendance.save();

    await createAudit(req, 'ATTENDANCE_MANUALLY_ADJUSTED', { attendance_id: attendance._id });
    return successResponse(res, 200, 'Cập nhật attendance thành công', attendanceResponse(attendance));
  } catch (error) {
    console.error('Update attendance error:', error);
    return errorResponse(res, 500, 'Không thể cập nhật attendance');
  }
}

async function getStaffPerformanceReport(req, res) {
  try {
    const period = Math.min(365, Math.max(1, Number(req.query.period || 30)));
    const from = new Date();
    from.setDate(from.getDate() - period);
    const fromDate = from.toISOString().slice(0, 10);
    const staff = await getStaffBase({ is_active: true });
    const staffIds = staff.map((item) => item._id);

    const [appointments, schedules, attendance] = await Promise.all([
      Appointment.find({ staff_id: { $in: staffIds }, appointment_date: { $gte: fromDate } }).select('staff_id status estimated_duration total_service_duration_minutes'),
      WorkSchedule.find({ staff_id: { $in: staffIds }, work_date: { $gte: fromDate }, status: { $ne: 'CANCELLED' } }),
      StaffAttendance.find({ staff_id: { $in: staffIds }, work_date: { $gte: fromDate } })
    ]);

    const rows = staff.map((item) => {
      const staffAppointments = appointments.filter((appointment) => String(appointment.staff_id) === String(item._id));
      const completed = staffAppointments.filter((appointment) => appointment.status === 'COMPLETED').length;
      const cancelled = staffAppointments.filter((appointment) => appointment.status === 'CANCELLED').length;
      const staffSchedules = schedules.filter((schedule) => String(schedule.staff_id) === String(item._id));
      const staffAttendance = attendance.filter((row) => String(row.staff_id) === String(item._id));
      const workingMinutes = staffAttendance.reduce((sum, row) => {
        const hours = Number(row.total_hours);
        if (Number.isFinite(hours) && hours > 0) return sum + Math.round(hours * 60);
        if (row.check_in_time && row.check_out_time) return sum + minutesBetween(row.check_in_time, row.check_out_time);
        return sum + (Number(row.total_minutes) || 0);
      }, 0);

      return {
        staff_id: String(item._id),
        full_name: item.full_name,
        specialization: item.specialization || '',
        total_appointments: staffAppointments.length,
        completed_appointments: completed,
        cancelled_appointments: cancelled,
        completion_rate: staffAppointments.length ? Math.round((completed / staffAppointments.length) * 100) : 0,
        total_working_hours: Math.round((workingMinutes / 60) * 10) / 10,
        scheduled_days: new Set(staffSchedules.map((schedule) => schedule.work_date)).size,
        attended_days: new Set(staffAttendance.map((row) => row.work_date)).size,
        attendance_rate: staffSchedules.length ? Math.round((staffAttendance.length / staffSchedules.length) * 100) : 0,
        average_appointments_per_day: staffSchedules.length ? Math.round((staffAppointments.length / staffSchedules.length) * 10) / 10 : 0
      };
    });

    return successResponse(res, 200, 'Lấy báo cáo hiệu suất thành công', rows);
  } catch (error) {
    console.error('Staff performance report error:', error);
    return errorResponse(res, 500, 'Không thể lấy báo cáo hiệu suất');
  }
}

async function getAttendanceSummaryReport(req, res) {
  try {
    const month = String(req.query.month || todayString().slice(0, 7)).slice(0, 7);
    const staff = await getStaffBase({ is_active: true });
    const staffIds = staff.map((item) => item._id);
    const [schedules, attendance] = await Promise.all([
      WorkSchedule.find({ staff_id: { $in: staffIds }, work_date: new RegExp(`^${month}`), status: { $ne: 'CANCELLED' } }),
      StaffAttendance.find({ staff_id: { $in: staffIds }, work_date: new RegExp(`^${month}`) })
    ]);

    const rows = staff.map((item) => {
      const staffSchedules = schedules.filter((schedule) => String(schedule.staff_id) === String(item._id));
      const staffAttendance = attendance.filter((row) => String(row.staff_id) === String(item._id));
      return {
        staff_id: String(item._id),
        full_name: item.full_name,
        scheduled_days: new Set(staffSchedules.map((schedule) => schedule.work_date)).size,
        attended_days: new Set(staffAttendance.map((row) => row.work_date)).size,
        completed_days: staffAttendance.filter((row) => row.status === 'COMPLETED').length,
        total_minutes: staffAttendance.reduce((sum, row) => {
          const hours = Number(row.total_hours);
          if (Number.isFinite(hours) && hours > 0) return sum + Math.round(hours * 60);
          if (row.check_in_time && row.check_out_time) return sum + minutesBetween(row.check_in_time, row.check_out_time);
          return sum + (Number(row.total_minutes) || 0);
        }, 0)
      };
    });

    return successResponse(res, 200, 'Lấy tổng hợp attendance thành công', rows);
  } catch (error) {
    console.error('Attendance summary error:', error);
    return errorResponse(res, 500, 'Không thể lấy tổng hợp attendance');
  }
}

async function getStaffPerformanceById(req, res) {
  try {
    if (!await isStaffUser(req.params.id)) return errorResponse(res, 404, 'Staff không tồn tại');
    const period = Math.min(365, Math.max(1, Number(req.query.period || 30)));
    const from = new Date();
    from.setDate(from.getDate() - period);
    const fromDate = from.toISOString().slice(0, 10);
    const [appointments, attendance] = await Promise.all([
      Appointment.find({ staff_id: req.params.id, appointment_date: { $gte: fromDate } }).sort({ appointment_date: 1 }),
      StaffAttendance.find({ staff_id: req.params.id, work_date: { $gte: fromDate } }).sort({ work_date: 1 })
    ]);

    return successResponse(res, 200, 'Lấy báo cáo staff thành công', {
      appointment_breakdown: appointments,
      attendance_breakdown: attendance.map(attendanceResponse),
      total_working_hours: Math.round((attendance.reduce((sum, row) => {
        const hours = Number(row.total_hours);
        if (Number.isFinite(hours) && hours > 0) return sum + hours;
        if (row.check_in_time && row.check_out_time) return sum + (minutesBetween(row.check_in_time, row.check_out_time) / 60);
        return sum;
      }, 0)) * 10) / 10,
      completed_appointments: appointments.filter((appointment) => appointment.status === 'COMPLETED').length,
      completion_rate: appointments.length ? Math.round((appointments.filter((appointment) => appointment.status === 'COMPLETED').length / appointments.length) * 100) : 0,
      average_handling_time: appointments.length ? Math.round(appointments.reduce((sum, appointment) => sum + (appointment.actual_duration || appointment.estimated_duration || 0), 0) / appointments.length) : 0
    });
  } catch (error) {
    console.error('Staff performance detail error:', error);
    return errorResponse(res, 500, 'Không thể lấy báo cáo staff');
  }
}

async function assignAppointmentWithSchedule(req, res) {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return errorResponse(res, 404, 'Appointment không tồn tại');
    if (['COMPLETED', 'CANCELLED'].includes(appointment.status)) {
      return errorResponse(res, 400, 'Không thể phân công appointment đã hoàn tất hoặc đã hủy');
    }

    if (appointment.status !== 'CONFIRMED') {
      return errorResponse(res, 400, 'Appointment must be confirmed before assigning technician');
    }

    const staffId = req.body.staff_id || req.body.technician_id;
    const startTime = req.body.start_time || appointment.start_time || appointment.time_slot;
    if (!staffId || !startTime) {
      return errorResponse(res, 400, 'staff_id và start_time là bắt buộc');
    }

    const duration = await calculateServiceDuration(appointment);
    const endTime = addMinutesToTime(startTime, duration);
    const staff = await User.findById(staffId).select('full_name email phone specialization is_active');
    if (!staff || !staff.is_active || !await isStaffUser(staffId)) {
      return errorResponse(res, 404, 'Staff không tồn tại hoặc inactive');
    }

    const availability = await buildAvailabilityForStaff(staff, {
      date: appointment.appointment_date,
      start_time: startTime,
      end_time: endTime,
      appointment_id: appointment._id
    });
    if (!availability.on_duty) {
      return errorResponse(res, 409, availability.reason || 'Nhân viên không làm việc ngày này');
    }

    const startAt = buildDateTime(appointment.appointment_date, startTime);
    const endAt = addMinutes(startAt, duration);
    appointment.start_time = startTime;
    appointment.time_slot = appointment.time_slot || startTime;
    appointment.appointment_start_at = startAt;
    appointment.estimated_end_time = endAt;
    appointment.total_service_duration_minutes = duration;
    await appointment.save();

    const previousStaffId = appointment.staff_id ? String(appointment.staff_id) : null;
    const action = previousStaffId ? 'APPOINTMENT_REASSIGNED' : 'APPOINTMENT_ASSIGNED';

    const updated = await assignAppointment({
      appointmentId: appointment._id,
      technicianId: staffId,
      repairBayId: req.body.repair_bay_id || null,
      assignedBy: req.user.userId,
      notes: req.body.note || req.body.notes || '',
      force: req.body.force
    });

    await createAudit(req, action, {
      appointment_id: appointment._id,
      staff_id: staffId,
      estimated_start_time: startAt,
      estimated_end_time: endAt
    });

    return successResponse(res, 200, 'Phân công appointment thành công', updated);
  } catch (error) {
    console.error('Manager assign appointment error:', error);
    return errorResponse(res, 500, 'Không thể phân công appointment');
  }
}

module.exports = {
  assignAppointmentWithSchedule,
  bulkCreateSchedules,
  cancelSchedule,
  createManualAttendance,
  createSchedule,
  getAttendanceSummaryReport,
  getAvailableStaff,
  getManagerAttendance,
  getManagerStaff,
  getManagerStaffById,
  getSchedules,
  getStaffAvailability,
  getStaffPerformanceById,
  getStaffPerformanceReport,
  getStaffWorkload,
  getWeeklyStaffMatrix,
  updateAttendance,
  updateSchedule
};
