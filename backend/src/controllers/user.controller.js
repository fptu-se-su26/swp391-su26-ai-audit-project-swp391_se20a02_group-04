const User = require('../models/User.model');
const UserAudit = require('../models/UserAudit.model');
const { successResponse, errorResponse } = require('../utils/response.util');

/**
 * Update user profile
 * PUT /api/users/profile
 */
const updateProfile = async (req, res) => {
  try {
    const { full_name, phone } = req.body;
    const userId = req.user.userId;

    // Check if phone is being changed and already exists
    if (phone) {
      const existingUser = await User.findOne({ 
        phone, 
        _id: { $ne: userId } 
      });

      if (existingUser) {
        return errorResponse(res, 409, 'Phone number already in use');
      }
    }

    // Update user
    const user = await User.findById(userId);

    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    const oldValues = {
      full_name: user.full_name,
      phone: user.phone
    };

    if (full_name !== undefined) user.full_name = full_name;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    // Log audit
    await UserAudit.create({
      user_id: userId,
      action: 'PROFILE_UPDATE',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        old_values: oldValues,
        new_values: {
          full_name: user.full_name,
          phone: user.phone
        }
      }
    });

    return successResponse(res, 200, 'Profile updated successfully', {
      user: user.toSafeObject()
    });

  } catch (error) {
    console.error('Update profile error:', error);
    return errorResponse(res, 500, 'Failed to update profile');
  }
};

/**
 * Change password
 * PUT /api/users/change-password
 */
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.userId;

    // Get user with password
    const user = await User.findById(userId).select('+password_hash');

    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(current_password);

    if (!isPasswordValid) {
      // Log failed attempt
      await UserAudit.create({
        user_id: userId,
        action: 'PASSWORD_CHANGE',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        status: 'FAILED',
        error_message: 'Invalid current password'
      });

      return errorResponse(res, 401, 'Current password is incorrect');
    }

    // Update password
    user.password_hash = new_password; // Will be hashed by pre-save hook
    await user.save();

    // Log successful password change
    await UserAudit.create({
      user_id: userId,
      action: 'PASSWORD_CHANGE',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS'
    });

    return successResponse(res, 200, 'Password changed successfully');

  } catch (error) {
    console.error('Change password error:', error);
    return errorResponse(res, 500, 'Failed to change password');
  }
};

/**
 * Get user activity logs
 * GET /api/users/activity-logs
 */
const getActivityLogs = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, action } = req.query;

    const query = { user_id: userId };
    
    if (action) {
      query.action = action.toUpperCase();
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      UserAudit.find(query)
        .sort({ created_at: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .select('-__v'),
      UserAudit.countDocuments(query)
    ]);

    return successResponse(res, 200, 'Activity logs retrieved', {
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get activity logs error:', error);
    return errorResponse(res, 500, 'Failed to retrieve activity logs');
  }
};

/**
 * Deactivate user account
 * DELETE /api/users/account
 */
const deactivateAccount = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);

    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    user.is_active = false;
    await user.save();

    // Log deactivation
    await UserAudit.create({
      user_id: userId,
      action: 'PROFILE_UPDATE',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: { action: 'account_deactivated' }
    });

    return successResponse(res, 200, 'Account deactivated successfully');

  } catch (error) {
    console.error('Deactivate account error:', error);
    return errorResponse(res, 500, 'Failed to deactivate account');
  }
};

module.exports = {
  updateProfile,
  changePassword,
  getActivityLogs,
  deactivateAccount
};
