const Appointment = require('../models/Appointment.model');
const Service = require('../models/Service.model');
const User = require('../models/User.model');
const UserAudit = require('../models/UserAudit.model');
const { successResponse, errorResponse } = require('../utils/response.util');

/**
 * Create new appointment (Customer)
 * POST /api/appointments
 */
const createAppointment = async (req, res) => {
  try {
    const {
      service_id,
      appointment_date,
      start_time,
      customer_notes,
      vehicle_info
    } = req.body;

    // Verify service exists
    const service = await Service.findById(service_id);
    if (!service || !service.is_active) {
      return errorResponse(res, 404, 'Service not found or inactive');
    }

    // Check if appointment date is in the future
    const appointmentDateTime = new Date(`${appointment_date}T${start_time}`);
    if (appointmentDateTime <= new Date()) {
      return errorResponse(res, 400, 'Appointment must be scheduled for a future date and time');
    }

    // Check for conflicting appointments (same date/time)
    const conflictingAppointment = await Appointment.findOne({
      appointment_date: new Date(appointment_date),
      start_time,
      status: { $in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] }
    });

    if (conflictingAppointment) {
      return errorResponse(res, 409, 'This time slot is already booked');
    }

    // Create appointment
    const appointment = await Appointment.create({
      customer_id: req.user.userId,
      service_id,
      appointment_date: new Date(appointment_date),
      start_time,
      estimated_duration: service.estimated_duration,
      customer_notes,
      vehicle_info,
      status: 'PENDING'
    });

    // Increment service booking count
    await service.incrementBookings();

    // Log audit
    await UserAudit.create({
      user_id: req.user.userId,
      action: 'APPOINTMENT_CREATED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        appointment_id: appointment._id,
        service_id,
        appointment_date,
        start_time
      }
    });

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('service_id', 'service_name description base_price estimated_duration category');

    return successResponse(res, 201, 'Appointment created successfully', {
      appointment: populatedAppointment
    });

  } catch (error) {
    console.error('Create appointment error:', error);
    return errorResponse(res, 500, 'Failed to create appointment');
  }
};

/**
 * Get customer's appointments
 * GET /api/appointments
 */
const getMyAppointments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = '',
      date_from = '',
      date_to = '',
      sort_by = 'appointment_date',
      sort_order = 'desc'
    } = req.query;

    const query = { customer_id: req.user.userId };

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
        .populate('staff_id', 'full_name email phone')
        .populate('service_id', 'service_name description base_price estimated_duration category')
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
    console.error('Get my appointments error:', error);
    return errorResponse(res, 500, 'Failed to retrieve appointments');
  }
};

/**
 * Get appointment by ID (Customer can only see their own)
 * GET /api/appointments/:id
 */
const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findOne({
      _id: id,
      customer_id: req.user.userId
    })
      .populate('staff_id', 'full_name email phone')
      .populate('service_id', 'service_name description base_price estimated_duration category')
      .populate('cancelled_by', 'full_name');

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
 * Update appointment (Customer can only update their own pending appointments)
 * PUT /api/appointments/:id
 */
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      service_id,
      appointment_date,
      start_time,
      customer_notes,
      vehicle_info
    } = req.body;

    const appointment = await Appointment.findOne({
      _id: id,
      customer_id: req.user.userId
    });

    if (!appointment) {
      return errorResponse(res, 404, 'Appointment not found');
    }

    if (!appointment.canBeModified()) {
      return errorResponse(res, 400, 'Appointment cannot be modified in current status');
    }

    const oldValues = {
      service_id: appointment.service_id,
      appointment_date: appointment.appointment_date,
      start_time: appointment.start_time
    };

    // Verify service if being changed
    if (service_id && service_id !== appointment.service_id.toString()) {
      const service = await Service.findById(service_id);
      if (!service || !service.is_active) {
        return errorResponse(res, 404, 'Service not found or inactive');
      }
      appointment.service_id = service_id;
      appointment.estimated_duration = service.estimated_duration;
    }

    // Check appointment date/time if being changed
    if (appointment_date || start_time) {
      const newDate = appointment_date ? new Date(appointment_date) : appointment.appointment_date;
      const newTime = start_time || appointment.start_time;
      const appointmentDateTime = new Date(`${newDate.toISOString().split('T')[0]}T${newTime}`);

      if (appointmentDateTime <= new Date()) {
        return errorResponse(res, 400, 'Appointment must be scheduled for a future date and time');
      }

      // Check for conflicts (excluding current appointment)
      const conflictingAppointment = await Appointment.findOne({
        _id: { $ne: id },
        appointment_date: newDate,
        start_time: newTime,
        status: { $in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] }
      });

      if (conflictingAppointment) {
        return errorResponse(res, 409, 'This time slot is already booked');
      }

      if (appointment_date) appointment.appointment_date = newDate;
      if (start_time) appointment.start_time = start_time;
    }

    // Update other fields
    if (customer_notes !== undefined) appointment.customer_notes = customer_notes;
    if (vehicle_info !== undefined) {
      appointment.vehicle_info = { ...appointment.vehicle_info, ...vehicle_info };
    }

    await appointment.save();

    // Log audit
    await UserAudit.create({
      user_id: req.user.userId,
      action: 'APPOINTMENT_UPDATED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        appointment_id: id,
        old_values: oldValues,
        new_values: {
          service_id: appointment.service_id,
          appointment_date: appointment.appointment_date,
          start_time: appointment.start_time
        }
      }
    });

    const updatedAppointment = await Appointment.findById(id)
      .populate('staff_id', 'full_name email phone')
      .populate('service_id', 'service_name description base_price estimated_duration');

    return successResponse(res, 200, 'Appointment updated successfully', {
      appointment: updatedAppointment
    });

  } catch (error) {
    console.error('Update appointment error:', error);
    return errorResponse(res, 500, 'Failed to update appointment');
  }
};

/**
 * Cancel appointment (Customer can only cancel their own)
 * DELETE /api/appointments/:id
 */
const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const appointment = await Appointment.findOne({
      _id: id,
      customer_id: req.user.userId
    });

    if (!appointment) {
      return errorResponse(res, 404, 'Appointment not found');
    }

    if (!appointment.canBeCancelled()) {
      return errorResponse(res, 400, 'Appointment cannot be cancelled in current status');
    }

    appointment.status = 'CANCELLED';
    appointment.cancellation_reason = reason || 'Cancelled by customer';
    appointment.cancelled_by = req.user.userId;
    appointment.cancelled_at = new Date();

    await appointment.save();

    // Log audit
    await UserAudit.create({
      user_id: req.user.userId,
      action: 'APPOINTMENT_CANCELLED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
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

module.exports = {
  createAppointment,
  getMyAppointments,
  getAppointmentById,
  updateAppointment,
  cancelAppointment
};