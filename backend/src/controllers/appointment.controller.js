const Appointment = require('../models/Appointment.model');
const User = require('../models/User.model');
const Notification = require('../models/Notification.model');
const Role = require('../models/Role.model');
const UserRole = require('../models/UserRole.model');
const InventoryTransaction = require('../models/InventoryTransaction.model');
const Service = require('../models/Service.model');
const { successResponse, errorResponse } = require('../utils/response.util');
const {
  ACTIVE_APPOINTMENT_STATUSES,
  CUSTOMER_CANCELLABLE_STATUSES,
  DEFAULT_TIMEZONE_OFFSET,
  getServicePackage
} = require('../constants/appointment.constants');

const BOOKING_TYPE_BY_CATEGORY = {
  WASH_CARE: 'WASH',
  MAINTENANCE: 'MAINTENANCE'
};

const mapCategoryToBookingType = (category = '') => {
  return BOOKING_TYPE_BY_CATEGORY[String(category).toUpperCase()] || 'REPAIR';
};

const buildServicePayloadFromCatalog = (catalogService, serviceType, { repair_issue, issue_description } = {}) => {
  const priceType = String(catalogService.price_type || 'FIXED').toUpperCase();
  const name = catalogService.service_name;

  // REPAIR: công luôn báo giá sau kiểm tra (staff). base_price trên catalog chỉ là gợi ý.
  const estimatedPrice =
    serviceType === 'REPAIR' || priceType === 'QUOTE'
      ? null
      : Number(catalogService.base_price) || 0;

  const payload = {
    type: serviceType,
    name,
    description: catalogService.description || '',
    estimated_price: estimatedPrice,
    estimated_duration_minutes: Number(catalogService.estimated_duration) || 60
  };

  if (serviceType === 'REPAIR') {
    const issueName = (repair_issue && String(repair_issue).trim()) || name;
    payload.repair_issue = issueName.slice(0, 100);
    if (issue_description) {
      payload.issue_description = issue_description;
    }
  }

  return payload;
};

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

const maskCustomerName = (fullName = '') => {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return 'Khách hàng MOTOCORE';
  if (parts.length === 1) return `${parts[0].slice(0, 1)}***`;
  return `${parts[0]} ${parts[parts.length - 1].slice(0, 1)}.`;
};

/**
 * Public customer reviews for homepage
 * GET /api/appointments/reviews
 */
const getPublicReviews = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 30);

    const appointments = await Appointment.find({
      'review.rating': { $gte: 1, $lte: 5 },
      status: { $in: ['COMPLETED', 'PAID'] }
    })
      .sort({ 'review.created_at': -1, updated_at: -1 })
      .limit(limit)
      .select('review service customer_snapshot vehicle vehicle_info appointment_code')
      .lean();

    const reviews = appointments
      .map((item) => {
        const rating = Number(item.review?.rating) || 0;
        if (rating < 1 || rating > 5) return null;

        const serviceName =
          item.service?.name ||
          item.service?.service_package ||
          item.service?.type ||
          'Dịch vụ garage';
        const vehicleBrand = item.vehicle?.brand || item.vehicle_info?.brand || '';
        const vehicleModel = item.vehicle?.model || item.vehicle_info?.model || '';

        return {
          id: String(item._id),
          rating,
          comment: String(item.review?.comment || '').trim(),
          created_at: item.review?.created_at || null,
          customer_name: maskCustomerName(item.customer_snapshot?.full_name),
          service_name: serviceName,
          vehicle_label: [vehicleBrand, vehicleModel].filter(Boolean).join(' ') || 'Xe máy',
          appointment_code: item.appointment_code || null
        };
      })
      .filter(Boolean);

    return successResponse(res, 200, 'Reviews retrieved successfully', { reviews });
  } catch (error) {
    console.error('Get public reviews error:', error);
    return errorResponse(res, 500, 'Failed to retrieve reviews');
  }
};

/**
 * Create customer appointment
 * POST /api/appointments
 */
const resolveBookableServicePayload = async ({
  serviceType,
  service_id,
  service_package,
  repair_issue,
  issue_description
}) => {
  if (service_id) {
    const catalogService = await Service.findOne({
      _id: service_id,
      is_active: true,
      allow_booking: true
    });

    if (!catalogService) {
      return { error: 'Selected service is not available for online booking' };
    }

    const expectedType = mapCategoryToBookingType(catalogService.category);
    if (expectedType !== serviceType) {
      return {
        error: `Service category ${catalogService.category} does not match service type ${serviceType}`
      };
    }

    return {
      catalogServiceId: catalogService._id,
      servicePayload: buildServicePayloadFromCatalog(catalogService, serviceType, {
        repair_issue,
        issue_description
      }),
      catalogService
    };
  }

  if (serviceType === 'REPAIR') {
    return {
      catalogServiceId: null,
      servicePayload: {
        type: serviceType,
        name: repair_issue.trim(),
        repair_issue: repair_issue.trim(),
        issue_description,
        description: 'Repair inspection appointment',
        estimated_price: null,
        estimated_duration_minutes: 90
      }
    };
  }

  const selectedPackage = getServicePackage(serviceType, service_package);
  if (!selectedPackage) {
    return { error: 'Invalid service package for selected service type' };
  }

  return {
    catalogServiceId: null,
    servicePayload: {
      type: serviceType,
      package_id: service_package,
      ...selectedPackage
    }
  };
};

const createAppointment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      service_type,
      service_package,
      service_id,
      additional_service_type,
      additional_service_id,
      additional_service_package,
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
    const additionalServiceType = additional_service_type
      ? String(additional_service_type).toUpperCase()
      : null;
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

    if (additionalServiceType) {
      if (!['WASH', 'MAINTENANCE'].includes(serviceType) || !['WASH', 'MAINTENANCE'].includes(additionalServiceType)) {
        return errorResponse(res, 400, 'Combo booking only supports wash and maintenance');
      }
      if (additionalServiceType === serviceType) {
        return errorResponse(res, 400, 'Primary and additional service types must be different');
      }
    }

    const primaryResolved = await resolveBookableServicePayload({
      serviceType,
      service_id,
      service_package,
      repair_issue,
      issue_description
    });

    if (primaryResolved.error) {
      return errorResponse(res, 400, primaryResolved.error);
    }

    let { catalogServiceId, servicePayload } = primaryResolved;
    let addonServices = [];

    if (additionalServiceType) {
      const additionalResolved = await resolveBookableServicePayload({
        serviceType: additionalServiceType,
        service_id: additional_service_id,
        service_package: additional_service_package
      });

      if (additionalResolved.error) {
        return errorResponse(res, 400, additionalResolved.error);
      }

      const additionalPayload = additionalResolved.servicePayload;
      const additionalDuration = Number(additionalPayload.estimated_duration_minutes) || 0;
      const additionalPrice = Number(additionalPayload.estimated_price) || 0;

      servicePayload = {
        ...servicePayload,
        name: `${servicePayload.name} + ${additionalPayload.name}`,
        description: [servicePayload.description, additionalPayload.description]
          .filter(Boolean)
          .join(' | '),
        estimated_duration_minutes:
          (Number(servicePayload.estimated_duration_minutes) || 0) + additionalDuration
      };

      if (additionalResolved.catalogServiceId) {
        addonServices = [{
          service_id: additionalResolved.catalogServiceId,
          name: additionalPayload.name,
          price: additionalPrice,
          quantity: 1,
          added_by: userId
        }];
      } else {
        servicePayload.estimated_price =
          (Number(servicePayload.estimated_price) || 0) + additionalPrice;
      }
    }

    const totalDurationMinutes = Number(servicePayload.estimated_duration_minutes) || 60;

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
      service_id: catalogServiceId,
      service: servicePayload,
      addon_services: addonServices,
      total_service_duration_minutes: totalDurationMinutes,
      estimated_duration: totalDurationMinutes,
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
    })
      .populate('service_id', 'service_name base_price category estimated_duration')
      .populate('staff_id', 'full_name')
      .select('-__v');

    if (!appointment) {
      return errorResponse(res, 404, 'Appointment not found');
    }

    const materials_used = await InventoryTransaction.find({
      reference_type: 'APPOINTMENT',
      reference_id: appointment._id,
      transaction_type: 'STOCK_OUT',
      is_reversed: { $ne: true }
    })
      .populate('inventory_item_id', 'item_code item_name unit unit_price')
      .sort({ created_at: -1 });

    return successResponse(res, 200, 'Appointment retrieved successfully', {
      appointment,
      materials_used
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

/**
 * Submit review for a completed appointment
 * POST /api/appointments/:id/review
 */
const reviewMyAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      customer_id: req.user.userId
    });

    if (!appointment) {
      return errorResponse(res, 404, 'Appointment not found');
    }

    if (!['COMPLETED', 'PAID'].includes(appointment.status)) {
      return errorResponse(res, 400, 'Only completed appointments can be reviewed');
    }

    if (Number(appointment.review?.rating) >= 1) {
      return errorResponse(res, 400, 'This appointment has already been reviewed');
    }

    const rating = Number(req.body.rating);
    const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';

    appointment.review = {
      rating,
      comment: comment || null,
      created_at: new Date()
    };

    await appointment.save();

    return successResponse(res, 200, 'Review submitted successfully', {
      appointment: appointment.toSafeObject()
    });
  } catch (error) {
    console.error('Review appointment error:', error);
    return errorResponse(res, 500, 'Failed to submit review');
  }
};

/**
 * PATCH /api/appointments/:id/parts-hold/consent
 * Customer agrees or declines waiting for missing parts (after garage notification).
 */
const respondPartsHoldConsent = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      customer_id: req.user.userId
    }).populate('staff_id', 'full_name');

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

    const note = String(req.body.note || '').trim();
    const now = new Date();
    const code = appointment.appointment_code || appointment._id;
    const etaDays = appointment.parts_hold.eta_days || null;
    const partsList = (appointment.parts_hold.items || [])
      .map((item) => `${item.name} x${item.quantity || 1}`)
      .join(', ');

    appointment.parts_hold.consent = {
      status: decision,
      responded_at: now,
      note,
      contacted_by: req.user.userId
    };
    appointment.parts_hold.status = decision === 'APPROVED' ? 'APPROVED' : 'DECLINED';

    if (decision === 'DECLINED') {
      appointment.status = 'IN_PROGRESS';
      appointment.repair_log = {
        status: null,
        notes: note || 'Khách từ chối chờ phụ tùng (qua app)',
        completed_at: null
      };
    }

    await appointment.save();

    const Notification = require('../models/Notification.model');
    const Role = require('../models/Role.model');
    const UserRole = require('../models/UserRole.model');

    // Notify staff
    if (appointment.staff_id) {
      const staffId = appointment.staff_id._id || appointment.staff_id;
      try {
        await Notification.create({
          user_id: staffId,
          appointment_id: appointment._id,
          type: 'APPOINTMENT_UPDATED',
          title: decision === 'APPROVED'
            ? 'Khách đồng ý chờ phụ tùng'
            : 'Khách từ chối chờ phụ tùng',
          message: decision === 'APPROVED'
            ? `Lịch ${code}: khách đã xác nhận đồng ý chờ${etaDays ? ` ~${etaDays} ngày` : ''}. Khi hàng về Manager nhập kho rồi mở lại sửa chữa.`
            : `Lịch ${code}: khách từ chối chờ hàng. Tiếp tục xử lý không dùng phụ tùng thiếu.`,
          metadata: {
            kind: 'PARTS_HOLD_CUSTOMER_RESULT',
            decision,
            appointment_id: String(appointment._id),
            appointment_code: code
          }
        });
      } catch (err) {
        console.warn('Parts hold staff notify failed:', err.message);
      }
    }

    // Notify managers
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
          title: decision === 'APPROVED'
            ? 'Khách đồng ý chờ phụ tùng'
            : 'Khách từ chối chờ phụ tùng',
          message: decision === 'APPROVED'
            ? `Lịch ${code}: khách xác nhận chờ phụ tùng (${partsList || 'đang đặt hàng'}).`
            : `Lịch ${code}: khách từ chối chờ phụ tùng.`,
          metadata: {
            kind: 'PARTS_HOLD_CUSTOMER_RESULT',
            decision,
            appointment_id: String(appointment._id),
            appointment_code: code
          }
        }));
        if (notifications.length) {
          await Notification.insertMany(notifications);
        }
      }
    } catch (err) {
      console.warn('Parts hold manager notify failed:', err.message);
    }

    return successResponse(
      res,
      200,
      decision === 'APPROVED'
        ? 'Đã xác nhận: bạn đồng ý chờ phụ tùng'
        : 'Đã ghi nhận: bạn không muốn chờ phụ tùng',
      { appointment }
    );
  } catch (error) {
    console.error('Respond parts hold consent error:', error);
    return errorResponse(res, 500, 'Không thể lưu xác nhận chờ phụ tùng');
  }
};

module.exports = {
  createAppointment,
  getMyAppointments,
  getMyAppointmentById,
  cancelMyAppointment,
  reviewMyAppointment,
  getPublicReviews,
  respondPartsHoldConsent
};
