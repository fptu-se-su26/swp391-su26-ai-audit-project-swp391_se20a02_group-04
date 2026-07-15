const Notification = require('../models/Notification.model');
const { successResponse, errorResponse } = require('../utils/response.util');

/**
 * Get notifications for the logged-in user
 * GET /api/notifications
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ user_id: userId })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('appointment_id', 'appointment_code status service'),
      Notification.countDocuments({ user_id: userId }),
      Notification.countDocuments({ user_id: userId, is_read: false })
    ]);

    return successResponse(res, 200, 'Notifications retrieved successfully', {
      notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return errorResponse(res, 500, 'Failed to retrieve notifications');
  }
};

/**
 * Mark a specific notification as read
 * PATCH /api/notifications/:id/read
 */
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, user_id: userId },
      { is_read: true },
      { new: true }
    );

    if (!notification) {
      return errorResponse(res, 404, 'Notification not found');
    }

    return successResponse(res, 200, 'Notification marked as read successfully', {
      notification
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    return errorResponse(res, 500, 'Failed to mark notification as read');
  }
};

/**
 * Mark all notifications for the logged-in user as read
 * PATCH /api/notifications/read-all
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    await Notification.updateMany(
      { user_id: userId, is_read: false },
      { is_read: true }
    );

    return successResponse(res, 200, 'All notifications marked as read successfully');
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    return errorResponse(res, 500, 'Failed to mark all notifications as read');
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
