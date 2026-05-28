const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointment.controller');
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
const createAppointmentValidation = [
  body('service_id').notEmpty().isMongoId()
    .withMessage('Valid service ID is required'),
  body('appointment_date').notEmpty().isISO8601()
    .withMessage('Valid appointment date is required (YYYY-MM-DD)'),
  body('start_time').notEmpty().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Valid start time is required (HH:MM format)'),
  body('customer_notes').optional().trim().isLength({ max: 1000 })
    .withMessage('Customer notes cannot exceed 1000 characters'),
  body('vehicle_info.brand').optional().trim().isLength({ min: 1, max: 50 })
    .withMessage('Vehicle brand must be between 1 and 50 characters'),
  body('vehicle_info.model').optional().trim().isLength({ min: 1, max: 50 })
    .withMessage('Vehicle model must be between 1 and 50 characters'),
  body('vehicle_info.year').optional().isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('Vehicle year must be valid'),
  body('vehicle_info.license_plate').optional().trim().isLength({ min: 1, max: 20 })
    .withMessage('License plate must be between 1 and 20 characters')
];

const updateAppointmentValidation = [
  body('service_id').optional().isMongoId()
    .withMessage('Valid service ID is required'),
  body('appointment_date').optional().isISO8601()
    .withMessage('Valid appointment date is required (YYYY-MM-DD)'),
  body('start_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Valid start time is required (HH:MM format)'),
  body('customer_notes').optional().trim().isLength({ max: 1000 })
    .withMessage('Customer notes cannot exceed 1000 characters'),
  body('vehicle_info.brand').optional().trim().isLength({ min: 1, max: 50 })
    .withMessage('Vehicle brand must be between 1 and 50 characters'),
  body('vehicle_info.model').optional().trim().isLength({ min: 1, max: 50 })
    .withMessage('Vehicle model must be between 1 and 50 characters'),
  body('vehicle_info.year').optional().isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('Vehicle year must be valid'),
  body('vehicle_info.license_plate').optional().trim().isLength({ min: 1, max: 20 })
    .withMessage('License plate must be between 1 and 20 characters')
];

const cancelAppointmentValidation = [
  body('reason').optional().trim().isLength({ max: 500 })
    .withMessage('Cancellation reason cannot exceed 500 characters')
];

/**
 * @route   POST /api/appointments
 * @desc    Create new appointment
 * @access  Private/Customer
 */
router.post('/',
  authenticate,
  authorize('CUSTOMER'),
  createAppointmentValidation,
  validate,
  appointmentController.createAppointment
);

/**
 * @route   GET /api/appointments
 * @desc    Get customer's appointments
 * @access  Private/Customer
 */
router.get('/',
  authenticate,
  authorize('CUSTOMER'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
  validate,
  appointmentController.getMyAppointments
);

/**
 * @route   GET /api/appointments/:id
 * @desc    Get appointment by ID
 * @access  Private/Customer
 */
router.get('/:id',
  authenticate,
  authorize('CUSTOMER'),
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  validate,
  appointmentController.getAppointmentById
);

/**
 * @route   PUT /api/appointments/:id
 * @desc    Update appointment
 * @access  Private/Customer
 */
router.put('/:id',
  authenticate,
  authorize('CUSTOMER'),
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  updateAppointmentValidation,
  validate,
  appointmentController.updateAppointment
);

/**
 * @route   DELETE /api/appointments/:id
 * @desc    Cancel appointment
 * @access  Private/Customer
 */
router.delete('/:id',
  authenticate,
  authorize('CUSTOMER'),
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  cancelAppointmentValidation,
  validate,
  appointmentController.cancelAppointment
);

module.exports = router;