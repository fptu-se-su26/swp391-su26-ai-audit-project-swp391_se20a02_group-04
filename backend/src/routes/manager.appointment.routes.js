const express = require('express');
const router = express.Router();
const managerAppointmentController = require('../controllers/manager.appointment.controller');
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

// Manager authorization middleware
const managerOnly = [authenticate, authorize('MANAGER', 'ADMIN')];

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

const assignAppointmentValidation = [
  body('technician_id').notEmpty().isMongoId()
    .withMessage('Valid technician ID is required'),
  body('repair_bay_id').notEmpty().isMongoId()
    .withMessage('Valid repair bay ID is required'),
  body('force').optional().isBoolean()
    .withMessage('force must be boolean'),
  body('notes').optional().trim().isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const completeAppointmentValidation = [
  body('final_cost').notEmpty().isFloat({ min: 0.01 })
    .withMessage('Final cost must be greater than 0'),
  body('completion_notes').optional().trim().isLength({ max: 1000 })
    .withMessage('Completion notes cannot exceed 1000 characters')
];

const createRepairBayValidation = [
  body('name').notEmpty().trim().isLength({ max: 120 })
    .withMessage('Repair bay name is required'),
  body('code').notEmpty().trim().isLength({ max: 40 })
    .withMessage('Repair bay code is required'),
  body('status').optional().isIn(['AVAILABLE', 'MAINTENANCE', 'BLOCKED'])
    .withMessage('Invalid repair bay status'),
  body('capacity').optional().isInt({ min: 1 })
    .withMessage('Capacity must be at least 1'),
  body('equipment').optional().isArray()
    .withMessage('Equipment must be an array'),
  body('location').optional().trim().isLength({ max: 160 })
    .withMessage('Location cannot exceed 160 characters'),
  body('hourly_rate').optional().isFloat({ min: 0 })
    .withMessage('Hourly rate cannot be negative')
];

const updateRepairBayValidation = [
  body('name').optional().trim().isLength({ min: 1, max: 120 })
    .withMessage('Repair bay name cannot exceed 120 characters'),
  body('code').optional().trim().isLength({ min: 1, max: 40 })
    .withMessage('Repair bay code cannot exceed 40 characters'),
  body('status').optional().isIn(['AVAILABLE', 'MAINTENANCE', 'BLOCKED'])
    .withMessage('Invalid repair bay status'),
  body('capacity').optional().isInt({ min: 1 })
    .withMessage('Capacity must be at least 1'),
  body('equipment').optional().isArray()
    .withMessage('Equipment must be an array'),
  body('location').optional().trim().isLength({ max: 160 })
    .withMessage('Location cannot exceed 160 characters'),
  body('hourly_rate').optional().isFloat({ min: 0 })
    .withMessage('Hourly rate cannot be negative'),
  body('is_active').optional().isBoolean()
    .withMessage('is_active must be boolean')
];

const cancelAppointmentValidation = [
  body('reason').optional().trim().isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
];

// --- Routes ---

router.get('/appointments/statistics',
  ...managerOnly,
  query('period').optional().isInt({ min: 1, max: 365 }),
  validate,
  managerAppointmentController.getAppointmentStatistics
);

router.get('/appointments/calendar',
  ...managerOnly,
  query('start_date').notEmpty().isISO8601(),
  query('end_date').notEmpty().isISO8601(),
  query('staff_id').optional().isMongoId(),
  validate,
  managerAppointmentController.getAppointmentCalendar
);

router.get('/technicians',
  ...managerOnly,
  managerAppointmentController.getTechnicians
);

router.get('/technicians/:id/availability',
  ...managerOnly,
  param('id').isMongoId().withMessage('Invalid technician ID'),
  query('appointment_id').optional().isMongoId(),
  query('date').optional().isISO8601(),
  query('start_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  query('end_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  query('duration_minutes').optional().isInt({ min: 1 }),
  validate,
  managerAppointmentController.getTechnicianAvailability
);

router.get('/repair-bays',
  ...managerOnly,
  managerAppointmentController.getRepairBays
);

router.post('/repair-bays',
  ...managerOnly,
  createRepairBayValidation,
  validate,
  managerAppointmentController.createRepairBay
);

router.get('/repair-bays/:id/availability',
  ...managerOnly,
  param('id').isMongoId().withMessage('Invalid repair bay ID'),
  query('appointment_id').optional().isMongoId(),
  query('date').optional().isISO8601(),
  query('start_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  query('end_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  query('duration_minutes').optional().isInt({ min: 1 }),
  validate,
  managerAppointmentController.getRepairBayAvailability
);

router.put('/repair-bays/:id',
  ...managerOnly,
  param('id').isMongoId().withMessage('Invalid repair bay ID'),
  updateRepairBayValidation,
  validate,
  managerAppointmentController.updateRepairBay
);

router.delete('/repair-bays/:id',
  ...managerOnly,
  param('id').isMongoId().withMessage('Invalid repair bay ID'),
  validate,
  managerAppointmentController.deleteRepairBay
);

router.get('/appointments',
  ...managerOnly,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  query('customer_id').optional().isMongoId(),
  query('staff_id').optional(),
  query('service_id').optional().isMongoId(),
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
  validate,
  managerAppointmentController.getAllAppointments
);

router.get('/appointments/:id',
  ...managerOnly,
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  validate,
  managerAppointmentController.getAppointmentById
);

router.put('/appointments/:id',
  ...managerOnly,
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  updateAppointmentValidation,
  validate,
  managerAppointmentController.updateAppointment
);

router.put('/appointments/:id/status',
  ...managerOnly,
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  updateStatusValidation,
  validate,
  managerAppointmentController.updateAppointmentStatus
);

router.put('/appointments/:id/assign',
  ...managerOnly,
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  assignAppointmentValidation,
  validate,
  managerAppointmentController.assignAppointmentHandler
);

router.put('/appointments/:id/start',
  ...managerOnly,
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  validate,
  managerAppointmentController.startAppointmentHandler
);

router.put('/appointments/:id/complete',
  ...managerOnly,
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  completeAppointmentValidation,
  validate,
  managerAppointmentController.completeAppointmentHandler
);

router.delete('/appointments/:id',
  ...managerOnly,
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  cancelAppointmentValidation,
  validate,
  managerAppointmentController.cancelAppointment
);

router.post('/appointments/:id/assign-staff',
  ...managerOnly,
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  assignStaffValidation,
  validate,
  managerAppointmentController.assignStaff
);

module.exports = router;
