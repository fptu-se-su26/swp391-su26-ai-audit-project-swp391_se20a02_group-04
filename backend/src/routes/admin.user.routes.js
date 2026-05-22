const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/admin.user.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { body, param, query, validationResult } = require('express-validator');

// Validation middleware
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

// Validation rules
const updateUserValidation = [
  body('full_name').optional().trim().isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('phone').optional().matches(/^[0-9]{10,11}$/)
    .withMessage('Phone must be 10-11 digits'),
  body('email').optional().isEmail()
    .withMessage('Invalid email format'),
  body('verified').optional().isBoolean()
    .withMessage('Verified must be boolean'),
  body('is_active').optional().isBoolean()
    .withMessage('is_active must be boolean')
];

const assignRoleValidation = [
  body('role_name').notEmpty().trim()
    .isIn(['ADMIN', 'MANAGER', 'STAFF', 'CUSTOMER'])
    .withMessage('Invalid role name')
];

const lockUserValidation = [
  body('duration').optional().isInt({ min: 1, max: 10080 })
    .withMessage('Duration must be between 1 and 10080 minutes (7 days)'),
  body('reason').optional().trim().isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
];

/**
 * @route   GET /api/admin/dashboard/statistics
 * @desc    Get dashboard statistics
 * @access  Private/Admin
 */
router.get('/dashboard/statistics',
  authenticate,
  authorize('ADMIN'),
  query('period').optional().isInt({ min: 1, max: 365 }),
  validate,
  adminUserController.getDashboardStatistics
);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filters
 * @access  Private/Admin
 */
router.get('/users',
  authenticate,
  authorize('ADMIN'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('role').optional().isIn(['ADMIN', 'MANAGER', 'STAFF', 'CUSTOMER']),
  query('verified').optional().isIn(['true', 'false']),
  query('is_active').optional().isIn(['true', 'false']),
  validate,
  adminUserController.getAllUsers
);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID
 * @access  Private/Admin
 */
router.get('/users/:id',
  authenticate,
  authorize('ADMIN'),
  param('id').isMongoId().withMessage('Invalid user ID'),
  validate,
  adminUserController.getUserById
);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user information
 * @access  Private/Admin
 */
router.put('/users/:id',
  authenticate,
  authorize('ADMIN'),
  param('id').isMongoId().withMessage('Invalid user ID'),
  updateUserValidation,
  validate,
  adminUserController.updateUser
);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete/Deactivate user
 * @access  Private/Admin
 */
router.delete('/users/:id',
  authenticate,
  authorize('ADMIN'),
  param('id').isMongoId().withMessage('Invalid user ID'),
  query('permanent').optional().isIn(['true', 'false']),
  validate,
  adminUserController.deleteUser
);

/**
 * @route   POST /api/admin/users/:id/roles
 * @desc    Assign role to user
 * @access  Private/Admin
 */
router.post('/users/:id/roles',
  authenticate,
  authorize('ADMIN'),
  param('id').isMongoId().withMessage('Invalid user ID'),
  assignRoleValidation,
  validate,
  adminUserController.assignRole
);

/**
 * @route   DELETE /api/admin/users/:id/roles/:roleId
 * @desc    Remove role from user
 * @access  Private/Admin
 */
router.delete('/users/:id/roles/:roleId',
  authenticate,
  authorize('ADMIN'),
  param('id').isMongoId().withMessage('Invalid user ID'),
  param('roleId').isMongoId().withMessage('Invalid role ID'),
  validate,
  adminUserController.removeRole
);

/**
 * @route   GET /api/admin/users/:id/audit-logs
 * @desc    Get user audit logs
 * @access  Private/Admin
 */
router.get('/users/:id/audit-logs',
  authenticate,
  authorize('ADMIN'),
  param('id').isMongoId().withMessage('Invalid user ID'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
  adminUserController.getUserAuditLogs
);

/**
 * @route   PUT /api/admin/users/:id/lock
 * @desc    Lock user account
 * @access  Private/Admin
 */
router.put('/users/:id/lock',
  authenticate,
  authorize('ADMIN'),
  param('id').isMongoId().withMessage('Invalid user ID'),
  lockUserValidation,
  validate,
  adminUserController.lockUser
);

/**
 * @route   PUT /api/admin/users/:id/unlock
 * @desc    Unlock user account
 * @access  Private/Admin
 */
router.put('/users/:id/unlock',
  authenticate,
  authorize('ADMIN'),
  param('id').isMongoId().withMessage('Invalid user ID'),
  validate,
  adminUserController.unlockUser
);

module.exports = router;
