const Appointment = require('../models/Appointment.model');
const Service = require('../models/Service.model');
const User = require('../models/User.model');
const UserAudit = require('../models/UserAudit.model');
const RepairBay = require('../models/RepairBay.model');
const Notification = require('../models/Notification.model');
const { successResponse, errorResponse } = require('../utils/response.util');
const { sendAppointmentConfirmedEmail } = require('../utils/email.util');
const { notifyStaffAssigned } = require('../utils/staffNotification.util');
const {
  assignAppointment,
  buildDateTime,
  calculateServiceDuration,
  checkRepairBayAvailability,
  checkTechnicianAvailability,
  completeAppointment,
  listTechnicians,
  startAppointment
} = require('../services/appointment-scheduling.service');
const { validateAppointmentTransition } = require('../utils/appointmentStateMachine');

const getDocumentId = (value) => value?._id || value;

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

    // Date range filter (appointment_date is YYYY-MM-DD string)
    if (date_from || date_to) {
      query.appointment_date = {};
      if (date_from) {
        query.appointment_date.$gte = String(date_from).slice(0, 10);
      }
      if (date_to) {
        query.appointment_date.$lte = String(date_to).slice(0, 10);
      }
    }

    const skip = (page - 1) * limit;
    const sortOrder = sort_order === 'asc' ? 1 : -1;

    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .populate('customer_id', 'full_name email phone')
        .populate('staff_id', 'full_name email')
        .populate('service_id', 'service_name base_price estimated_duration')
        .populate('repair_bay_id', 'name code location')
        .populate('assignment_id')
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
      .populate('staff_id', 'full_name email phone specialization')
      .populate('service_id', 'service_name description base_price estimated_duration category')
      .populate('repair_bay_id', 'name code location equipment status')
      .populate('assignment_id')
      .populate('acknowledged_by', 'full_name email')
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
      .populate('staff_id', 'full_name email phone specialization')
      .populate('service_id', 'service_name description base_price estimated_duration category')
      .populate('repair_bay_id', 'name code location equipment status')
      .populate('assignment_id')
      .populate('acknowledged_by', 'full_name email');

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

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return errorResponse(res, 404, 'Appointment not found');
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
    }

    if (transition.target === 'CONFIRMED' && !appointment.confirmed_at) {
      appointment.confirmed_at = new Date();
    }

    if (transition.target === 'CANCELLED' && !appointment.cancelled_at) {
      appointment.cancelled_at = new Date();
      appointment.cancelled_by = req.user.userId;
    }

    if (transition.target === 'NO_SHOW' && !appointment.actual_end_time) {
      appointment.actual_end_time = new Date();
    }

    if (notes) {
      appointment.staff_notes = notes;
    }

    await appointment.save();

    const populatedAppointment = await Appointment.findById(id)
      .populate('customer_id', 'full_name email phone avatar_url')
      .populate('staff_id', 'full_name email phone specialization')
      .populate('service_id', 'service_name description base_price estimated_duration category')
      .populate('repair_bay_id', 'name code location equipment status')
      .populate('assignment_id')
      .populate('acknowledged_by', 'full_name email')
      .populate('cancelled_by', 'full_name email');

    const customerId = populatedAppointment.customer_id?._id || populatedAppointment.customer_id || appointment.customer_id;
    const appointmentCode = populatedAppointment.appointment_code || populatedAppointment._id;

    if (transition.target === 'CONFIRMED') {
      const customer = populatedAppointment.customer_id || populatedAppointment.customer_snapshot || {};
      const service = populatedAppointment.service_id || populatedAppointment.service || {};

      await Notification.create({
        user_id: customerId,
        appointment_id: populatedAppointment._id,
        type: 'APPOINTMENT_CONFIRMED',
        title: 'Lịch hẹn đã được xác nhận',
        message: `Lịch hẹn ${appointmentCode} đã được xác nhận. Nhân viên garage sẽ sớm thông báo các vấn đề về xe và thông tin chi tiết sau khi tiếp nhận/kiểm tra.`,
        metadata: {
          appointment_code: appointmentCode,
          appointment_date: populatedAppointment.appointment_date,
          start_time: populatedAppointment.start_time || populatedAppointment.time_slot
        }
      });

      sendAppointmentConfirmedEmail(customer.email, customer.full_name, {
        appointment_code: appointmentCode,
        appointment_date: populatedAppointment.appointment_date,
        start_time: populatedAppointment.start_time || populatedAppointment.time_slot,
        service_name: service.service_name || service.name || populatedAppointment.service?.name,
        vehicle: populatedAppointment.vehicle || populatedAppointment.vehicle_info
      }).catch((emailError) => {
        console.error('Failed to send appointment confirmation email:', emailError);
      });
    } else if (transition.target === 'IN_PROGRESS') {
      await Notification.create({
        user_id: customerId,
        appointment_id: populatedAppointment._id,
        type: 'APPOINTMENT_UPDATED',
        title: 'Xe của bạn đang được sửa chữa',
        message: `Lịch hẹn ${appointmentCode} của bạn đã bắt đầu được xử lý. Kỹ thuật viên đang tiến hành sửa chữa/bảo dưỡng.`,
        metadata: {
          appointment_code: appointmentCode,
          status: 'IN_PROGRESS'
        }
      });
    } else if (transition.target === 'COMPLETED') {
      await Notification.create({
        user_id: customerId,
        appointment_id: populatedAppointment._id,
        type: 'APPOINTMENT_UPDATED',
        title: 'Dịch vụ hoàn thành',
        message: `Xe của bạn cho lịch hẹn ${appointmentCode} đã hoàn tất sửa chữa/bảo dưỡng. Bạn có thể đến garage nhận xe và thanh toán.`,
        metadata: {
          appointment_code: appointmentCode,
          status: 'COMPLETED'
        }
      });
    } else if (transition.target === 'CANCELLED') {
      await Notification.create({
        user_id: customerId,
        appointment_id: populatedAppointment._id,
        type: 'APPOINTMENT_UPDATED',
        title: 'Lịch hẹn đã bị hủy',
        message: `Lịch hẹn ${appointmentCode} đã bị hủy. Lý do: ${populatedAppointment.cancellation_reason || 'Hủy từ phía quản trị viên'}.`,
        metadata: {
          appointment_code: appointmentCode,
          status: 'CANCELLED'
        }
      });
    }

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
      appointment: populatedAppointment
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

    // Create notification for Customer
    try {
      const appointmentCode = appointment.appointment_code || appointment._id;
      await Notification.create({
        user_id: appointment.customer_id,
        appointment_id: appointment._id,
        type: 'APPOINTMENT_UPDATED',
        title: 'Lịch hẹn đã bị hủy',
        message: `Lịch hẹn ${appointmentCode} đã bị hủy. Lý do: ${appointment.cancellation_reason}.`,
        metadata: {
          appointment_code: appointmentCode,
          status: 'CANCELLED'
        }
      });
    } catch (notifErr) {
      console.error('Failed to create cancellation notification:', notifErr);
    }

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

    if (appointment.status !== 'CONFIRMED') {
      return errorResponse(res, 400, 'Appointment must be confirmed before assigning staff');
    }

    // Verify staff exists and has STAFF role
    const staff = await User.findById(staff_id);
    if (!staff) {
      return errorResponse(res, 404, 'Staff not found');
    }

    const oldStaffId = appointment.staff_id;
    appointment.staff_id = staff_id;
    appointment.assigned_at = new Date();

    await appointment.save();

    await notifyStaffAssigned(appointment, staff_id, {
      previousStaffId: oldStaffId
    });

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
 * Assign technician and repair bay to appointment
 * PUT /api/admin/appointments/:id/assign
 */
const assignAppointmentHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { technician_id, repair_bay_id, notes } = req.body;
    const force = req.body.force === true || req.body.force === 'true';

    const currentAppointment = await Appointment.findById(id);
    if (!currentAppointment) {
      return errorResponse(res, 404, 'Appointment not found');
    }

    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(currentAppointment.status)) {
      return errorResponse(res, 422, 'Appointment đã kết thúc, không thể phân công');
    }

    const alreadyAssigned = Boolean(currentAppointment.assignment_id || currentAppointment.staff_id);
    if (alreadyAssigned && ['CONFIRMED', 'IN_PROGRESS'].includes(currentAppointment.status)) {
      if (currentAppointment.status === 'IN_PROGRESS' || force !== true) {
        return errorResponse(
          res,
          currentAppointment.status === 'IN_PROGRESS' ? 422 : 409,
          currentAppointment.status === 'IN_PROGRESS'
            ? 'Không thể phân công lại appointment đang xử lý'
            : 'Appointment đã được phân công. Hãy huỷ phân công hiện tại trước khi phân công lại'
        );
      }
    }

    const appointment = await assignAppointment({
      appointmentId: id,
      technicianId: technician_id,
      repairBayId: repair_bay_id,
      assignedBy: req.user.userId,
      notes,
      force
    });

    await UserAudit.create({
      user_id: getDocumentId(appointment.customer_id),
      action: alreadyAssigned && force === true ? 'APPOINTMENT_REASSIGNED' : 'APPOINTMENT_ASSIGNED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        assigned_by: req.user.userId,
        appointment_id: id,
        technician_id,
        repair_bay_id,
        force: Boolean(force),
        previous_staff_id: currentAppointment.staff_id,
        previous_repair_bay_id: currentAppointment.repair_bay_id,
        previous_assignment_id: currentAppointment.assignment_id
      }
    });

    return successResponse(res, 200, 'Appointment assigned successfully', {
      appointment
    });
  } catch (error) {
    console.error('Assign appointment error:', error);
    return errorResponse(res, error.statusCode || 500, error.message || 'Failed to assign appointment', error.details);
  }
};

/**
 * Start appointment work
 * PUT /api/admin/appointments/:id/start
 */
const startAppointmentHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await startAppointment(id, req.user.userId);

    try {
      const appointmentCode = appointment.appointment_code || appointment._id;
      const customerId = getDocumentId(appointment.customer_id);
      await Notification.create({
        user_id: customerId,
        appointment_id: appointment._id,
        type: 'APPOINTMENT_UPDATED',
        title: 'Xe của bạn đang được sửa chữa',
        message: `Lịch hẹn ${appointmentCode} của bạn đã bắt đầu được xử lý. Kỹ thuật viên đang tiến hành sửa chữa/bảo dưỡng.`,
        metadata: {
          appointment_code: appointmentCode,
          status: 'IN_PROGRESS'
        }
      });
    } catch (notifErr) {
      console.error('Failed to create start work notification:', notifErr);
    }

    await UserAudit.create({
      user_id: getDocumentId(appointment.customer_id),
      action: 'APPOINTMENT_STARTED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        updated_by: req.user.userId,
        appointment_id: id
      }
    });

    return successResponse(res, 200, 'Appointment started successfully', {
      appointment
    });
  } catch (error) {
    console.error('Start appointment error:', error);
    return errorResponse(res, error.statusCode || 500, error.message || 'Failed to start appointment');
  }
};

/**
 * Complete appointment work
 * PUT /api/admin/appointments/:id/complete
 */
const completeAppointmentHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { final_cost, completion_notes } = req.body;
    const appointment = await completeAppointment(id, {
      finalCost: final_cost,
      completionNotes: completion_notes
    });

    try {
      const appointmentCode = appointment.appointment_code || appointment._id;
      const customerId = getDocumentId(appointment.customer_id);
      await Notification.create({
        user_id: customerId,
        appointment_id: appointment._id,
        type: 'APPOINTMENT_UPDATED',
        title: 'Dịch vụ hoàn thành',
        message: `Xe của bạn cho lịch hẹn ${appointmentCode} đã hoàn tất sửa chữa/bảo dưỡng. Bạn có thể đến garage nhận xe và thanh toán.`,
        metadata: {
          appointment_code: appointmentCode,
          status: 'COMPLETED'
        }
      });
    } catch (notifErr) {
      console.error('Failed to create completion notification:', notifErr);
    }

    await UserAudit.create({
      user_id: getDocumentId(appointment.customer_id),
      action: 'APPOINTMENT_COMPLETED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        updated_by: req.user.userId,
        appointment_id: id,
        final_cost
      }
    });

    return successResponse(res, 200, 'Appointment completed successfully', {
      appointment
    });
  } catch (error) {
    console.error('Complete appointment error:', error);
    return errorResponse(res, error.statusCode || 500, error.message || 'Failed to complete appointment');
  }
};

const getTechnicians = async (req, res) => {
  try {
    const technicians = await listTechnicians();
    return successResponse(res, 200, 'Technicians retrieved successfully', {
      technicians
    });
  } catch (error) {
    console.error('Get technicians error:', error);
    return errorResponse(res, 500, 'Failed to retrieve technicians');
  }
};

const getTechnicianAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { appointment_id, start_time, end_time, date, duration_minutes } = req.query;

    let startDateTime;
    let endDateTime;

    if (appointment_id) {
      const appointment = await Appointment.findById(appointment_id);
      if (!appointment) return errorResponse(res, 404, 'Appointment not found');
      startDateTime = appointment.appointment_start_at || buildDateTime(appointment.appointment_date, appointment.start_time || appointment.time_slot);
      const duration = await calculateServiceDuration(appointment);
      endDateTime = appointment.estimated_end_time || new Date(startDateTime.getTime() + duration * 60000);
    } else {
      startDateTime = buildDateTime(date, start_time);
      if (startDateTime) {
        endDateTime = end_time
          ? buildDateTime(date, end_time)
          : new Date(startDateTime.getTime() + Number(duration_minutes || 60) * 60000);
      }
    }

    if (!startDateTime || !endDateTime) {
      return errorResponse(res, 400, 'Valid appointment_id or date/start_time is required');
    }

    const availability = await checkTechnicianAvailability(id, startDateTime, endDateTime, appointment_id);

    return successResponse(res, 200, 'Technician availability retrieved successfully', {
      availability
    });
  } catch (error) {
    console.error('Get technician availability error:', error);
    return errorResponse(res, 500, 'Failed to check technician availability');
  }
};

const getRepairBays = async (req, res) => {
  try {
    const { include_inactive = 'false' } = req.query;
    const query = include_inactive === 'true' ? {} : { is_active: true };
    const repairBays = await RepairBay.find(query).sort({ code: 1 });

    return successResponse(res, 200, 'Repair bays retrieved successfully', {
      repair_bays: repairBays
    });
  } catch (error) {
    console.error('Get repair bays error:', error);
    return errorResponse(res, 500, 'Failed to retrieve repair bays');
  }
};

const createRepairBay = async (req, res) => {
  try {
    const repairBay = await RepairBay.create(req.body);
    return successResponse(res, 201, 'Repair bay created successfully', {
      repair_bay: repairBay
    });
  } catch (error) {
    console.error('Create repair bay error:', error);
    return errorResponse(res, 500, error.message || 'Failed to create repair bay');
  }
};

const updateRepairBay = async (req, res) => {
  try {
    const repairBay = await RepairBay.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!repairBay) return errorResponse(res, 404, 'Repair bay not found');

    return successResponse(res, 200, 'Repair bay updated successfully', {
      repair_bay: repairBay
    });
  } catch (error) {
    console.error('Update repair bay error:', error);
    return errorResponse(res, 500, error.message || 'Failed to update repair bay');
  }
};

const deleteRepairBay = async (req, res) => {
  try {
    const repairBay = await RepairBay.findByIdAndUpdate(req.params.id, { is_active: false }, { new: true });
    if (!repairBay) return errorResponse(res, 404, 'Repair bay not found');

    return successResponse(res, 200, 'Repair bay deactivated successfully', {
      repair_bay: repairBay
    });
  } catch (error) {
    console.error('Delete repair bay error:', error);
    return errorResponse(res, 500, 'Failed to deactivate repair bay');
  }
};

const getRepairBayAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { appointment_id, start_time, end_time, date, duration_minutes } = req.query;

    let startDateTime;
    let endDateTime;

    if (appointment_id) {
      const appointment = await Appointment.findById(appointment_id);
      if (!appointment) return errorResponse(res, 404, 'Appointment not found');
      startDateTime = appointment.appointment_start_at || buildDateTime(appointment.appointment_date, appointment.start_time || appointment.time_slot);
      const duration = await calculateServiceDuration(appointment);
      endDateTime = appointment.estimated_end_time || new Date(startDateTime.getTime() + duration * 60000);
    } else {
      startDateTime = buildDateTime(date, start_time);
      if (startDateTime) {
        endDateTime = end_time
          ? buildDateTime(date, end_time)
          : new Date(startDateTime.getTime() + Number(duration_minutes || 60) * 60000);
      }
    }

    if (!startDateTime || !endDateTime) {
      return errorResponse(res, 400, 'Valid appointment_id or date/start_time is required');
    }

    const availability = await checkRepairBayAvailability(id, startDateTime, endDateTime, appointment_id);

    return successResponse(res, 200, 'Repair bay availability retrieved successfully', {
      availability
    });
  } catch (error) {
    console.error('Get repair bay availability error:', error);
    return errorResponse(res, 500, 'Failed to check repair bay availability');
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
      Appointment.countDocuments({ status: { $in: ['IN_PROGRESS', 'WAITING_PARTS'] } }),
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

    // Group by date (YYYY-MM-DD string, or legacy Date values)
    const calendar = {};
    appointments.forEach(apt => {
      const raw = apt.appointment_date;
      const dateKey = raw instanceof Date
        ? raw.toISOString().slice(0, 10)
        : String(raw || '').slice(0, 10);
      if (!dateKey) return;
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

/**
 * Manager soạn nội dung và gửi thông báo in-app cho khách về phụ tùng cần nhập.
 * POST /api/manager/appointments/:id/parts-hold/notify-customer
 */
const notifyPartsHoldCustomer = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('customer_id', 'full_name phone email')
      .populate('staff_id', 'full_name');

    if (!appointment) {
      return errorResponse(res, 404, 'Appointment not found');
    }

    if (appointment.status !== 'WAITING_PARTS' || !appointment.parts_hold?.status) {
      return errorResponse(res, 422, 'Lịch hẹn không đang chờ phụ tùng');
    }

    const holdStatus = String(appointment.parts_hold.status || '').toUpperCase();
    if (!['PENDING_MANAGER', 'PENDING_CONSENT'].includes(holdStatus)) {
      return errorResponse(res, 422, 'Yêu cầu chờ phụ tùng đã được xử lý trước đó');
    }

    const customerMessage = String(req.body.customer_message || req.body.message || '').trim();
    if (!customerMessage) {
      return errorResponse(res, 400, 'Nhập nội dung thông báo gửi khách');
    }
    if (customerMessage.length > 500) {
      return errorResponse(res, 400, 'Nội dung thông báo không quá 500 ký tự');
    }

    let etaDays = appointment.parts_hold.eta_days || null;
    if (req.body.eta_days !== undefined && req.body.eta_days !== null && req.body.eta_days !== '') {
      etaDays = Number(req.body.eta_days);
      if (!Number.isInteger(etaDays) || etaDays < 1 || etaDays > 90) {
        return errorResponse(res, 400, 'ETA phải từ 1 đến 90 ngày');
      }
    }

    let estimatedCost = appointment.parts_hold.estimated_cost;
    if (estimatedCost === undefined) estimatedCost = null;
    if (req.body.estimated_cost !== undefined && req.body.estimated_cost !== null && req.body.estimated_cost !== '') {
      estimatedCost = Number(req.body.estimated_cost);
      if (!Number.isFinite(estimatedCost) || estimatedCost < 0) {
        return errorResponse(res, 400, 'Chi phí dự kiến không hợp lệ');
      }
    } else if (req.body.estimated_cost === null || req.body.estimated_cost === '') {
      estimatedCost = null;
    }

    const contactNote = String(req.body.contact_note || req.body.note || '').trim();
    const now = new Date();
    const code = appointment.appointment_code || appointment._id;
    const partsList = (appointment.parts_hold.items || [])
      .map((item) => `${item.name} x${item.quantity || 1}`)
      .join(', ');

    appointment.parts_hold.customer_message = customerMessage;
    appointment.parts_hold.eta_days = etaDays;
    appointment.parts_hold.estimated_cost = estimatedCost;
    appointment.parts_hold.status = 'PENDING_CONSENT';
    if (!appointment.parts_hold.consent) {
      appointment.parts_hold.consent = {
        status: 'PENDING',
        responded_at: null,
        note: '',
        contacted_by: null
      };
    } else {
      appointment.parts_hold.consent.status = 'PENDING';
    }
    if (contactNote) {
      appointment.parts_hold.consent.note = contactNote;
      appointment.parts_hold.consent.contacted_by = req.user.userId;
    }

    await appointment.save();

    const Notification = require('../models/Notification.model');
    const customerId = appointment.customer_id?._id || appointment.customer_id;

    if (customerId) {
      try {
        await Notification.create({
          user_id: customerId,
          appointment_id: appointment._id,
          type: 'APPOINTMENT_UPDATED',
          title: 'Garage thông báo về phụ tùng cần nhập',
          message: `Lịch ${code}: ${customerMessage}${partsList ? ` (Thiếu: ${partsList})` : ''}${etaDays ? ` — dự kiến ~${etaDays} ngày.` : ''} Vào chi tiết lịch hẹn để xác nhận đồng ý chờ hàng.`,
          metadata: {
            kind: 'PARTS_HOLD_CUSTOMER_NOTIFY',
            appointment_id: String(appointment._id),
            appointment_code: code,
            eta_days: etaDays,
            estimated_cost: estimatedCost,
            parts: appointment.parts_hold.items || []
          }
        });
      } catch (err) {
        console.warn('Parts hold customer notify failed:', err.message);
      }
    }

    if (appointment.staff_id) {
      const staffId = appointment.staff_id._id || appointment.staff_id;
      try {
        await Notification.create({
          user_id: staffId,
          appointment_id: appointment._id,
          type: 'APPOINTMENT_UPDATED',
          title: 'Manager đã thông báo khách về phụ tùng',
          message: `Lịch ${code}: Manager đã gửi thông báo cho khách về phụ tùng thiếu.`,
          metadata: {
            kind: 'PARTS_HOLD_MANAGER_NOTIFIED_CUSTOMER',
            appointment_code: code
          }
        });
      } catch (err) {
        console.warn('Parts hold staff notify failed:', err.message);
      }
    }

    return successResponse(res, 200, 'Đã gửi thông báo cho khách về phụ tùng cần nhập', {
      appointment
    });
  } catch (error) {
    console.error('Notify parts hold customer error:', error);
    return errorResponse(res, 500, 'Không thể gửi thông báo cho khách');
  }
};

/**
 * Manager contacts customer about waiting for parts, then records APPROVED/DECLINED.
 * POST /api/manager/appointments/:id/parts-hold/contact-result
 */
const recordPartsHoldContactResult = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('customer_id', 'full_name phone')
      .populate('staff_id', 'full_name');

    if (!appointment) {
      return errorResponse(res, 404, 'Appointment not found');
    }

    if (appointment.status !== 'WAITING_PARTS' || !appointment.parts_hold?.status) {
      return errorResponse(res, 422, 'Lịch hẹn không đang chờ phụ tùng');
    }

    const holdStatus = String(appointment.parts_hold.status || '').toUpperCase();
    if (!['PENDING_MANAGER', 'PENDING_CONSENT'].includes(holdStatus)) {
      return errorResponse(res, 422, 'Yêu cầu chờ phụ tùng đã được xử lý trước đó');
    }

    const decision = String(req.body.decision || '').toUpperCase();
    if (!['APPROVED', 'DECLINED'].includes(decision)) {
      return errorResponse(res, 400, 'decision must be APPROVED or DECLINED');
    }

    const contactNote = String(req.body.contact_note || req.body.note || '').trim();
    const customerMessage = String(req.body.customer_message || '').trim();

    let etaDays = appointment.parts_hold.eta_days || null;
    if (req.body.eta_days !== undefined && req.body.eta_days !== null && req.body.eta_days !== '') {
      etaDays = Number(req.body.eta_days);
      if (!Number.isInteger(etaDays) || etaDays < 1 || etaDays > 90) {
        return errorResponse(res, 400, 'ETA phải từ 1 đến 90 ngày');
      }
    }

    let estimatedCost = appointment.parts_hold.estimated_cost;
    if (estimatedCost === undefined) estimatedCost = null;
    if (req.body.estimated_cost !== undefined && req.body.estimated_cost !== null && req.body.estimated_cost !== '') {
      estimatedCost = Number(req.body.estimated_cost);
      if (!Number.isFinite(estimatedCost) || estimatedCost < 0) {
        return errorResponse(res, 400, 'Chi phí dự kiến không hợp lệ');
      }
    }

    const now = new Date();
    const code = appointment.appointment_code || appointment._id;
    const partsList = (appointment.parts_hold.items || [])
      .map((item) => `${item.name} x${item.quantity || 1}`)
      .join(', ');

    if (customerMessage) {
      appointment.parts_hold.customer_message = customerMessage;
    }
    appointment.parts_hold.eta_days = etaDays;
    appointment.parts_hold.estimated_cost = estimatedCost;
    appointment.parts_hold.consent = {
      status: decision,
      responded_at: now,
      note: contactNote,
      contacted_by: req.user.userId
    };
    appointment.parts_hold.status = decision === 'APPROVED' ? 'APPROVED' : 'DECLINED';

    if (decision === 'DECLINED') {
      appointment.status = 'IN_PROGRESS';
      appointment.repair_log = {
        status: null,
        notes: contactNote || 'Manager đã liên hệ: khách từ chối chờ phụ tùng',
        completed_at: null
      };
    }

    await appointment.save();

    const Notification = require('../models/Notification.model');

    // Thông báo staff
    if (appointment.staff_id) {
      const staffId = appointment.staff_id._id || appointment.staff_id;
      try {
        await Notification.create({
          user_id: staffId,
          appointment_id: appointment._id,
          type: 'APPOINTMENT_UPDATED',
          title: decision === 'APPROVED'
            ? 'Manager: khách đồng ý chờ phụ tùng'
            : 'Manager: khách từ chối chờ phụ tùng',
          message: decision === 'APPROVED'
            ? `Lịch ${code}: Manager đã gọi khách — đồng ý chờ${etaDays ? ` ~${etaDays} ngày` : ''}. Khi hàng về Manager nhập kho rồi mở lại sửa chữa.`
            : `Lịch ${code}: Manager đã gọi khách — từ chối chờ hàng. Tiếp tục xử lý (không dùng phụ tùng / trả xe).`,
          metadata: {
            kind: 'PARTS_HOLD_MANAGER_RESULT',
            decision,
            appointment_code: code
          }
        });
      } catch (err) {
        console.warn('Parts hold staff notify failed:', err.message);
      }
    }

    // Thông báo khách (sau khi Manager đã liên hệ)
    const customerId = appointment.customer_id?._id || appointment.customer_id;
    const finalCustomerMessage = appointment.parts_hold.customer_message || '';
    if (customerId) {
      try {
        await Notification.create({
          user_id: customerId,
          appointment_id: appointment._id,
          type: 'APPOINTMENT_UPDATED',
          title: decision === 'APPROVED' ? 'Garage sẽ chờ phụ tùng cho xe của bạn' : 'Cập nhật: không chờ phụ tùng',
          message: decision === 'APPROVED'
            ? (finalCustomerMessage
              || `Lịch ${code}: garage đã trao đổi với bạn và sẽ chờ phụ tùng (${partsList || 'đang đặt hàng'})${etaDays ? `, khoảng ${etaDays} ngày` : ''}.`)
            : `Lịch ${code}: theo trao đổi với garage, xe sẽ được xử lý mà không chờ phụ tùng thiếu.`,
          metadata: {
            kind: 'PARTS_HOLD_CUSTOMER_UPDATE',
            decision,
            appointment_code: code
          }
        });
      } catch (err) {
        console.warn('Parts hold customer notify failed:', err.message);
      }
    }

    return successResponse(res, 200, decision === 'APPROVED'
      ? 'Đã ghi nhận: khách đồng ý chờ phụ tùng'
      : 'Đã ghi nhận: khách từ chối chờ phụ tùng', {
      appointment
    });
  } catch (error) {
    console.error('Record parts hold contact result error:', error);
    return errorResponse(res, 500, 'Không thể lưu kết quả liên hệ khách');
  }
};

const markPartsReady = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return errorResponse(res, 404, 'Appointment not found');

    if (appointment.status !== 'WAITING_PARTS') {
      return errorResponse(res, 422, 'Chỉ mở lại sửa chữa khi lịch đang chờ phụ tùng');
    }

    const consentStatus = appointment.parts_hold?.consent?.status;
    if (consentStatus === 'DECLINED') {
      return errorResponse(res, 422, 'Khách đã từ chối chờ hàng.');
    }
    if (consentStatus !== 'APPROVED') {
      return errorResponse(res, 422, 'Chưa xác nhận khách đồng ý chờ phụ tùng');
    }

    const now = new Date();
    const notes = String(req.body.notes || 'Manager đã nhập kho — mở lại sửa chữa').trim();
    appointment.status = 'IN_PROGRESS';
    if (appointment.parts_hold) {
      appointment.parts_hold.status = 'READY';
      appointment.parts_hold.ready_at = now;
      appointment.parts_hold.ready_by = req.user.userId;
    }
    appointment.repair_log = {
      status: null,
      notes,
      completed_at: null
    };
    await appointment.save();

    try {
      await UserAudit.create({
        user_id: req.user.userId,
        action: 'APPOINTMENT_PARTS_READY',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        status: 'SUCCESS',
        metadata: {
          appointment_id: appointment._id,
          by: 'MANAGER'
        }
      });
    } catch (auditError) {
      console.warn('Parts ready audit failed:', auditError.message);
    }

    const Notification = require('../models/Notification.model');
    const code = appointment.appointment_code || appointment._id;

    try {
      await Notification.create({
        user_id: appointment.customer_id,
        appointment_id: appointment._id,
        type: 'APPOINTMENT_UPDATED',
        title: 'Phụ tùng đã về — tiếp tục sửa xe',
        message: `Lịch ${code}: phụ tùng đã sẵn sàng. Garage sẽ tiếp tục sửa chữa.`,
        metadata: {
          kind: 'PARTS_HOLD_READY',
          appointment_code: code,
          status: 'IN_PROGRESS'
        }
      });
    } catch (notifyError) {
      console.warn('Parts ready customer notify failed:', notifyError.message);
    }

    if (appointment.staff_id) {
      const staffId = appointment.staff_id._id || appointment.staff_id;
      try {
        await Notification.create({
          user_id: staffId,
          appointment_id: appointment._id,
          type: 'APPOINTMENT_UPDATED',
          title: 'Manager đã nhập kho — lấy phụ tùng và sửa',
          message: `Lịch ${code}: hàng đã nhập kho. Hãy chọn phụ tùng từ kho và tiếp tục sửa chữa.`,
          metadata: {
            kind: 'PARTS_HOLD_READY',
            appointment_id: String(appointment._id),
            appointment_code: code,
            status: 'IN_PROGRESS'
          }
        });
      } catch (notifyError) {
        console.warn('Parts ready staff notify failed:', notifyError.message);
      }
    }

    return successResponse(res, 200, 'Đã mở lại sửa chữa sau khi nhập kho', {
      appointment
    });
  } catch (error) {
    console.error('Mark parts ready error:', error);
    return errorResponse(res, 500, 'Không thể mở lại sửa chữa');
  }
};

module.exports = {
  getAllAppointments,
  getAppointmentById,
  updateAppointment,
  updateAppointmentStatus,
  cancelAppointment,
  assignStaff,
  assignAppointmentHandler,
  startAppointmentHandler,
  completeAppointmentHandler,
  getTechnicians,
  getTechnicianAvailability,
  getRepairBays,
  createRepairBay,
  updateRepairBay,
  deleteRepairBay,
  getRepairBayAvailability,
  getAppointmentStatistics,
  getAppointmentCalendar,
  notifyPartsHoldCustomer,
  recordPartsHoldContactResult,
  markPartsReady
};
