const Appointment = require('../models/Appointment.model');
const User = require('../models/User.model');
const Notification = require('../models/Notification.model');
const Role = require('../models/Role.model');
const UserRole = require('../models/UserRole.model');
const { successResponse, errorResponse } = require('../utils/response.util');
const {
  ACTIVE_APPOINTMENT_STATUSES,
  CUSTOMER_CANCELLABLE_STATUSES,
  DEFAULT_TIMEZONE_OFFSET,
  getServicePackage
} = require('../constants/appointment.constants');

const buildAppointmentStartAt = (date, timeSlot) => {
  return new Date(`${date}T${timeSlot}:00${DEFAULT_TIMEZONE_OFFSET}`);
};

const normalizePhone = (phone) => {
  if (!phone) {
    return phone;
  }

  return phone.startsWith('+84') ? `0${phone.slice(3)}` : phone;
};

const buildDateRangeQuery = (fromDate, toDate) => {
  const range = {};

  if (fromDate) {
    range.$gte = buildAppointmentStartAt(fromDate, '00:00');
  }

  if (toDate) {
    range.$lte = buildAppointmentStartAt(toDate, '23:59');
  }

  return Object.keys(range).length ? range : null;
};

/**
 * Create customer appointment
 * POST /api/appointments
 */
const createAppointment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      service_type,
      service_package,
      repair_issue,
      issue_description,
      vehicle_brand,
      vehicle_model,
      license_plate,
      odometer,
      appointment_date,
      time_slot,
      contact_phone,
      note
    } = req.body;

    const serviceType = service_type.toUpperCase();
    const normalizedLicensePlate = license_plate.toUpperCase().replace(/\s+/g, '');
    const appointmentStartAt = buildAppointmentStartAt(appointment_date, time_slot);

    if (appointmentStartAt <= new Date()) {
      return errorResponse(res, 400, 'Appointment time must be in the future');
    }

    const user = await User.findById(userId);

    if (!user) {
      return errorResponse(res, 404, 'Customer not found');
    }

    const customerPhone = normalizePhone(contact_phone || user.phone);

    if (!customerPhone) {
      return errorResponse(res, 400, 'Contact phone is required for booking');
    }

    let servicePayload;

    if (serviceType === 'REPAIR') {
      servicePayload = {
        type: serviceType,
        name: repair_issue.trim(),
        repair_issue: repair_issue.trim(),
        issue_description,
        description: 'Repair inspection appointment',
        estimated_price: null,
        estimated_duration_minutes: 90
      };
    } else {
      const selectedPackage = getServicePackage(serviceType, service_package);

      if (!selectedPackage) {
        return errorResponse(res, 400, 'Invalid service package for selected service type');
      }

      servicePayload = {
        type: serviceType,
        package_id: service_package,
        ...selectedPackage
      };
    }

    const duplicateCustomerAppointment = await Appointment.findOne({
      customer_id: userId,
      appointment_start_at: appointmentStartAt,
      status: { $in: ACTIVE_APPOINTMENT_STATUSES }
    });

    if (duplicateCustomerAppointment) {
      return errorResponse(res, 409, 'You already have an active appointment at this time slot');
    }

    const duplicateVehicleAppointment = await Appointment.findOne({
      'vehicle.license_plate': normalizedLicensePlate,
      appointment_start_at: appointmentStartAt,
      status: { $in: ACTIVE_APPOINTMENT_STATUSES }
    });

    if (duplicateVehicleAppointment) {
      return errorResponse(res, 409, 'This vehicle already has an active appointment at this time slot');
    }

    const appointment = await Appointment.create({
      customer_id: userId,
      customer_snapshot: {
        full_name: user.full_name,
        email: user.email,
        phone: customerPhone
      },
      service: servicePayload,
      vehicle: {
        brand: vehicle_brand,
        model: vehicle_model,
        license_plate: normalizedLicensePlate,
        odometer: odometer !== undefined ? Number(odometer) : undefined
      },
      appointment_date,
      time_slot,
      appointment_start_at: appointmentStartAt,
      customer_note: note
    });

    // Create notification for Customer
    try {
      await Notification.create({
        user_id: userId,
        appointment_id: appointment._id,
        type: 'SYSTEM',
        title: 'Đặt lịch thành công',
        message: `Lịch hẹn dịch vụ ${appointment.service.name} cho xe ${appointment.vehicle.brand} ${appointment.vehicle.model} (${appointment.vehicle.license_plate}) đã được tạo thành công và đang chờ xác nhận.`,
        metadata: {
          appointment_code: appointment.appointment_code,
          appointment_date: appointment.appointment_date,
          time_slot: appointment.time_slot
        }
      });
    } catch (customerNotifErr) {
      console.error('Failed to notify customer:', customerNotifErr);
    }

    // Find and notify all Managers and Admins
    try {
      const targetRoles = await Role.find({ role_name: { $in: ['MANAGER', 'ADMIN'] } });
      const roleIds = targetRoles.map(r => r._id);
      
      if (roleIds.length > 0) {
        const staffUserRoles = await UserRole.find({ role_id: { $in: roleIds } }).select('user_id');
        const staffUserIds = [...new Set(staffUserRoles.map(ur => String(ur.user_id)))];
        
        const staffNotifications = staffUserIds.map(staffId => ({
          user_id: staffId,
          appointment_id: appointment._id,
          type: 'SYSTEM',
          title: 'Lịch hẹn mới từ khách hàng',
          message: `Khách hàng ${user.full_name} đã đặt lịch mới cho xe ${appointment.vehicle.brand} ${appointment.vehicle.model} (${appointment.vehicle.license_plate}) vào lúc ${appointment.time_slot} ngày ${appointment.appointment_date}.`,
          metadata: {
            appointment_code: appointment.appointment_code,
            appointment_date: appointment.appointment_date,
            time_slot: appointment.time_slot
          }
        }));
        
        if (staffNotifications.length > 0) {
          await Notification.insertMany(staffNotifications);
        }
      }
    } catch (notifError) {
      console.error('Failed to notify managers and admins:', notifError);
    }


    return successResponse(res, 201, 'Appointment created successfully', {
      appointment: appointment.toSafeObject()
    });

  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 409, 'Appointment code already exists. Please try again.');
    }

    console.error('Create appointment error:', error);
    return errorResponse(res, 500, 'Failed to create appointment');
  }
};

/**
 * Get current customer's appointments
 * GET /api/appointments/my
 */
const getMyAppointments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = { customer_id: userId };

    if (req.query.status) {
      query.status = req.query.status.toUpperCase();
    }

    const dateRange = buildDateRangeQuery(req.query.from_date, req.query.to_date);

    if (dateRange) {
      query.appointment_start_at = dateRange;
    }

    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .sort({ appointment_start_at: -1, created_at: -1 })
        .limit(limit)
        .skip(skip)
        .select('-__v'),
      Appointment.countDocuments(query)
    ]);

    return successResponse(res, 200, 'Appointments retrieved successfully', {
      appointments,
      pagination: {
        page,
        limit,
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
 * Get current customer's appointment detail
 * GET /api/appointments/:id
 */
const getMyAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      customer_id: req.user.userId
    }).select('-__v');

    if (!appointment) {
      return errorResponse(res, 404, 'Appointment not found');
    }

    return successResponse(res, 200, 'Appointment retrieved successfully', {
      appointment
    });

  } catch (error) {
    console.error('Get appointment detail error:', error);
    return errorResponse(res, 500, 'Failed to retrieve appointment');
  }
};

/**
 * Cancel current customer's appointment
 * PATCH /api/appointments/:id/cancel
 */
const cancelMyAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      customer_id: req.user.userId
    });

    if (!appointment) {
      return errorResponse(res, 404, 'Appointment not found');
    }

    if (!CUSTOMER_CANCELLABLE_STATUSES.includes(appointment.status)) {
      return errorResponse(res, 400, `Only ${CUSTOMER_CANCELLABLE_STATUSES.join(', ')} appointments can be cancelled by customer`);
    }

    if (appointment.appointment_start_at <= new Date()) {
      return errorResponse(res, 400, 'Cannot cancel an appointment after its start time');
    }

    appointment.status = 'CANCELLED';
    appointment.cancel_reason = req.body.cancel_reason;
    appointment.cancelled_at = new Date();

    await appointment.save();

    return successResponse(res, 200, 'Appointment cancelled successfully', {
      appointment: appointment.toSafeObject()
    });

  } catch (error) {
    console.error('Cancel appointment error:', error);
    return errorResponse(res, 500, 'Failed to cancel appointment');
  }
};

module.exports = {
  createAppointment,
  getMyAppointments,
  getMyAppointmentById,
  cancelMyAppointment
};
