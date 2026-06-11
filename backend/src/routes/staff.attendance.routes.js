const express = require('express');
const { body, query, validationResult } = require('express-validator');
const staffAttendanceController = require('../controllers/staff.attendance.controller');
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

const noteValidation = [
  body('note').optional().trim().isLength({ max: 500 }).withMessage('Note cannot exceed 500 characters')
];

router.get('/attendance/today',
  authenticate,
  authorize('STAFF', 'ADMIN', 'MANAGER'),
  staffAttendanceController.getTodayAttendance
);

router.post('/attendance/check-in',
  authenticate,
  authorize('STAFF', 'ADMIN', 'MANAGER'),
  noteValidation,
  validate,
  staffAttendanceController.checkIn
);

router.post('/attendance/check-out',
  authenticate,
  authorize('STAFF', 'ADMIN', 'MANAGER'),
  noteValidation,
  validate,
  staffAttendanceController.checkOut
);

router.get('/attendance/history',
  authenticate,
  authorize('STAFF', 'ADMIN', 'MANAGER'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('date_from').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date_from must use YYYY-MM-DD format'),
  query('date_to').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date_to must use YYYY-MM-DD format'),
  validate,
  staffAttendanceController.getAttendanceHistory
);

router.get('/attendance/summary',
  authenticate,
  authorize('STAFF', 'ADMIN', 'MANAGER'),
  query('period').optional().isInt({ min: 1, max: 365 }),
  validate,
  staffAttendanceController.getAttendanceSummary
);

module.exports = router;
