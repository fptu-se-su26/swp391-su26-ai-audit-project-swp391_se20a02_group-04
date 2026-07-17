const Service = require('../models/Service.model');
const Appointment = require('../models/Appointment.model');
const UserAudit = require('../models/UserAudit.model');
const { successResponse, errorResponse } = require('../utils/response.util');

// Tiền tố mã dịch vụ theo danh mục, dùng khi tự sinh service_code.
const CODE_PREFIXES = {
  WASH_CARE: 'WASH',
  MAINTENANCE: 'MAIN',
  LUBRICANT: 'LUBE',
  TIRE_WHEEL: 'TIRE',
  BRAKE: 'BRAKE',
  ELECTRICAL: 'ELEC',
  ENGINE_TRANSMISSION: 'ENG',
  SUSPENSION_FRAME: 'SUSP',
  ACCESSORY: 'ACC',
  INSPECTION: 'INSP',
  EMERGENCY: 'SOS',
  REPAIR: 'REP',
  CUSTOMIZATION: 'CUS',
  OTHER: 'SVC'
};

const generateServiceCode = async (category) => {
  const prefix = CODE_PREFIXES[category] || 'SVC';
  // Thử tối đa 5 lần để tránh trùng mã (unique sparse index).
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `SVC-${prefix}-${Math.floor(100 + Math.random() * 900)}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await Service.findOne({ service_code: code }).select('_id');
    if (!exists) return code;
  }
  return `SVC-${prefix}-${Date.now().toString().slice(-6)}`;
};

/**
 * Get all services (including inactive)
 * GET /api/admin/services
 */
const getAllServices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category = '',
      is_active = '',
      search = '',
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    // Build query
    const query = {};

    if (category) {
      query.category = category.toUpperCase();
    }

    if (is_active !== '') {
      query.is_active = is_active === 'true';
    }

    if (search) {
      query.$or = [
        { service_name: { $regex: search, $options: 'i' } },
        { service_code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const sortOrder = sort_order === 'asc' ? 1 : -1;

    const [services, total] = await Promise.all([
      Service.find(query)
        .sort({ [sort_by]: sortOrder })
        .limit(parseInt(limit))
        .skip(skip),
      Service.countDocuments(query)
    ]);

    return successResponse(res, 200, 'Services retrieved successfully', {
      services,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all services error:', error);
    return errorResponse(res, 500, 'Failed to retrieve services');
  }
};

/**
 * Get service by ID
 * GET /api/admin/services/:id
 */
const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findById(id);

    if (!service) {
      return errorResponse(res, 404, 'Service not found');
    }

    // Get service statistics
    const [totalBookings, completedBookings, activeBookings] = await Promise.all([
      Appointment.countDocuments({ service_id: id }),
      Appointment.countDocuments({ service_id: id, status: 'COMPLETED' }),
      Appointment.countDocuments({ service_id: id, status: { $in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] } })
    ]);

    return successResponse(res, 200, 'Service retrieved successfully', {
      service,
      statistics: {
        total_bookings: totalBookings,
        completed_bookings: completedBookings,
        active_bookings: activeBookings
      }
    });

  } catch (error) {
    console.error('Get service by ID error:', error);
    return errorResponse(res, 500, 'Failed to retrieve service');
  }
};

/**
 * Create new service
 * POST /api/admin/services
 */
const createService = async (req, res) => {
  try {
    const {
      service_name,
      service_code,
      description,
      category,
      base_price,
      price_type,
      vehicle_type,
      estimated_duration,
      image_url,
      allow_booking,
      reminder_enabled,
      reminder_days,
      reminder_mileage
    } = req.body;

    // Check if service name already exists
    const existingService = await Service.findOne({ 
      service_name: { $regex: new RegExp(`^${service_name}$`, 'i') }
    });

    if (existingService) {
      return errorResponse(res, 409, 'Dịch vụ với tên này đã tồn tại');
    }

    const normalizedCategory = category ? category.toUpperCase() : 'OTHER';
    const code = service_code
      ? String(service_code).toUpperCase().trim()
      : await generateServiceCode(normalizedCategory);

    const service = await Service.create({
      service_name,
      service_code: code,
      description,
      category: normalizedCategory,
      base_price,
      price_type: price_type || 'FIXED',
      vehicle_type: vehicle_type || 'ALL',
      estimated_duration,
      image_url,
      allow_booking: allow_booking !== undefined ? allow_booking : true,
      reminder_enabled: reminder_enabled || false,
      reminder_days: reminder_days || 0,
      reminder_mileage: reminder_mileage || 0,
      is_active: true
    });

    // Log audit
    await UserAudit.create({
      user_id: req.user.userId,
      action: 'SERVICE_CREATED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        service_id: service._id,
        service_name,
        category: service.category,
        base_price
      }
    });

    return successResponse(res, 201, 'Service created successfully', {
      service
    });

  } catch (error) {
    console.error('Create service error:', error);
    return errorResponse(res, 500, 'Failed to create service');
  }
};

/**
 * Update service
 * PUT /api/admin/services/:id
 */
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      service_name,
      description,
      category,
      base_price,
      price_type,
      vehicle_type,
      estimated_duration,
      image_url,
      allow_booking,
      reminder_enabled,
      reminder_days,
      reminder_mileage,
      is_active
    } = req.body;

    const service = await Service.findById(id);

    if (!service) {
      return errorResponse(res, 404, 'Service not found');
    }

    // Check if service name already exists (excluding current service)
    if (service_name && service_name !== service.service_name) {
      const existingService = await Service.findOne({ 
        service_name: { $regex: new RegExp(`^${service_name}$`, 'i') },
        _id: { $ne: id }
      });

      if (existingService) {
        return errorResponse(res, 409, 'Dịch vụ với tên này đã tồn tại');
      }
    }

    const oldValues = {
      service_name: service.service_name,
      category: service.category,
      base_price: service.base_price,
      estimated_duration: service.estimated_duration,
      is_active: service.is_active
    };

    // Update fields
    if (service_name !== undefined) service.service_name = service_name;
    if (description !== undefined) service.description = description;
    if (category !== undefined) service.category = category.toUpperCase();
    if (base_price !== undefined) service.base_price = base_price;
    if (price_type !== undefined) service.price_type = price_type;
    if (vehicle_type !== undefined) service.vehicle_type = vehicle_type;
    if (estimated_duration !== undefined) service.estimated_duration = estimated_duration;
    if (image_url !== undefined) service.image_url = image_url;
    if (allow_booking !== undefined) service.allow_booking = allow_booking;
    if (reminder_enabled !== undefined) service.reminder_enabled = reminder_enabled;
    if (reminder_days !== undefined) service.reminder_days = reminder_days;
    if (reminder_mileage !== undefined) service.reminder_mileage = reminder_mileage;
    if (is_active !== undefined) service.is_active = is_active;

    // Dịch vụ cũ chưa có mã thì sinh bổ sung.
    if (!service.service_code) {
      service.service_code = await generateServiceCode(service.category);
    }

    await service.save();

    // Log audit
    await UserAudit.create({
      user_id: req.user.userId,
      action: 'SERVICE_UPDATED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        service_id: id,
        old_values: oldValues,
        new_values: {
          service_name: service.service_name,
          category: service.category,
          base_price: service.base_price,
          estimated_duration: service.estimated_duration,
          is_active: service.is_active
        }
      }
    });

    return successResponse(res, 200, 'Service updated successfully', {
      service
    });

  } catch (error) {
    console.error('Update service error:', error);
    return errorResponse(res, 500, 'Failed to update service');
  }
};

/**
 * Delete service
 * DELETE /api/admin/services/:id
 */
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    const service = await Service.findById(id);

    if (!service) {
      return errorResponse(res, 404, 'Service not found');
    }

    // Đã phát sinh lượt đặt thì không cho xóa vĩnh viễn, chỉ cho ngừng hoạt động.
    const totalAppointments = await Appointment.countDocuments({ service_id: id });

    if (totalAppointments > 0 && permanent === 'true') {
      return errorResponse(res, 400, 'Dịch vụ đã phát sinh lượt đặt, chỉ có thể ngừng hoạt động thay vì xóa.');
    }

    if (permanent === 'true') {
      // Permanent deletion
      await Service.findByIdAndDelete(id);

      // Log audit
      await UserAudit.create({
        user_id: req.user.userId,
        action: 'SERVICE_DELETED',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        status: 'SUCCESS',
        metadata: {
          service_id: id,
          service_name: service.service_name,
          permanent: true
        }
      });

      return successResponse(res, 200, 'Service permanently deleted');
    } else {
      // Soft delete (deactivate)
      service.is_active = false;
      await service.save();

      // Log audit
      await UserAudit.create({
        user_id: req.user.userId,
        action: 'SERVICE_DEACTIVATED',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        status: 'SUCCESS',
        metadata: {
          service_id: id,
          service_name: service.service_name
        }
      });

      return successResponse(res, 200, 'Service deactivated successfully');
    }

  } catch (error) {
    console.error('Delete service error:', error);
    return errorResponse(res, 500, 'Failed to delete service');
  }
};

/**
 * Get service statistics
 * GET /api/admin/services/statistics
 */
const getServiceStatistics = async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // Overall statistics
    const [
      totalServices,
      activeServices,
      inactiveServices,
      totalBookings,
      recentBookings
    ] = await Promise.all([
      Service.countDocuments(),
      Service.countDocuments({ is_active: true }),
      Service.countDocuments({ is_active: false }),
      Appointment.countDocuments(),
      Appointment.countDocuments({ created_at: { $gte: daysAgo } })
    ]);

    // Most popular services
    const popularServices = await Service.aggregate([
      { $match: { is_active: true } },
      { $sort: { total_bookings: -1, popularity_score: -1 } },
      { $limit: 10 },
      {
        $project: {
          service_name: 1,
          category: 1,
          base_price: 1,
          total_bookings: 1,
          popularity_score: 1
        }
      }
    ]);

    // Services by category
    const servicesByCategory = await Service.aggregate([
      { $match: { is_active: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          total_bookings: { $sum: '$total_bookings' },
          avg_price: { $avg: '$base_price' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Revenue by service (last 30 days)
    const revenueByService = await Appointment.aggregate([
      {
        $match: {
          status: 'COMPLETED',
          completed_at: { $gte: daysAgo }
        }
      },
      {
        $lookup: {
          from: 'services',
          localField: 'service_id',
          foreignField: '_id',
          as: 'service'
        }
      },
      { $unwind: '$service' },
      {
        $group: {
          _id: '$service_id',
          service_name: { $first: '$service.service_name' },
          total_revenue: { $sum: '$service.base_price' },
          booking_count: { $sum: 1 }
        }
      },
      { $sort: { total_revenue: -1 } },
      { $limit: 10 }
    ]);

    return successResponse(res, 200, 'Service statistics retrieved successfully', {
      overview: {
        total_services: totalServices,
        active_services: activeServices,
        inactive_services: inactiveServices,
        total_bookings: totalBookings,
        recent_bookings: recentBookings
      },
      charts: {
        popular_services: popularServices,
        services_by_category: servicesByCategory,
        revenue_by_service: revenueByService
      },
      period_days: parseInt(period)
    });

  } catch (error) {
    console.error('Get service statistics error:', error);
    return errorResponse(res, 500, 'Failed to retrieve service statistics');
  }
};

/**
 * Toggle service status
 * PUT /api/admin/services/:id/toggle-status
 */
const toggleServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findById(id);

    if (!service) {
      return errorResponse(res, 404, 'Service not found');
    }

    // Check if service has active appointments when deactivating
    if (service.is_active) {
      const activeAppointments = await Appointment.countDocuments({
        service_id: id,
        status: { $in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] }
      });

      if (activeAppointments > 0) {
        return errorResponse(res, 400, 'Cannot deactivate service with active appointments');
      }
    }

    const oldStatus = service.is_active;
    service.is_active = !service.is_active;
    await service.save();

    // Log audit
    await UserAudit.create({
      user_id: req.user.userId,
      action: service.is_active ? 'SERVICE_ACTIVATED' : 'SERVICE_DEACTIVATED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        service_id: id,
        service_name: service.service_name,
        old_status: oldStatus,
        new_status: service.is_active
      }
    });

    return successResponse(res, 200, `Service ${service.is_active ? 'activated' : 'deactivated'} successfully`, {
      service: {
        _id: service._id,
        service_name: service.service_name,
        is_active: service.is_active
      }
    });

  } catch (error) {
    console.error('Toggle service status error:', error);
    return errorResponse(res, 500, 'Failed to toggle service status');
  }
};

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getServiceStatistics,
  toggleServiceStatus
};