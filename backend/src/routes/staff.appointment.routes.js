const express = require('express');
const router = express.Router();
const staffAppointmentController = require('../controllers/staff.appointment.controller');
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
const updateStatusValidation = [
  body('status').notEmpty()
    .isIn(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW'])
    .withMessage('Status must be one of: CONFIRMED, IN_PROGRESS, COMPLETED, NO_SHOW'),
  body('notes').optional().trim().isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  body('actual_duration').optional().isInt({ min: 1, max: 480 })
    .withMessage('Actual duration must be between 1 and 480 minutes')
];

const addNotesValidation = [
  body('notes').notEmpty().trim().isLength({ min: 1, max: 1000 })
    .withMessage('Notes are required and cannot exceed 1000 characters')
];

/**
 * @route   GET /api/staff/appointments/my-stats
 * @desc    Get staff workload statistics
 * @access  Private/Staff
 */
router.get('/appointments/my-stats',
  authenticate,
  authorize('STAFF', 'ADMIN', 'MANAGER'),
  query('period').optional().isInt({ min: 1, max: 365 }),
  validate,
  staffAppointmentController.getMyWorkloadStats
);

/**
 * @route   GET /api/staff/appointments/today
 * @desc    Get today's appointments
 * @access  Private/Staff
 */
router.get('/appointments/today',
  authenticate,
  authorize('STAFF', 'ADMIN', 'MANAGER'),
  staffAppointmentController.getTodayAppointments
);

/**
 * @route   GET /api/staff/appointments/all
 * @desc    Get all appointments (for staff to see workload)
 * @access  Private/Staff
 */
router.get('/appointments/all',
  authenticate,
  authorize('STAFF', 'ADMIN', 'MANAGER'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  query('staff_id').optional(),
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
  validate,
  staffAppointmentController.getAllAppointments
);

/**
 * @route   GET /api/staff/appointments
 * @desc    Get staff's assigned appointments
 * @access  Private/Staff
 */
router.get('/appointments',
  authenticate,
  authorize('STAFF', 'ADMIN', 'MANAGER'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
  validate,
  staffAppointmentController.getMyAssignedAppointments
);

/**
 * @route   GET /api/staff/appointments/:id
 * @desc    Get appointment by ID
 * @access  Private/Staff
 */
router.get('/appointments/:id',
  authenticate,
  authorize('STAFF', 'ADMIN', 'MANAGER'),
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  validate,
  staffAppointmentController.getAppointmentById
);

/**
 * @route   PUT /api/staff/appointments/:id/status
 * @desc    Update appointment status
 * @access  Private/Staff
 */
router.put('/appointments/:id/status',
  authenticate,
  authorize('STAFF', 'ADMIN', 'MANAGER'),
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  updateStatusValidation,
  validate,
  staffAppointmentController.updateAppointmentStatus
);

/**
 * @route   PUT /api/staff/appointments/:id/notes
 * @desc    Add notes to appointment
 * @access  Private/Staff
 */
router.put('/appointments/:id/notes',
  authenticate,
  authorize('STAFF', 'ADMIN', 'MANAGER'),
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  addNotesValidation,
  validate,
  staffAppointmentController.addAppointmentNotes
);

module.exports = router;