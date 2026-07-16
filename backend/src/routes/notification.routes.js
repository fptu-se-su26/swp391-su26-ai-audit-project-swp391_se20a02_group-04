const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Apply authentication middleware to all notification routes
router.use(authenticate);

/**
 * @route   GET /api/notifications
 * @desc    Get current user's notifications
 * @access  Private
 */
router.get('/', notificationController.getNotifications);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all user's notifications as read
 * @access  Private
 */
router.patch('/read-all', notificationController.markAllAsRead);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a single notification as read
 * @access  Private
 */
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
