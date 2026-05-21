const { verifyToken } = require('../utils/jwt.util');
const { errorResponse } = require('../utils/response.util');
const User = require('../models/User.model');
const UserRole = require('../models/UserRole.model');
const Role = require('../models/Role.model');

/**
 * Middleware to verify JWT token and authenticate user
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 401, 'No token provided. Please login.');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = verifyToken(token);

    // Check if user still exists
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return errorResponse(res, 401, 'User no longer exists');
    }

    if (!user.is_active) {
      return errorResponse(res, 401, 'User account is deactivated');
    }

    const userRoles = await UserRole.find({ user_id: user._id })
      .populate('role_id', 'role_name permissions is_active');

    const activeRoles = userRoles
      .filter(ur => ur.role_id && ur.role_id.is_active)
      .map(ur => ur.role_id);

    // Attach user to request
    req.user = {
      userId: user._id,
      email: user.email,
      phone: user.phone,
      verified: user.verified,
      roles: activeRoles.map(role => role.role_name),
      permissions: [...new Set(activeRoles.flatMap(role => role.permissions || []))]
    };

    next();
  } catch (error) {
    if (error.message === 'Token has expired') {
      return errorResponse(res, 401, 'Token has expired. Please login again.');
    }
    if (error.message === 'Invalid token') {
      return errorResponse(res, 401, 'Invalid token. Please login again.');
    }
    return errorResponse(res, 500, 'Authentication failed');
  }
};

/**
 * Middleware to check if user has required role(s)
 * @param  {...String} allowedRoles - Roles that are allowed to access
 */
const authorize = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.userId) {
        return errorResponse(res, 401, 'Authentication required');
      }

      const roleNames = req.user.roles || [];

      if (!roleNames.length) {
        return errorResponse(res, 403, 'No roles assigned to user');
      }

      // Check if user has any of the allowed roles
      const hasPermission = allowedRoles.some(role => 
        roleNames.includes(role.toUpperCase())
      );

      if (!hasPermission) {
        return errorResponse(
          res, 
          403, 
          `Access denied. Required roles: ${allowedRoles.join(', ')}`
        );
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return errorResponse(res, 500, 'Authorization failed');
    }
  };
};

/**
 * Middleware to check if user's email is verified
 */
const requireVerified = (req, res, next) => {
  if (!req.user || !req.user.verified) {
    return errorResponse(res, 403, 'Email verification required');
  }
  next();
};

module.exports = {
  authenticate,
  authorize,
  requireVerified
};
