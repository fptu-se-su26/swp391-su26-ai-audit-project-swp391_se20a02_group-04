const { body, validationResult, param } = require('express-validator');
const { validationErrorResponse } = require('../utils/response.util');

/**
 * Validation rules for user registration
 */
const registerValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email must not exceed 255 characters'),
  
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^(0|\+84)[0-9]{9,10}$/).withMessage('Phone number must be a valid Vietnamese phone number (10-11 digits starting with 0 or +84)')
    .customSanitizer(value => {
      // Normalize phone number to start with 0
      if (value.startsWith('+84')) {
        return '0' + value.substring(3);
      }
      return value;
    }),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)'),
  
  body('confirm_password')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
  
  body('full_name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2-100 characters')
    .matches(/^[a-zA-ZÀ-ỹ\s]+$/).withMessage('Full name can only contain letters and spaces')
];

/**
 * Validation rules for user login
 */
const loginValidation = [
  body('identifier')
    .trim()
    .notEmpty().withMessage('Email or phone number is required')
    .isLength({ max: 255 }).withMessage('Identifier must not exceed 255 characters'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
];

/**
 * Validation rules for Google OAuth login
 */
const googleAuthValidation = [
  body('id_token')
    .notEmpty().withMessage('Google ID token is required')
    .isString().withMessage('Invalid token format')
];

/**
 * Validation rules for email verification
 */
const verifyEmailValidation = [
  param('token')
    .notEmpty().withMessage('Verification token is required')
    .isLength({ min: 64, max: 64 }).withMessage('Invalid token format')
];

/**
 * Validation rules for resend verification email
 */
const resendVerificationValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
];

/**
 * Validation rules for forgot password
 */
const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
];

/**
 * Validation rules for reset password
 */
const resetPasswordValidation = [
  body('token')
    .notEmpty().withMessage('Reset token is required')
    .isLength({ min: 64, max: 64 }).withMessage('Invalid token format'),
  
  body('new_password')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)'),
  
  body('confirm_password')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => value === req.body.new_password)
    .withMessage('Passwords do not match')
];

/**
 * Validation rules for password change
 */
const changePasswordValidation = [
  body('current_password')
    .notEmpty().withMessage('Current password is required'),
  
  body('new_password')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)')
    .custom((value, { req }) => value !== req.body.current_password)
    .withMessage('New password must be different from current password'),
  
  body('confirm_password')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => value === req.body.new_password)
    .withMessage('Passwords do not match')
];

/**
 * Validation rules for profile update
 */
const updateProfileValidation = [
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2-100 characters')
    .matches(/^[a-zA-ZÀ-ỹ\s]+$/).withMessage('Full name can only contain letters and spaces'),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^(0|\+84)[0-9]{9,10}$/).withMessage('Phone number must be a valid Vietnamese phone number')
    .customSanitizer(value => {
      if (value && value.startsWith('+84')) {
        return '0' + value.substring(3);
      }
      return value;
    }),
  
  body('avatar_url')
    .optional()
    .trim()
    .isURL().withMessage('Avatar URL must be a valid URL')
];

/**
 * Validation rules for refresh token
 */
const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty().withMessage('Refresh token is required')
    .isString().withMessage('Invalid token format')
];

/**
 * Middleware to handle validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));
    return validationErrorResponse(res, formattedErrors);
  }
  
  next();
};

module.exports = {
  registerValidation,
  loginValidation,
  googleAuthValidation,
  verifyEmailValidation,
  resendVerificationValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
  updateProfileValidation,
  refreshTokenValidation,
  validate
};
