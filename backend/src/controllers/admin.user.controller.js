const User = require('../models/User.model');
const UserRole = require('../models/UserRole.model');
const Role = require('../models/Role.model');
const UserAudit = require('../models/UserAudit.model');
const Appointment = require('../models/Appointment.model');
const { successResponse, errorResponse } = require('../utils/response.util');

/**
 * Get all users with filters and pagination
 * GET /api/admin/users
 */
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      role = '',
      verified = '',
      is_active = '',
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    // Build query
    const query = {};

    // Search by email, phone, or full_name
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { full_name: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by verified status
    if (verified !== '') {
      query.verified = verified === 'true';
    }

    // Filter by active status
    if (is_active !== '') {
      query.is_active = is_active === 'true';
    }

    const skip = (page - 1) * limit;
    const sortOrder = sort_order === 'asc' ? 1 : -1;

    // Get users
    let users = await User.find(query)
      .sort({ [sort_by]: sortOrder })
      .limit(parseInt(limit))
      .skip(skip)
      .select('-password_hash -verification_token -reset_password_token');

    const total = await User.countDocuments(query);

    // Get roles for each user
    const userIds = users.map(u => u._id);
    const userRoles = await UserRole.find({ user_id: { $in: userIds } })
      .populate('role_id', 'role_name');

    // Map roles to users
    const usersWithRoles = users.map(user => {
      const userObj = user.toObject();
      const roles = userRoles
        .filter(ur => ur.user_id.toString() === user._id.toString())
        .map(ur => ur.role_id?.role_name)
        .filter(Boolean);
      
      return {
        ...userObj,
        roles
      };
    });

    // Filter by role if specified
    let filteredUsers = usersWithRoles;
    if (role) {
      filteredUsers = usersWithRoles.filter(user => 
        user.roles.includes(role.toUpperCase())
      );
    }

    return successResponse(res, 200, 'Users retrieved successfully', {
      users: filteredUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: role ? filteredUsers.length : total,
        pages: Math.ceil((role ? filteredUsers.length : total) / limit)
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    return errorResponse(res, 500, 'Failed to retrieve users');
  }
};

/**
 * Get user by ID with detailed information
 * GET /api/admin/users/:id
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select('-password_hash -verification_token -reset_password_token');

    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    // Get user roles
    const userRoles = await UserRole.find({ user_id: id })
      .populate('role_id', 'role_name description permissions');

    // Get user statistics
    const [totalAppointments, completedAppointments, cancelledAppointments] = await Promise.all([
      Appointment.countDocuments({ customer_id: id }),
      Appointment.countDocuments({ customer_id: id, status: 'COMPLETED' }),
      Appointment.countDocuments({ customer_id: id, status: 'CANCELLED' })
    ]);

    // Get recent activity
    const recentActivity = await UserAudit.find({ user_id: id })
      .sort({ created_at: -1 })
      .limit(10)
      .select('-__v');

    const userObj = user.toObject();
    
    return successResponse(res, 200, 'User retrieved successfully', {
      user: {
        ...userObj,
        roles: userRoles.map(ur => ur.role_id).filter(Boolean),
        statistics: {
          total_appointments: totalAppointments,
          completed_appointments: completedAppointments,
          cancelled_appointments: cancelledAppointments
        },
        recent_activity: recentActivity
      }
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    return errorResponse(res, 500, 'Failed to retrieve user');
  }
};

/**
 * Update user information
 * PUT /api/admin/users/:id
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, email, verified, is_active } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    // Check if email is being changed and already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        return errorResponse(res, 409, 'Email already in use');
      }
    }

    // Check if phone is being changed and already exists
    if (phone && phone !== user.phone) {
      const existingUser = await User.findOne({ phone, _id: { $ne: id } });
      if (existingUser) {
        return errorResponse(res, 409, 'Phone number already in use');
      }
    }

    const oldValues = {
      full_name: user.full_name,
      phone: user.phone,
      email: user.email,
      verified: user.verified,
      is_active: user.is_active
    };

    // Update fields
    if (full_name !== undefined) user.full_name = full_name;
    if (phone !== undefined) user.phone = phone;
    if (email !== undefined) user.email = email;
    if (verified !== undefined) {
      user.verified = verified;
      if (verified) {
        user.email_verified_at = new Date();
      }
    }
    if (is_active !== undefined) user.is_active = is_active;

    await user.save();

    // Log audit
    await UserAudit.create({
      user_id: id,
      action: 'ADMIN_UPDATE',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        updated_by: req.user.userId,
        old_values: oldValues,
        new_values: {
          full_name: user.full_name,
          phone: user.phone,
          email: user.email,
          verified: user.verified,
          is_active: user.is_active
        }
      }
    });

    return successResponse(res, 200, 'User updated successfully', {
      user: user.toSafeObject()
    });

  } catch (error) {
    console.error('Update user error:', error);
    return errorResponse(res, 500, 'Failed to update user');
  }
};

/**
 * Delete/Deactivate user
 * DELETE /api/admin/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    const user = await User.findById(id);

    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    // Prevent deleting yourself
    if (id === req.user.userId.toString()) {
      return errorResponse(res, 400, 'Cannot delete your own account');
    }

    if (permanent === 'true') {
      // Permanent deletion (use with caution)
      await User.findByIdAndDelete(id);
      
      // Log audit
      await UserAudit.create({
        user_id: id,
        action: 'ADMIN_DELETE',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        status: 'SUCCESS',
        metadata: {
          deleted_by: req.user.userId,
          permanent: true
        }
      });

      return successResponse(res, 200, 'User permanently deleted');
    } else {
      // Soft delete (deactivate)
      user.is_active = false;
      await user.save();

      // Log audit
      await UserAudit.create({
        user_id: id,
        action: 'ADMIN_DEACTIVATE',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        status: 'SUCCESS',
        metadata: {
          deactivated_by: req.user.userId
        }
      });

      return successResponse(res, 200, 'User deactivated successfully');
    }

  } catch (error) {
    console.error('Delete user error:', error);
    return errorResponse(res, 500, 'Failed to delete user');
  }
};

/**
 * Assign role to user
 * POST /api/admin/users/:id/roles
 */
const assignRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role_name } = req.body;

    if (!role_name) {
      return errorResponse(res, 400, 'Role name is required');
    }

    const user = await User.findById(id);
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    const role = await Role.findOne({ role_name: role_name.toUpperCase() });
    if (!role) {
      return errorResponse(res, 404, 'Role not found');
    }

    // Check if user already has this role
    const existingUserRole = await UserRole.findOne({
      user_id: id,
      role_id: role._id
    });

    if (existingUserRole) {
      return errorResponse(res, 409, 'User already has this role');
    }

    // Assign role
    await UserRole.create({
      user_id: id,
      role_id: role._id
    });

    // Log audit
    await UserAudit.create({
      user_id: id,
      action: 'ROLE_ASSIGNED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        assigned_by: req.user.userId,
        role_name: role.role_name
      }
    });

    return successResponse(res, 200, 'Role assigned successfully', {
      role: role.role_name
    });

  } catch (error) {
    console.error('Assign role error:', error);
    return errorResponse(res, 500, 'Failed to assign role');
  }
};

/**
 * Remove role from user
 * DELETE /api/admin/users/:id/roles/:roleId
 */
const removeRole = async (req, res) => {
  try {
    const { id, roleId } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    const role = await Role.findById(roleId);
    if (!role) {
      return errorResponse(res, 404, 'Role not found');
    }

    const userRole = await UserRole.findOneAndDelete({
      user_id: id,
      role_id: roleId
    });

    if (!userRole) {
      return errorResponse(res, 404, 'User does not have this role');
    }

    // Log audit
    await UserAudit.create({
      user_id: id,
      action: 'ROLE_REMOVED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        removed_by: req.user.userId,
        role_name: role.role_name
      }
    });

    return successResponse(res, 200, 'Role removed successfully');

  } catch (error) {
    console.error('Remove role error:', error);
    return errorResponse(res, 500, 'Failed to remove role');
  }
};

/**
 * Get user audit logs
 * GET /api/admin/users/:id/audit-logs
 */
const getUserAuditLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, action = '' } = req.query;

    const user = await User.findById(id);
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    const query = { user_id: id };
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

    return successResponse(res, 200, 'Audit logs retrieved successfully', {
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    return errorResponse(res, 500, 'Failed to retrieve audit logs');
  }
};

/**
 * Lock user account
 * PUT /api/admin/users/:id/lock
 */
const lockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { duration = 30, reason = '' } = req.body; // duration in minutes

    const user = await User.findById(id);
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    // Prevent locking yourself
    if (id === req.user.userId.toString()) {
      return errorResponse(res, 400, 'Cannot lock your own account');
    }

    user.account_locked_until = new Date(Date.now() + duration * 60 * 1000);
    await user.save();

    // Log audit
    await UserAudit.create({
      user_id: id,
      action: 'ACCOUNT_LOCKED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        locked_by: req.user.userId,
        duration_minutes: duration,
        reason,
        locked_until: user.account_locked_until
      }
    });

    return successResponse(res, 200, 'User account locked successfully', {
      locked_until: user.account_locked_until
    });

  } catch (error) {
    console.error('Lock user error:', error);
    return errorResponse(res, 500, 'Failed to lock user account');
  }
};

/**
 * Unlock user account
 * PUT /api/admin/users/:id/unlock
 */
const unlockUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    user.account_locked_until = undefined;
    user.failed_login_attempts = 0;
    await user.save();

    // Log audit
    await UserAudit.create({
      user_id: id,
      action: 'ACCOUNT_UNLOCKED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        unlocked_by: req.user.userId
      }
    });

    return successResponse(res, 200, 'User account unlocked successfully');

  } catch (error) {
    console.error('Unlock user error:', error);
    return errorResponse(res, 500, 'Failed to unlock user account');
  }
};

/**
 * Get dashboard statistics
 * GET /api/admin/dashboard/statistics
 */
const getDashboardStatistics = async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // User statistics
    const [
      totalUsers,
      activeUsers,
      verifiedUsers,
      newUsers,
      totalAppointments,
      pendingAppointments,
      completedAppointments,
      todayAppointments
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ is_active: true }),
      User.countDocuments({ verified: true }),
      User.countDocuments({ created_at: { $gte: daysAgo } }),
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: 'PENDING' }),
      Appointment.countDocuments({ status: 'COMPLETED' }),
      Appointment.countDocuments({
        appointment_date: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      })
    ]);

    // Get user growth data (last 7 days)
    const userGrowth = await User.aggregate([
      {
        $match: {
          created_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get appointment statistics by status
    const appointmentsByStatus = await Appointment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get role distribution
    const roleDistribution = await UserRole.aggregate([
      {
        $lookup: {
          from: 'roles',
          localField: 'role_id',
          foreignField: '_id',
          as: 'role'
        }
      },
      { $unwind: '$role' },
      {
        $group: {
          _id: '$role.role_name',
          count: { $sum: 1 }
        }
      }
    ]);

    return successResponse(res, 200, 'Dashboard statistics retrieved successfully', {
      users: {
        total: totalUsers,
        active: activeUsers,
        verified: verifiedUsers,
        new_users: newUsers,
        inactive: totalUsers - activeUsers
      },
      appointments: {
        total: totalAppointments,
        pending: pendingAppointments,
        completed: completedAppointments,
        today: todayAppointments
      },
      charts: {
        user_growth: userGrowth,
        appointments_by_status: appointmentsByStatus,
        role_distribution: roleDistribution
      },
      period_days: parseInt(period)
    });

  } catch (error) {
    console.error('Get dashboard statistics error:', error);
    return errorResponse(res, 500, 'Failed to retrieve dashboard statistics');
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  assignRole,
  removeRole,
  getUserAuditLogs,
  lockUser,
  unlockUser,
  getDashboardStatistics
};
