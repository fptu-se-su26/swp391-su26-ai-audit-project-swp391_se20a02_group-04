const Service = require('../models/Service.model');
const { successResponse, errorResponse } = require('../utils/response.util');

/**
 * Get all active services
 * GET /api/services
 */
const getAllServices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category = '',
      search = '',
      sort_by = 'popularity_score',
      sort_order = 'desc'
    } = req.query;

    // Build query
    const query = { is_active: true };

    if (category) {
      query.category = category.toUpperCase();
    }

    if (search) {
      query.$or = [
        { service_name: { $regex: search, $options: 'i' } },
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
 * GET /api/services/:id
 */
const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findOne({ _id: id, is_active: true });

    if (!service) {
      return errorResponse(res, 404, 'Service not found');
    }

    return successResponse(res, 200, 'Service retrieved successfully', {
      service
    });

  } catch (error) {
    console.error('Get service by ID error:', error);
    return errorResponse(res, 500, 'Failed to retrieve service');
  }
};

/**
 * Get popular services
 * GET /api/services/popular
 */
const getPopularServices = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const services = await Service.find({ is_active: true })
      .sort({ popularity_score: -1, total_bookings: -1 })
      .limit(parseInt(limit));

    return successResponse(res, 200, 'Popular services retrieved successfully', {
      services
    });

  } catch (error) {
    console.error('Get popular services error:', error);
    return errorResponse(res, 500, 'Failed to retrieve popular services');
  }
};

/**
 * Get services by category
 * GET /api/services/category/:category
 */
const getServicesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const validCategories = ['MAINTENANCE', 'REPAIR', 'INSPECTION', 'CUSTOMIZATION', 'EMERGENCY', 'OTHER'];
    if (!validCategories.includes(category.toUpperCase())) {
      return errorResponse(res, 400, 'Invalid category');
    }

    const skip = (page - 1) * limit;

    const [services, total] = await Promise.all([
      Service.find({ 
        category: category.toUpperCase(), 
        is_active: true 
      })
        .sort({ popularity_score: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      Service.countDocuments({ 
        category: category.toUpperCase(), 
        is_active: true 
      })
    ]);

    return successResponse(res, 200, `${category} services retrieved successfully`, {
      services,
      category: category.toUpperCase(),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get services by category error:', error);
    return errorResponse(res, 500, 'Failed to retrieve services by category');
  }
};

module.exports = {
  getAllServices,
  getServiceById,
  getPopularServices,
  getServicesByCategory
};