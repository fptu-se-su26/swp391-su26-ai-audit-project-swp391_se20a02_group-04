const Appointment = require('../models/Appointment.model');
const Service = require('../models/Service.model');
const User = require('../models/User.model');
const UserAudit = require('../models/UserAudit.model');
const { successResponse, errorResponse } = require('../utils/response.util');

/**
 * Get all appointments with filters
 * GET /api/admin/appointments
 */
const getAllAppointments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = '',
      customer_id = '',
      staff_id = '',
      service_id = '',
      date_from = '',
      date_to = '',
      sort_by = 'appointment_date',
      sort_order = 'desc'
    } = req.query;

    // Build query
    const query = {};

    if (status) {
      query.status = status.toUpperCase();
    }

    if (customer_id) {
      query.customer_id = customer_id;
    }

    if (staff_id) {
      if (staff_id === 'unassigned') {
        query.staff_id = null;
      } else {
        query.staff_id = staff_id;
      }
    }

    if (service_id) {
      query.service_id = service_id;
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
        .populate('cancelled_by', 'full_name')
        .sort({ [sort_by]: sortOrder })
        .limit(parseInt(limit))
        .skip(skip),
      Appointment.countDocuments(query)
    ]);

    return successResponse(res, 200, 'Appointments retrieved successfully', {
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
 * GET /api/admin/appointments/:id
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
 * Update appointment
 * PUT /api/admin/appointments/:id
 */
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      appointment_date,
      start_time,
      end_time,
      service_id,
      staff_id,
      staff_notes,
      vehicle_info
    } = req.body;

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return errorResponse(res, 404, 'Appointment not found');
    }

    if (!appointment.canBeModified()) {
      return errorResponse(res, 400, 'Appointment cannot be modified in current status');
    }

    const oldValues = {
      appointment_date: appointment.appointment_date,
      start_time: appointment.start_time,
      end_time: appointment.end_time,
      service_id: appointment.service_id,
      staff_id: appointment.staff_id
    };

    // Update fields
    if (appointment_date !== undefined) appointment.appointment_date = appointment_date;
    if (start_time !== undefined) appointment.start_time = start_time;
    if (end_time !== undefined) appointment.end_time = end_time;
    if (service_id !== undefined) appointment.service_id = service_id;
    if (staff_id !== undefined) appointment.staff_id = staff_id;
    if (staff_notes !== undefined) appointment.staff_notes = staff_notes;
    if (vehicle_info !== undefined) {
      appointment.vehicle_info = { ...appointment.vehicle_info, ...vehicle_info };
    }

    await appointment.save();

    // Log audit
    await UserAudit.create({
      user_id: appointment.customer_id,
      action: 'APPOINTMENT_UPDATED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        updated_by: req.user.userId,
        appointment_id: id,
        old_values: oldValues,
        new_values: {
          appointment_date: appointment.appointment_date,
          start_time: appointment.start_time,
          service_id: appointment.service_id,
          staff_id: appointment.staff_id
        }
      }
    });

    const updatedAppointment = await Appointment.findById(id)
      .populate('customer_id', 'full_name email phone')
      .populate('staff_id', 'full_name email')
      .populate('service_id', 'service_name base_price');

    return successResponse(res, 200, 'Appointment updated successfully', {
      appointment: updatedAppointment
    });

  } catch (error) {
    console.error('Update appointment error:', error);
    return errorResponse(res, 500, 'Failed to update appointment');
  }
};

/**
 * Update appointment status
 * PUT /api/admin/appointments/:id/status
 */
const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return errorResponse(res, 400, 'Status is required');
    }

    const validStatuses = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
    if (!validStatuses.includes(status.toUpperCase())) {
      return errorResponse(res, 400, 'Invalid status');
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return errorResponse(res, 404, 'Appointment not found');
    }

    const oldStatus = appointment.status;
    appointment.status = status.toUpperCase();

    // Set completed_at when status is COMPLETED
    if (status.toUpperCase() === 'COMPLETED' && !appointment.completed_at) {
      appointment.completed_at = new Date();
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
        new_status: appointment.status
      }
    });

    return successResponse(res, 200, 'Appointment status updated successfully', {
      appointment: {
        _id: appointment._id,
        status: appointment.status,
        completed_at: appointment.completed_at
      }
    });

  } catch (error) {
    console.error('Update appointment status error:', error);
    return errorResponse(res, 500, 'Failed to update appointment status');
  }
};

/**
 * Cancel appointment
 * DELETE /api/admin/appointments/:id
 */
const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return errorResponse(res, 404, 'Appointment not found');
    }

    if (!appointment.canBeCancelled()) {
      return errorResponse(res, 400, 'Appointment cannot be cancelled in current status');
    }

    appointment.status = 'CANCELLED';
    appointment.cancellation_reason = reason || 'Cancelled by admin';
    appointment.cancelled_by = req.user.userId;
    appointment.cancelled_at = new Date();

    await appointment.save();

    // Log audit
    await UserAudit.create({
      user_id: appointment.customer_id,
      action: 'APPOINTMENT_CANCELLED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        cancelled_by: req.user.userId,
        appointment_id: id,
        reason
      }
    });

    return successResponse(res, 200, 'Appointment cancelled successfully');

  } catch (error) {
    console.error('Cancel appointment error:', error);
    return errorResponse(res, 500, 'Failed to cancel appointment');
  }
};

/**
 * Assign staff to appointment
 * POST /api/admin/appointments/:id/assign-staff
 */
const assignStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { staff_id } = req.body;

    if (!staff_id) {
      return errorResponse(res, 400, 'Staff ID is required');
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return errorResponse(res, 404, 'Appointment not found');
    }

    // Verify staff exists and has STAFF role
    const staff = await User.findById(staff_id);
    if (!staff) {
      return errorResponse(res, 404, 'Staff not found');
    }

    const oldStaffId = appointment.staff_id;
    appointment.staff_id = staff_id;

    // Auto-confirm appointment when staff is assigned
    if (appointment.status === 'PENDING') {
      appointment.status = 'CONFIRMED';
    }

    await appointment.save();

    // Log audit
    await UserAudit.create({
      user_id: appointment.customer_id,
      action: 'STAFF_ASSIGNED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        assigned_by: req.user.userId,
        appointment_id: id,
        old_staff_id: oldStaffId,
        new_staff_id: staff_id
      }
    });

    const updatedAppointment = await Appointment.findById(id)
      .populate('staff_id', 'full_name email phone');

    return successResponse(res, 200, 'Staff assigned successfully', {
      appointment: updatedAppointment
    });

  } catch (error) {
    console.error('Assign staff error:', error);
    return errorResponse(res, 500, 'Failed to assign staff');
  }
};

/**
 * Get appointment statistics
 * GET /api/admin/appointments/statistics
 */
const getAppointmentStatistics = async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // Overall statistics
    const [
      totalAppointments,
      pendingAppointments,
      confirmedAppointments,
      inProgressAppointments,
      completedAppointments,
      cancelledAppointments,
      noShowAppointments,
      recentAppointments
    ] = await Promise.all([
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: 'PENDING' }),
      Appointment.countDocuments({ status: 'CONFIRMED' }),
      Appointment.countDocuments({ status: 'IN_PROGRESS' }),
      Appointment.countDocuments({ status: 'COMPLETED' }),
      Appointment.countDocuments({ status: 'CANCELLED' }),
      Appointment.countDocuments({ status: 'NO_SHOW' }),
      Appointment.countDocuments({ created_at: { $gte: daysAgo } })
    ]);

    // Appointments by date (last 7 days)
    const appointmentsByDate = await Appointment.aggregate([
      {
        $match: {
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

    // Most popular services
    const popularServices = await Appointment.aggregate([
      {
        $match: {
          created_at: { $gte: daysAgo }
        }
      },
      {
        $group: {
          _id: '$service_id',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'services',
          localField: '_id',
          foreignField: '_id',
          as: 'service'
        }
      },
      { $unwind: '$service' },
      {
        $project: {
          service_name: '$service.service_name',
          count: 1
        }
      }
    ]);

    // Staff performance
    const staffPerformance = await Appointment.aggregate([
      {
        $match: {
          staff_id: { $ne: null },
          status: 'COMPLETED',
          completed_at: { $gte: daysAgo }
        }
      },
      {
        $group: {
          _id: '$staff_id',
          completed_count: { $sum: 1 }
        }
      },
      { $sort: { completed_count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'staff'
        }
      },
      { $unwind: '$staff' },
      {
        $project: {
          staff_name: '$staff.full_name',
          completed_count: 1
        }
      }
    ]);

    // Completion rate
    const completionRate = totalAppointments > 0
      ? ((completedAppointments / totalAppointments) * 100).toFixed(2)
      : 0;

    // Cancellation rate
    const cancellationRate = totalAppointments > 0
      ? ((cancelledAppointments / totalAppointments) * 100).toFixed(2)
      : 0;

    return successResponse(res, 200, 'Appointment statistics retrieved successfully', {
      overview: {
        total: totalAppointments,
        pending: pendingAppointments,
        confirmed: confirmedAppointments,
        in_progress: inProgressAppointments,
        completed: completedAppointments,
        cancelled: cancelledAppointments,
        no_show: noShowAppointments,
        recent: recentAppointments,
        completion_rate: parseFloat(completionRate),
        cancellation_rate: parseFloat(cancellationRate)
      },
      charts: {
        appointments_by_date: appointmentsByDate,
        popular_services: popularServices,
        staff_performance: staffPerformance
      },
      period_days: parseInt(period)
    });

  } catch (error) {
    console.error('Get appointment statistics error:', error);
    return errorResponse(res, 500, 'Failed to retrieve appointment statistics');
  }
};

/**
 * Get calendar view of appointments
 * GET /api/admin/appointments/calendar
 */
const getAppointmentCalendar = async (req, res) => {
  try {
    const { start_date, end_date, staff_id = '' } = req.query;

    if (!start_date || !end_date) {
      return errorResponse(res, 400, 'start_date and end_date are required');
    }

    const query = {
      appointment_date: {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      }
    };

    if (staff_id) {
      query.staff_id = staff_id;
    }

    const appointments = await Appointment.find(query)
      .populate('customer_id', 'full_name email phone')
      .populate('staff_id', 'full_name')
      .populate('service_id', 'service_name estimated_duration')
      .sort({ appointment_date: 1, start_time: 1 });

    // Group by date
    const calendar = {};
    appointments.forEach(apt => {
      const dateKey = apt.appointment_date.toISOString().split('T')[0];
      if (!calendar[dateKey]) {
        calendar[dateKey] = [];
      }
      calendar[dateKey].push(apt);
    });

    return successResponse(res, 200, 'Calendar retrieved successfully', {
      calendar,
      total_appointments: appointments.length
    });

  } catch (error) {
    console.error('Get appointment calendar error:', error);
    return errorResponse(res, 500, 'Failed to retrieve calendar');
  }
};

module.exports = {
  getAllAppointments,
  getAppointmentById,
  updateAppointment,
  updateAppointmentStatus,
  cancelAppointment,
  assignStaff,
  getAppointmentStatistics,
  getAppointmentCalendar
};
