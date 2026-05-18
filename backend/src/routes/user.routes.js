const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { 
  updateProfileValidation, 
  changePasswordValidation, 
  validate 
} = require('../middleware/validator.middleware');

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, updateProfileValidation, validate, userController.updateProfile);

/**
 * @route   PUT /api/users/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', authenticate, changePasswordValidation, validate, userController.changePassword);

/**
 * @route   GET /api/users/activity-logs
 * @desc    Get user activity logs
 * @access  Private
 */
router.get('/activity-logs', authenticate, userController.getActivityLogs);

/**
 * @route   DELETE /api/users/account
 * @desc    Deactivate user account
 * @access  Private
 */
router.delete('/account', authenticate, userController.deactivateAccount);

module.exports = router;
