const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { validationResult } = require('express-validator');
const reminderController = require('../controllers/admin.reminder.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

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
 * @route   GET /api/admin/reminders/due
 * @desc    Preview customers due for maintenance reminder
 * @access  Private/Admin|Manager
 */
router.get(
  '/reminders/due',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  query('lookback_days').optional().isInt({ min: 1, max: 90 }),
  validate,
  reminderController.listDueReminders
);

/**
 * @route   GET /api/admin/reminders
 * @desc    List reminder send history
 * @access  Private/Admin|Manager
 */
router.get(
  '/reminders',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  query('status').optional().isIn(['PENDING', 'SENT', 'FAILED', 'SKIPPED', 'pending', 'sent', 'failed', 'skipped']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
  reminderController.listReminders
);

/**
 * @route   POST /api/admin/reminders/run
 * @desc    Manually run reminder job (or dry-run preview)
 * @access  Private/Admin|Manager
 */
router.post(
  '/reminders/run',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  body('dry_run').optional().isBoolean(),
  body('lookback_days').optional().isInt({ min: 1, max: 90 }),
  validate,
  reminderController.runReminders
);

module.exports = router;
