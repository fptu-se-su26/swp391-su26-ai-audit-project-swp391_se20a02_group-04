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

const completeValidation = [
  body('completion_notes').optional().trim().isLength({ max: 1000 })
    .withMessage('Completion notes cannot exceed 1000 characters'),
  body('actual_duration').optional().isInt({ min: 1, max: 480 })
    .withMessage('Actual duration must be between 1 and 480 minutes')
];

const profileValidation = [
  body('full_name').optional().trim().isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('phone').optional().trim().matches(/^[0-9]{10,11}$/)
    .withMessage('Phone must contain 10-11 digits'),
  body('specialization').optional().trim().isLength({ max: 120 })
    .withMessage('Specialization cannot exceed 120 characters')
];

const appointmentListQueryValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
  query('sort_by').optional().isIn(['appointment_date', 'start_time', 'time_slot', 'status', 'created_at'])
    .withMessage('Invalid sort_by'),
  query('sort_order').optional().isIn(['asc', 'desc', '1', '-1'])
    .withMessage('Invalid sort_order')
];

router.get('/dashboard',
  authenticate,
  authorize('STAFF', 'ADMIN', 'MANAGER'),
  staffAppointmentController.getDashboard
);

router.get('/schedule/today',
  authenticate,
  authorize('STAFF', 'ADMIN', 'MANAGER'),
  staffAppointmentController.getTodaySchedule
);

router.get('/schedule',
  authenticate,
  authorize('STAFF', 'ADMIN', 'MANAGER'),
  query('week').optional().matches(/^\d{4}-W\d{2}$/).withMessage('week must use YYYY-Www format'),
  query('date_from').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date_from must use YYYY-MM-DD format'),
  query('date_to').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date_to must use YYYY-MM-DD format'),
  validate,
  staffAppointmentController.getMySchedule
);

router.get('/profile',
  authenticate,
  authorize('STAFF', 'ADMIN', 'MANAGER'),
  staffAppointmentController.getProfile
);

router.put('/profile',
  authenticate,
  authorize('STAFF', 'ADMIN', 'MANAGER'),
  profileValidation,
  validate,
  staffAppointmentController.updateProfile
);

/**
 * @route   GET /api/staff/appointments/my-stats
 * @desc    Get staff workload statistics
 * @access  Private/Staff
 */
router.get('/appointments/my-stats',
  authenticate,
  authorize('STAFF'),
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
  authorize('STAFF'),
  staffAppointmentController.getTodayAppointments
);

router.get('/appointments/history',
  authenticate,
  authorize('STAFF', 'ADMIN', 'MANAGER'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
  validate,
  staffAppointmentController.getAppointmentHistory
);

/**
 * @route   GET /api/staff/appointments/all
 * @desc    Get all appointments (for staff to see workload)
 * @access  Private/Staff
 */
router.get('/appointments/all',
  authenticate,
  authorize('STAFF'),
  appointmentListQueryValidation,
  query('staff_id').optional(),
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
  authorize('STAFF'),
  appointmentListQueryValidation,
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
  authorize('STAFF'),
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
  authorize('STAFF'),
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  updateStatusValidation,
  validate,
  staffAppointmentController.updateAppointmentStatus
);

router.post('/appointments/:id/acknowledge',
  authenticate,
  authorize('STAFF', 'ADMIN', 'MANAGER'),
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  validate,
  staffAppointmentController.acknowledgeAppointment
);

router.post('/appointments/:id/start',
  authenticate,
  authorize('STAFF', 'ADMIN', 'MANAGER'),
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),
  validate,
  staffAppointmentController.startAppointment
);

router.post('/appointments/:id/complete',
  authenticate,
  authorize('STAFF', 'ADMIN', 'MANAGER'),
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  completeValidation,
  validate,
  staffAppointmentController.completeAppointment
);

router.post('/appointments/:id/no-show',
  authenticate,
  authorize('STAFF', 'ADMIN', 'MANAGER'),
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),
  validate,
  staffAppointmentController.markNoShow
);

/**
 * @route   PUT /api/staff/appointments/:id/notes
 * @desc    Add notes to appointment
 * @access  Private/Staff
 */
router.put('/appointments/:id/notes',
  authenticate,
  authorize('STAFF'),
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  addNotesValidation,
  validate,
  staffAppointmentController.addAppointmentNotes
);

module.exports = router;
