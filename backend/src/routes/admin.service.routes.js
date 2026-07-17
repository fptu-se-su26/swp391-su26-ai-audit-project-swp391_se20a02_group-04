const express = require('express');
const router = express.Router();
const adminServiceController = require('../controllers/admin.service.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { body, param, query, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Danh mục dịch vụ garage (đồng bộ với Service.model)
const SERVICE_CATEGORIES = [
  'WASH_CARE', 'MAINTENANCE', 'LUBRICANT', 'TIRE_WHEEL', 'BRAKE',
  'ELECTRICAL', 'ENGINE_TRANSMISSION', 'SUSPENSION_FRAME', 'ACCESSORY',
  'INSPECTION', 'EMERGENCY', 'REPAIR', 'CUSTOMIZATION', 'OTHER'
];
const SERVICE_PRICE_TYPES = ['FIXED', 'FROM', 'QUOTE'];
const SERVICE_VEHICLE_TYPES = ['ALL', 'SCOOTER', 'MANUAL', 'CLUTCH'];

// Validation rules
const createServiceValidation = [
  body('service_name').notEmpty().trim().isLength({ min: 2, max: 100 })
    .withMessage('Tên dịch vụ phải từ 2 đến 100 ký tự'),
  body('service_code').optional().trim().isLength({ min: 2, max: 30 })
    .withMessage('Mã dịch vụ phải từ 2 đến 30 ký tự'),
  body('description').notEmpty().trim().isLength({ min: 10, max: 2000 })
    .withMessage('Mô tả phải từ 10 đến 2000 ký tự'),
  body('category').notEmpty().isIn(SERVICE_CATEGORIES)
    .withMessage('Danh mục dịch vụ không hợp lệ'),
  body('base_price').notEmpty().isFloat({ min: 0 })
    .withMessage('Giá dịch vụ phải là số dương'),
  body('price_type').optional().isIn(SERVICE_PRICE_TYPES)
    .withMessage('Kiểu giá không hợp lệ'),
  body('vehicle_type').optional().isIn(SERVICE_VEHICLE_TYPES)
    .withMessage('Loại xe áp dụng không hợp lệ'),
  body('estimated_duration').notEmpty().isInt({ min: 15, max: 480 })
    .withMessage('Thời lượng ước tính từ 15 đến 480 phút'),
  body('image_url').optional({ checkFalsy: true }).isURL()
    .withMessage('URL ảnh không hợp lệ'),
  body('allow_booking').optional().isBoolean(),
  body('reminder_enabled').optional().isBoolean(),
  body('reminder_days').optional().isInt({ min: 0 }),
  body('reminder_mileage').optional().isInt({ min: 0 })
];

const updateServiceValidation = [
  body('service_name').optional().trim().isLength({ min: 2, max: 100 })
    .withMessage('Tên dịch vụ phải từ 2 đến 100 ký tự'),
  body('description').optional().trim().isLength({ min: 10, max: 2000 })
    .withMessage('Mô tả phải từ 10 đến 2000 ký tự'),
  body('category').optional().isIn(SERVICE_CATEGORIES)
    .withMessage('Danh mục dịch vụ không hợp lệ'),
  body('base_price').optional().isFloat({ min: 0 })
    .withMessage('Giá dịch vụ phải là số dương'),
  body('price_type').optional().isIn(SERVICE_PRICE_TYPES)
    .withMessage('Kiểu giá không hợp lệ'),
  body('vehicle_type').optional().isIn(SERVICE_VEHICLE_TYPES)
    .withMessage('Loại xe áp dụng không hợp lệ'),
  body('estimated_duration').optional().isInt({ min: 15, max: 480 })
    .withMessage('Thời lượng ước tính từ 15 đến 480 phút'),
  body('image_url').optional({ checkFalsy: true }).isURL()
    .withMessage('URL ảnh không hợp lệ'),
  body('allow_booking').optional().isBoolean(),
  body('reminder_enabled').optional().isBoolean(),
  body('reminder_days').optional().isInt({ min: 0 }),
  body('reminder_mileage').optional().isInt({ min: 0 }),
  body('is_active').optional().isBoolean()
    .withMessage('is_active phải là true hoặc false')
];

/**
 * @route   GET /api/admin/services/statistics
 * @desc    Get service statistics
 * @access  Private/Admin
 */
router.get('/services/statistics',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  query('period').optional().isInt({ min: 1, max: 365 }),
  validate,
  adminServiceController.getServiceStatistics
);

/**
 * @route   GET /api/admin/services
 * @desc    Get all services (including inactive)
 * @access  Private/Admin
 */
router.get('/services',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isIn(SERVICE_CATEGORIES),
  query('is_active').optional().isIn(['true', 'false']),
  query('search').optional().trim(),
  query('sort_by').optional().isIn(['service_name', 'category', 'base_price', 'created_at', 'total_bookings', 'estimated_duration']),
  query('sort_order').optional().isIn(['asc', 'desc']),
  validate,
  adminServiceController.getAllServices
);

/**
 * @route   GET /api/admin/services/:id
 * @desc    Get service by ID
 * @access  Private/Admin
 */
router.get('/services/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  param('id').isMongoId().withMessage('Invalid service ID'),
  validate,
  adminServiceController.getServiceById
);

/**
 * @route   POST /api/admin/services
 * @desc    Create new service
 * @access  Private/Admin
 */
router.post('/services',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  createServiceValidation,
  validate,
  adminServiceController.createService
);

/**
 * @route   PUT /api/admin/services/:id
 * @desc    Update service
 * @access  Private/Admin
 */
router.put('/services/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  param('id').isMongoId().withMessage('Invalid service ID'),
  updateServiceValidation,
  validate,
  adminServiceController.updateService
);

/**
 * @route   PUT /api/admin/services/:id/toggle-status
 * @desc    Toggle service active status
 * @access  Private/Admin
 */
router.put('/services/:id/toggle-status',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  param('id').isMongoId().withMessage('Invalid service ID'),
  validate,
  adminServiceController.toggleServiceStatus
);

/**
 * @route   DELETE /api/admin/services/:id
 * @desc    Delete service (soft delete by default, permanent with ?permanent=true)
 * @access  Private/Admin
 */
router.delete('/services/:id',
  authenticate,
  authorize('ADMIN'),
  param('id').isMongoId().withMessage('Invalid service ID'),
  query('permanent').optional().isBoolean(),
  validate,
  adminServiceController.deleteService
);

module.exports = router;