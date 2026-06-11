const StaffAttendance = require('../models/StaffAttendance.model');
const UserAudit = require('../models/UserAudit.model');
const { successResponse, errorResponse } = require('../utils/response.util');

const toDateString = (date = new Date()) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const getEmptyTodayAttendance = (workDate, staffId) => ({
  attendance_id: null,
  staff_id: staffId,
  work_date: workDate,
  check_in_time: null,
  check_out_time: null,
  total_hours: 0,
  status: 'NOT_CHECKED_IN'
});

const formatAttendance = (attendance) => {
  if (!attendance) return null;

  const plain = attendance.toObject ? attendance.toObject() : attendance;
  const totalHours = Number((plain.total_hours || 0).toFixed(2));

  return {
    ...plain,
    attendance_id: plain._id || plain.attendance_id,
    total_hours: totalHours,
    check_in_at: plain.check_in_time,
    check_out_at: plain.check_out_time,
    total_minutes: Math.round(totalHours * 60)
  };
};

const getTodayAttendance = async (req, res) => {
  try {
    const workDate = toDateString();
    const attendance = await StaffAttendance.findOne({
      staff_id: req.user.userId,
      work_date: workDate
    });

    return successResponse(res, 200, 'Today attendance retrieved successfully', {
      attendance: attendance
        ? formatAttendance(attendance)
        : getEmptyTodayAttendance(workDate, req.user.userId),
      work_date: workDate
    });
  } catch (error) {
    console.error('Get today attendance error:', error);
    return errorResponse(res, 500, 'Failed to retrieve today attendance');
  }
};

const checkIn = async (req, res) => {
  try {
    const workDate = toDateString();

    const existing = await StaffAttendance.findOne({
      staff_id: req.user.userId,
      work_date: workDate
    });

    if (existing) {
      return errorResponse(res, 409, 'You have already checked in today');
    }

    const attendance = await StaffAttendance.create({
      staff_id: req.user.userId,
      work_date: workDate,
      check_in_time: new Date(),
      status: 'CHECKED_IN'
    });

    await UserAudit.create({
      user_id: req.user.userId,
      action: 'STAFF_CHECK_IN',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: { attendance_id: attendance._id, work_date: workDate }
    });

    return successResponse(res, 201, 'Checked in successfully', {
      attendance: formatAttendance(attendance)
    });
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 409, 'You have already checked in today');
    }

    console.error('Check-in error:', error);
    return errorResponse(res, 500, 'Failed to check in');
  }
};

const checkOut = async (req, res) => {
  try {
    const workDate = toDateString();

    const attendance = await StaffAttendance.findOne({
      staff_id: req.user.userId,
      work_date: workDate
    });

    if (!attendance) {
      return errorResponse(res, 400, 'You have not checked in today');
    }

    if (attendance.status === 'CHECKED_OUT' || attendance.check_out_time) {
      return errorResponse(res, 409, 'You have already checked out today');
    }

    if (attendance.status !== 'CHECKED_IN') {
      return errorResponse(res, 409, 'Attendance record is not ready for check-out');
    }

    attendance.checkOut(new Date());
    await attendance.save();

    await UserAudit.create({
      user_id: req.user.userId,
      action: 'STAFF_CHECK_OUT',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        attendance_id: attendance._id,
        work_date: workDate,
        total_hours: attendance.total_hours
      }
    });

    return successResponse(res, 200, 'Checked out successfully', {
      attendance: formatAttendance(attendance)
    });
  } catch (error) {
    console.error('Check-out error:', error);
    return errorResponse(res, 500, 'Failed to check out');
  }
};

const getAttendanceHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      date_from = '',
      date_to = ''
    } = req.query;

    const query = { staff_id: req.user.userId };

    if (date_from || date_to) {
      query.work_date = {};
      if (date_from) query.work_date.$gte = date_from;
      if (date_to) query.work_date.$lte = date_to;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [records, total] = await Promise.all([
      StaffAttendance.find(query)
        .sort({ work_date: -1, check_in_time: -1 })
        .limit(Number(limit))
        .skip(skip),
      StaffAttendance.countDocuments(query)
    ]);

    return successResponse(res, 200, 'Attendance history retrieved successfully', {
      records: records.map(formatAttendance),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get attendance history error:', error);
    return errorResponse(res, 500, 'Failed to retrieve attendance history');
  }
};

const getAttendanceSummary = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));
    const startDateString = toDateString(startDate);

    const records = await StaffAttendance.find({
      staff_id: req.user.userId,
      work_date: { $gte: startDateString }
    });

    const totalHours = records.reduce((sum, record) => sum + (record.total_hours || 0), 0);
    const checkedOutRecords = records.filter((record) => record.status === 'CHECKED_OUT').length;
    const activeRecord = records.find((record) => record.status === 'CHECKED_IN') || null;

    return successResponse(res, 200, 'Attendance summary retrieved successfully', {
      overview: {
        total_shifts: records.length,
        completed_shifts: checkedOutRecords,
        total_minutes: Math.round(totalHours * 60),
        total_hours: Number(totalHours.toFixed(2)),
        active_shift: formatAttendance(activeRecord)
      },
      period_days: Number(period)
    });
  } catch (error) {
    console.error('Get attendance summary error:', error);
    return errorResponse(res, 500, 'Failed to retrieve attendance summary');
  }
};

module.exports = {
  getTodayAttendance,
  checkIn,
  checkOut,
  getAttendanceHistory,
  getAttendanceSummary
};
