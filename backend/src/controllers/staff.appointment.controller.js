const Appointment = require('../models/Appointment.model');
const Service = require('../models/Service.model');
const User = require('../models/User.model');
const UserAudit = require('../models/UserAudit.model');
const { successResponse, errorResponse } = require('../utils/response.util');

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
      sort_by = 'appointment_date',
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
        query.appointment_date.$gte = new Date(date_from);
      }
      if (date_to) {
        query.appointment_date.$lte = new Date(date_to);
      }
    }

    const skip = (page - 1) * limit;
    const sortOrder = sort_order === 'asc' ? 1 : -1;

    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .populate('customer_id', 'full_name email phone')
        .populate('service_id', 'service_name description base_price estimated_duration category')
        .sort({ [sort_by]: sortOrder })
        .limit(parseInt(limit))
        .skip(skip),
      Appointment.countDocuments(query)
    ]);

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

    if (status) {
      query.status = status.toUpperCase();
    }

    if (staff_id) {
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
        query.appointment_date.$gte = new Date(date_from);
      }
      if (date_to) {
        query.appointment_date.$lte = new Date(date_to);
      }
    }

    const skip = (page - 1) * limit;
    const sortOrder = sort_order === 'asc' ? 1 : -1;

    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .populate('customer_id', 'full_name email phone')
        .populate('staff_id', 'full_name email')
        .populate('service_id', 'service_name base_price estimated_duration')
        .sort({ [sort_by]: sortOrder })
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
 * Get appointment by ID (Staff can see any appointment)
 * GET /api/staff/appointments/:id
 */
const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findById(id)
      .populate('customer_id', 'full_name email phone avatar_url')
      .populate('staff_id', 'full_name email phone')
      .populate('service_id', 'service_name description base_price estimated_duration category')
      .populate('cancelled_by', 'full_name email');

    if (!appointment) {
      return errorResponse(res, 404, 'Appointment not found');
    }

    return successResponse(res, 200, 'Appointment retrieved successfully', {
      appointment
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

    // Staff can only update appointments assigned to them
    if (appointment.staff_id && appointment.staff_id.toString() !== req.user.userId) {
      return errorResponse(res, 403, 'You can only update appointments assigned to you');
    }

    const oldStatus = appointment.status;
    appointment.status = status.toUpperCase();

    // Set completed_at when status is COMPLETED
    if (status.toUpperCase() === 'COMPLETED' && !appointment.completed_at) {
      appointment.completed_at = new Date();
      if (actual_duration) {
        appointment.actual_duration = parseInt(actual_duration);
      }
    }

    // Auto-assign staff if not assigned and status is being updated
    if (!appointment.staff_id) {
      appointment.staff_id = req.user.userId;
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

/**
 * Get today's appointments for staff
 * GET /api/staff/appointments/today
 */
const getTodayAppointments = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const query = {
      appointment_date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
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
      date: startOfDay.toISOString().split('T')[0]
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
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    const staffId = req.user.userId;

    // Get staff's appointment statistics
    const [
      totalAssigned,
      completedAppointments,
      inProgressAppointments,
      upcomingAppointments,
      todayAppointments
    ] = await Promise.all([
      Appointment.countDocuments({ 
        staff_id: staffId,
        created_at: { $gte: daysAgo }
      }),
      Appointment.countDocuments({ 
        staff_id: staffId,
        status: 'COMPLETED',
        completed_at: { $gte: daysAgo }
      }),
      Appointment.countDocuments({ 
        staff_id: staffId,
        status: 'IN_PROGRESS'
      }),
      Appointment.countDocuments({ 
        staff_id: staffId,
        status: { $in: ['PENDING', 'CONFIRMED'] },
        appointment_date: { $gte: new Date() }
      }),
      Appointment.countDocuments({ 
        staff_id: staffId,
        appointment_date: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      })
    ]);

    // Get completion rate
    const completionRate = totalAssigned > 0 
      ? ((completedAppointments / totalAssigned) * 100).toFixed(2)
      : 0;

    // Get appointments by date (last 7 days)
    const appointmentsByDate = await Appointment.aggregate([
      {
        $match: {
          staff_id: new require('mongoose').Types.ObjectId(staffId),
          appointment_date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$appointment_date' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return successResponse(res, 200, 'Workload statistics retrieved successfully', {
      overview: {
        total_assigned: totalAssigned,
        completed: completedAppointments,
        in_progress: inProgressAppointments,
        upcoming: upcomingAppointments,
        today: todayAppointments,
        completion_rate: parseFloat(completionRate)
      },
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

module.exports = {
  getMyAssignedAppointments,
  getAllAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  addAppointmentNotes,
  getTodayAppointments,
  getMyWorkloadStats
};