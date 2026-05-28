const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');
const { param, query, validationResult } = require('express-validator');

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

/**
 * @route   GET /api/services/popular
 * @desc    Get popular services
 * @access  Public
 */
router.get('/popular',
  query('limit').optional().isInt({ min: 1, max: 50 }),
  validate,
  serviceController.getPopularServices
);

/**
 * @route   GET /api/services/category/:category
 * @desc    Get services by category
 * @access  Public
 */
router.get('/category/:category',
  param('category').isIn(['MAINTENANCE', 'REPAIR', 'INSPECTION', 'CUSTOMIZATION', 'EMERGENCY', 'OTHER'])
    .withMessage('Invalid category'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
  serviceController.getServicesByCategory
);

/**
 * @route   GET /api/services/:id
 * @desc    Get service by ID
 * @access  Public
 */
router.get('/:id',
  param('id').isMongoId().withMessage('Invalid service ID'),
  validate,
  serviceController.getServiceById
);

/**
 * @route   GET /api/services
 * @desc    Get all active services
 * @access  Public
 */
router.get('/',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isIn(['MAINTENANCE', 'REPAIR', 'INSPECTION', 'CUSTOMIZATION', 'EMERGENCY', 'OTHER']),
  validate,
  serviceController.getAllServices
);

module.exports = router;