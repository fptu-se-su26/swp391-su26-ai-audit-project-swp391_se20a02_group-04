const StaffAttendance = require('../models/StaffAttendance.model');
const UserAudit = require('../models/UserAudit.model');
const { successResponse, errorResponse } = require('../utils/response.util');

const toDateString = (date = new Date()) => date.toISOString().slice(0, 10);

const formatAttendance = (attendance) => {
  if (!attendance) return null;
  const plain = attendance.toObject ? attendance.toObject() : attendance;
  return {
    ...plain,
    total_hours: Number(((plain.total_minutes || 0) / 60).toFixed(2))
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
      attendance: formatAttendance(attendance),
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
    const { note = '' } = req.body;

    const existing = await StaffAttendance.findOne({
      staff_id: req.user.userId,
      work_date: workDate
    });

    if (existing?.status === 'IN_SHIFT') {
      return errorResponse(res, 409, 'You are already checked in');
    }

    if (existing?.status === 'COMPLETED') {
      return errorResponse(res, 409, 'Shift has already been completed today');
    }

    const attendance = await StaffAttendance.create({
      staff_id: req.user.userId,
      work_date: workDate,
      check_in_at: new Date(),
      check_in_note: note,
      status: 'IN_SHIFT'
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
    console.error('Check-in error:', error);
    return errorResponse(res, 500, 'Failed to check in');
  }
};

const checkOut = async (req, res) => {
  try {
    const workDate = toDateString();
    const { note = '' } = req.body;

    const attendance = await StaffAttendance.findOne({
      staff_id: req.user.userId,
      work_date: workDate
    });

    if (!attendance) {
      return errorResponse(res, 404, 'No active shift found for today');
    }

    if (attendance.status !== 'IN_SHIFT') {
      return errorResponse(res, 409, 'Shift is not active');
    }

    attendance.finishShift(new Date(), note);
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
        total_minutes: attendance.total_minutes
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
        .sort({ work_date: -1, check_in_at: -1 })
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

    const totalMinutes = records.reduce((sum, record) => sum + (record.total_minutes || 0), 0);
    const completedShifts = records.filter((record) => record.status === 'COMPLETED').length;
    const activeShift = records.find((record) => record.status === 'IN_SHIFT') || null;

    return successResponse(res, 200, 'Attendance summary retrieved successfully', {
      overview: {
        total_shifts: records.length,
        completed_shifts: completedShifts,
        total_minutes: totalMinutes,
        total_hours: Number((totalMinutes / 60).toFixed(2)),
        active_shift: formatAttendance(activeShift)
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
