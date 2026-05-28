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

// Validation rules
const createServiceValidation = [
  body('service_name').notEmpty().trim().isLength({ min: 2, max: 100 })
    .withMessage('Service name must be between 2 and 100 characters'),
  body('description').notEmpty().trim().isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('category').notEmpty().isIn(['MAINTENANCE', 'REPAIR', 'INSPECTION', 'UPGRADE', 'OTHER'])
    .withMessage('Category must be one of: MAINTENANCE, REPAIR, INSPECTION, UPGRADE, OTHER'),
  body('base_price').notEmpty().isFloat({ min: 0 })
    .withMessage('Base price must be a positive number'),
  body('estimated_duration').notEmpty().isInt({ min: 15, max: 480 })
    .withMessage('Estimated duration must be between 15 and 480 minutes'),
  body('image_url').optional().isURL()
    .withMessage('Image URL must be a valid URL')
];

const updateServiceValidation = [
  body('service_name').optional().trim().isLength({ min: 2, max: 100 })
    .withMessage('Service name must be between 2 and 100 characters'),
  body('description').optional().trim().isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('category').optional().isIn(['MAINTENANCE', 'REPAIR', 'INSPECTION', 'UPGRADE', 'OTHER'])
    .withMessage('Category must be one of: MAINTENANCE, REPAIR, INSPECTION, UPGRADE, OTHER'),
  body('base_price').optional().isFloat({ min: 0 })
    .withMessage('Base price must be a positive number'),
  body('estimated_duration').optional().isInt({ min: 15, max: 480 })
    .withMessage('Estimated duration must be between 15 and 480 minutes'),
  body('image_url').optional().isURL()
    .withMessage('Image URL must be a valid URL'),
  body('is_active').optional().isBoolean()
    .withMessage('is_active must be a boolean value')
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
  query('category').optional().isIn(['MAINTENANCE', 'REPAIR', 'INSPECTION', 'UPGRADE', 'OTHER']),
  query('is_active').optional().isIn(['true', 'false']),
  query('search').optional().trim(),
  query('sort_by').optional().isIn(['service_name', 'category', 'base_price', 'created_at', 'total_bookings']),
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