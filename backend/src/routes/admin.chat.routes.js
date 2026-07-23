const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const chatController = require('../controllers/chat.controller');
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
  return next();
};

const messageValidation = [
  body('text').trim().notEmpty().withMessage('Message text is required').isLength({ max: 2000 })
];

/**
 * @route   GET /api/admin/chat/conversations
 */
router.get(
  '/chat/conversations',
  authenticate,
  authorize('MANAGER'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['OPEN', 'WAITING_ADMIN', 'WAITING_CUSTOMER', 'RESOLVED']),
  validate,
  chatController.listConversations
);

/**
 * @route   GET /api/admin/chat/conversations/:id
 */
router.get(
  '/chat/conversations/:id',
  authenticate,
  authorize('MANAGER'),
  param('id').isMongoId(),
  validate,
  chatController.getConversationById
);

/**
 * @route   POST /api/admin/chat/conversations/:id/messages
 */
router.post(
  '/chat/conversations/:id/messages',
  authenticate,
  authorize('MANAGER'),
  param('id').isMongoId(),
  messageValidation,
  validate,
  chatController.sendStaffMessage
);

/**
 * @route   PATCH /api/admin/chat/conversations/:id/status
 */
router.patch(
  '/chat/conversations/:id/status',
  authenticate,
  authorize('MANAGER'),
  param('id').isMongoId(),
  body('status').isIn(['OPEN', 'WAITING_ADMIN', 'WAITING_CUSTOMER', 'RESOLVED']),
  validate,
  chatController.updateConversationStatus
);

module.exports = router;
