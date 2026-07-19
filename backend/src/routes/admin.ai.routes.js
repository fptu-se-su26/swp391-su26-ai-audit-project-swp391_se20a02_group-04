const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const aiController = require('../controllers/ai.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validationResult } = require('express-validator');

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
 * @route   GET /api/admin/ai/status
 * @desc    AI assistant readiness
 * @access  Private/Admin|Manager
 */
router.get(
  '/ai/status',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  aiController.status
);

/**
 * @route   POST /api/admin/ai/ask
 * @desc    Ask admin operations assistant (tool-calling / fallback)
 * @access  Private/Admin|Manager
 */
router.post(
  '/ai/ask',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  body('message')
    .isString()
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('message is required (1-2000 chars)'),
  body('history')
    .optional()
    .isArray({ max: 20 })
    .withMessage('history must be an array'),
  body('history.*.role')
    .optional()
    .isIn(['user', 'assistant'])
    .withMessage('history role must be user or assistant'),
  body('history.*.content')
    .optional()
    .isString()
    .isLength({ max: 2000 }),
  validate,
  aiController.ask
);

module.exports = router;
