const express = require('express');
const router = express.Router();
const adminAppointmentController = require('../controllers/admin.appointment.controller');
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
const updateAppointmentValidation = [
  body('appointment_date').optional().isISO8601()
    .withMessage('Invalid date format'),
  body('start_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid time format (HH:MM)'),
  body('end_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid time format (HH:MM)'),
  body('service_id').optional().isMongoId()
    .withMessage('Invalid service ID'),
  body('staff_id').optional().isMongoId()
    .withMessage('Invalid staff ID'),
  body('staff_notes').optional().trim().isLength({ max: 1000 })
    .withMessage('Staff notes cannot exceed 1000 characters')
];

const updateStatusValidation = [
  body('status').notEmpty()
    .isIn(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
    .withMessage('Invalid status'),
  body('notes').optional().trim().isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

const assignStaffValidation = [
  body('staff_id').notEmpty().isMongoId()
    .withMessage('Valid staff ID is required')
];

const cancelAppointmentValidation = [
  body('reason').optional().trim().isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
];

/**
 * @route   GET /api/admin/appointments/statistics
 * @desc    Get appointment statistics
 * @access  Private/Admin
 */
router.get('/appointments/statistics',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  query('period').optional().isInt({ min: 1, max: 365 }),
  validate,
  adminAppointmentController.getAppointmentStatistics
);

/**
 * @route   GET /api/admin/appointments/calendar
 * @desc    Get calendar view of appointments
 * @access  Private/Admin
 */
router.get('/appointments/calendar',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  query('start_date').notEmpty().isISO8601(),
  query('end_date').notEmpty().isISO8601(),
  query('staff_id').optional().isMongoId(),
  validate,
  adminAppointmentController.getAppointmentCalendar
);

/**
 * @route   GET /api/admin/appointments
 * @desc    Get all appointments with filters
 * @access  Private/Admin
 */
router.get('/appointments',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  query('customer_id').optional().isMongoId(),
  query('staff_id').optional(),
  query('service_id').optional().isMongoId(),
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
  validate,
  adminAppointmentController.getAllAppointments
);

/**
 * @route   GET /api/admin/appointments/:id
 * @desc    Get appointment by ID
 * @access  Private/Admin
 */
router.get('/appointments/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  validate,
  adminAppointmentController.getAppointmentById
);

/**
 * @route   PUT /api/admin/appointments/:id
 * @desc    Update appointment
 * @access  Private/Admin
 */
router.put('/appointments/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  updateAppointmentValidation,
  validate,
  adminAppointmentController.updateAppointment
);

/**
 * @route   PUT /api/admin/appointments/:id/status
 * @desc    Update appointment status
 * @access  Private/Admin
 */
router.put('/appointments/:id/status',
  authenticate,
  authorize('ADMIN', 'MANAGER', 'STAFF'),
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  updateStatusValidation,
  validate,
  adminAppointmentController.updateAppointmentStatus
);

/**
 * @route   DELETE /api/admin/appointments/:id
 * @desc    Cancel appointment
 * @access  Private/Admin
 */
router.delete('/appointments/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  cancelAppointmentValidation,
  validate,
  adminAppointmentController.cancelAppointment
);

/**
 * @route   POST /api/admin/appointments/:id/assign-staff
 * @desc    Assign staff to appointment
 * @access  Private/Admin
 */
router.post('/appointments/:id/assign-staff',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  assignStaffValidation,
  validate,
  adminAppointmentController.assignStaff
);

module.exports = router;
