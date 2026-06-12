const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const managerStaffController = require('../controllers/manager.staff.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

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

const managerOnly = [authenticate, authorize('ADMIN', 'MANAGER')];
const mongoIdParam = param('id').isMongoId().withMessage('Invalid ID');
const timeQuery = [
  query('date').optional().isISO8601().withMessage('Invalid date'),
  query('start_time').notEmpty().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid start_time'),
  query('end_time').notEmpty().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid end_time'),
  query('appointment_id').optional().isMongoId().withMessage('Invalid appointment_id')
];

const scheduleValidation = [
  body('staff_id').notEmpty().isMongoId().withMessage('Valid staff_id is required'),
  body('work_date').notEmpty().isISO8601().withMessage('Valid work_date is required'),
  body('shift').notEmpty().isIn(['MORNING', 'AFTERNOON', 'FULL_DAY', 'CUSTOM']).withMessage('Invalid shift'),
  body('shift_start').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid shift_start'),
  body('shift_end').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid shift_end'),
  body('note').optional().trim().isLength({ max: 500 }).withMessage('Note too long')
];

const updateScheduleValidation = [
  body('shift').optional().isIn(['MORNING', 'AFTERNOON', 'FULL_DAY', 'CUSTOM']).withMessage('Invalid shift'),
  body('shift_start').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid shift_start'),
  body('shift_end').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid shift_end'),
  body('status').optional().isIn(['SCHEDULED', 'CONFIRMED', 'ABSENT', 'CANCELLED']).withMessage('Invalid status'),
  body('note').optional().trim().isLength({ max: 500 }).withMessage('Note too long')
];

router.get('/staff/available',
  ...managerOnly,
  timeQuery,
  validate,
  managerStaffController.getAvailableStaff
);

router.get('/staff/:id/availability',
  ...managerOnly,
  mongoIdParam,
  timeQuery,
  validate,
  managerStaffController.getStaffAvailability
);

router.get('/staff/:id/workload',
  ...managerOnly,
  mongoIdParam,
  query('date').optional().isISO8601().withMessage('Invalid date'),
  validate,
  managerStaffController.getStaffWorkload
);

router.get('/staff/:id',
  ...managerOnly,
  mongoIdParam,
  validate,
  managerStaffController.getManagerStaffById
);

router.get('/staff',
  ...managerOnly,
  query('search').optional().trim(),
  query('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
  query('page').optional().isInt({ min: 1 }).withMessage('Invalid page'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid limit'),
  validate,
  managerStaffController.getManagerStaff
);

router.post('/schedules',
  ...managerOnly,
  scheduleValidation,
  validate,
  managerStaffController.createSchedule
);

router.post('/schedules/bulk',
  ...managerOnly,
  body('schedules').isArray({ min: 1, max: 50 }).withMessage('schedules must contain 1-50 items'),
  validate,
  managerStaffController.bulkCreateSchedules
);

router.get('/schedules',
  ...managerOnly,
  query('date').optional().isISO8601().withMessage('Invalid date'),
  query('week').optional().matches(/^\d{4}-W\d{2}$/).withMessage('Invalid week'),
  query('month').optional().matches(/^\d{4}-\d{2}$/).withMessage('Invalid month'),
  query('staff_id').optional().isMongoId().withMessage('Invalid staff_id'),
  validate,
  managerStaffController.getSchedules
);

router.put('/schedules/:id',
  ...managerOnly,
  mongoIdParam,
  updateScheduleValidation,
  validate,
  managerStaffController.updateSchedule
);

router.delete('/schedules/:id',
  ...managerOnly,
  mongoIdParam,
  validate,
  managerStaffController.cancelSchedule
);

router.get('/attendance',
  ...managerOnly,
  query('date').optional().isISO8601().withMessage('Invalid date'),
  query('date_from').optional().isISO8601().withMessage('Invalid date_from'),
  query('date_to').optional().isISO8601().withMessage('Invalid date_to'),
  query('staff_id').optional().isMongoId().withMessage('Invalid staff_id'),
  validate,
  managerStaffController.getManagerAttendance
);

router.post('/attendance/manual',
  ...managerOnly,
  body('staff_id').notEmpty().isMongoId().withMessage('Valid staff_id is required'),
  body('work_date').notEmpty().isISO8601().withMessage('Valid work_date is required'),
  body('check_in_at').notEmpty().isISO8601().withMessage('Valid check_in_at is required'),
  body('check_out_at').optional().isISO8601().withMessage('Valid check_out_at is required'),
  body('note').optional().trim().isLength({ max: 500 }).withMessage('Note too long'),
  validate,
  managerStaffController.createManualAttendance
);

router.put('/attendance/:id',
  ...managerOnly,
  mongoIdParam,
  body('check_in_at').optional().isISO8601().withMessage('Valid check_in_at is required'),
  body('check_out_at').optional({ nullable: true }).isISO8601().withMessage('Valid check_out_at is required'),
  body('check_in_note').optional().trim().isLength({ max: 500 }).withMessage('Check-in note too long'),
  body('check_out_note').optional().trim().isLength({ max: 500 }).withMessage('Check-out note too long'),
  validate,
  managerStaffController.updateAttendance
);

router.get('/reports/staff-performance',
  ...managerOnly,
  query('period').optional().isInt({ min: 1, max: 365 }).withMessage('Invalid period'),
  validate,
  managerStaffController.getStaffPerformanceReport
);

router.get('/reports/attendance-summary',
  ...managerOnly,
  query('month').optional().matches(/^\d{4}-\d{2}$/).withMessage('Invalid month'),
  validate,
  managerStaffController.getAttendanceSummaryReport
);

router.get('/reports/staff/:id/performance',
  ...managerOnly,
  mongoIdParam,
  query('period').optional().isInt({ min: 1, max: 365 }).withMessage('Invalid period'),
  validate,
  managerStaffController.getStaffPerformanceById
);

router.post('/appointments/:id/assign',
  ...managerOnly,
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  body('staff_id').notEmpty().isMongoId().withMessage('Valid staff_id is required'),
  body('repair_bay_id').notEmpty().isMongoId().withMessage('Valid repair_bay_id is required'),
  body('start_time').notEmpty().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid start_time'),
  body('note').optional().trim().isLength({ max: 500 }).withMessage('Note too long'),
  validate,
  managerStaffController.assignAppointmentWithSchedule
);

module.exports = router;
