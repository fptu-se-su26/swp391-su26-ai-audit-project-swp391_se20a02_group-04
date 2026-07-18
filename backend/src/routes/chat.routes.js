const express = require('express');
const { body } = require('express-validator');
const { validationResult } = require('express-validator');
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

router.use(authenticate);

/**
 * @route   GET /api/chat/my
 * @desc    Get or create current customer's conversation
 * @access  Private/Customer
 */
router.get('/my', authorize('CUSTOMER'), chatController.getMyConversation);

/**
 * @route   POST /api/chat/my/messages
 * @desc    Customer sends a chat message
 * @access  Private/Customer
 */
router.post(
  '/my/messages',
  authorize('CUSTOMER'),
  messageValidation,
  validate,
  chatController.sendMyMessage
);

module.exports = router;
