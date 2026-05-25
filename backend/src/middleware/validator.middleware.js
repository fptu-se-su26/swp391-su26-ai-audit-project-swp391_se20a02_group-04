const { body, validationResult, param, query } = require('express-validator');
const { validationErrorResponse } = require('../utils/response.util');
const {
  APPOINTMENT_STATUSES,
  DEFAULT_TIMEZONE_OFFSET,
  MAX_ADVANCE_BOOKING_DAYS,
  SERVICE_TYPES,
  TIME_SLOTS,
  getServicePackage
} = require('../constants/appointment.constants');

const isValidDateString = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const buildAppointmentStartAt = (date, timeSlot) => {
  return new Date(`${date}T${timeSlot}:00${DEFAULT_TIMEZONE_OFFSET}`);
};

const normalizePhone = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.startsWith('+84') ? `0${trimmed.slice(3)}` : trimmed;
};

const validateAllowedBodyFields = (allowedFields = []) => {
  return (req, res, next) => {
    const unknownFields = Object.keys(req.body || {}).filter(field => !allowedFields.includes(field));

    if (unknownFields.length > 0) {
      return validationErrorResponse(res, unknownFields.map(field => ({
        field,
        message: `Field "${field}" is not allowed`,
        value: req.body[field]
      })));
    }

    next();
  };
};

const validateAllowedQueryFields = (allowedFields = []) => {
  return (req, res, next) => {
    const unknownFields = Object.keys(req.query || {}).filter(field => !allowedFields.includes(field));

    if (unknownFields.length > 0) {
      return validationErrorResponse(res, unknownFields.map(field => ({
        field,
        message: `Query parameter "${field}" is not allowed`,
        value: req.query[field]
      })));
    }

    next();
  };
};

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
 * Validation rules for customer appointment creation
 */
const createAppointmentValidation = [
  body('service_type')
    .trim()
    .notEmpty().withMessage('Service type is required')
    .isString().withMessage('Service type must be a string')
    .customSanitizer(value => typeof value === 'string' ? value.toUpperCase() : value)
    .isIn(SERVICE_TYPES).withMessage(`Service type must be one of: ${SERVICE_TYPES.join(', ')}`),

  body('service_package')
    .customSanitizer(value => typeof value === 'string' ? value.trim() : value)
    .custom((value, { req }) => {
      const serviceType = req.body.service_type;

      if (!SERVICE_TYPES.includes(serviceType)) {
        return true;
      }

      if (serviceType === 'REPAIR') {
        if (value !== undefined && value !== null && value !== '') {
          throw new Error('Service package is not allowed for repair appointments');
        }
        return true;
      }

      if (value === undefined || value === null || value === '') {
        throw new Error('Service package is required for wash and maintenance appointments');
      }

      if (typeof value !== 'string') {
        throw new Error('Service package must be a string');
      }

      if (!getServicePackage(serviceType, value)) {
        throw new Error('Service package is not valid for selected service type');
      }

      return true;
    }),

  body('repair_issue')
    .customSanitizer(value => typeof value === 'string' ? value.trim() : value)
    .custom((value, { req }) => {
      const serviceType = req.body.service_type;

      if (serviceType === 'REPAIR') {
        if (value === undefined || value === null || value === '') {
          throw new Error('Repair issue is required for repair appointments');
        }

        if (typeof value !== 'string') {
          throw new Error('Repair issue must be a string');
        }

        if (value.length < 3 || value.length > 100) {
          throw new Error('Repair issue must be between 3-100 characters');
        }

        return true;
      }

      if (value !== undefined && value !== null && value !== '') {
        throw new Error('Repair issue is only allowed for repair appointments');
      }

      return true;
    }),

  body('issue_description')
    .customSanitizer(value => typeof value === 'string' ? value.trim() : value)
    .custom((value, { req }) => {
      if (value === undefined || value === null || value === '') {
        return true;
      }

      if (req.body.service_type !== 'REPAIR') {
        throw new Error('Issue description is only allowed for repair appointments');
      }

      if (typeof value !== 'string') {
        throw new Error('Issue description must be a string');
      }

      if (value.length > 1000) {
        throw new Error('Issue description must not exceed 1000 characters');
      }

      return true;
    }),

  body('vehicle_brand')
    .trim()
    .notEmpty().withMessage('Vehicle brand is required')
    .isString().withMessage('Vehicle brand must be a string')
    .isLength({ min: 2, max: 50 }).withMessage('Vehicle brand must be between 2-50 characters')
    .matches(/^[a-zA-Z0-9\s.&-]+$/).withMessage('Vehicle brand can only contain letters, numbers, spaces, dot, ampersand, and hyphen'),

  body('vehicle_model')
    .trim()
    .notEmpty().withMessage('Vehicle model is required')
    .isString().withMessage('Vehicle model must be a string')
    .isLength({ min: 1, max: 50 }).withMessage('Vehicle model must be between 1-50 characters')
    .matches(/^[a-zA-Z0-9\s.&-]+$/).withMessage('Vehicle model can only contain letters, numbers, spaces, dot, ampersand, and hyphen'),

  body('license_plate')
    .trim()
    .notEmpty().withMessage('License plate is required')
    .isString().withMessage('License plate must be a string')
    .isLength({ min: 5, max: 15 }).withMessage('License plate must be between 5-15 characters')
    .matches(/^[0-9]{2}[a-zA-Z][0-9a-zA-Z]?[-.\s]?[0-9]{3,5}(\.[0-9]{2})?$/)
    .withMessage('License plate must be a valid Vietnamese motorcycle plate, for example 59A1-23456')
    .customSanitizer(value => typeof value === 'string' ? value.toUpperCase().replace(/\s+/g, '') : value),

  body('odometer')
    .optional()
    .isInt({ min: 0, max: 999999 }).withMessage('Odometer must be an integer between 0 and 999999')
    .toInt(),

  body('appointment_date')
    .trim()
    .notEmpty().withMessage('Appointment date is required')
    .custom(value => {
      if (!isValidDateString(value)) {
        throw new Error('Appointment date must be a valid date in YYYY-MM-DD format');
      }

      const appointmentDate = buildAppointmentStartAt(value, '00:00');
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + MAX_ADVANCE_BOOKING_DAYS);

      if (appointmentDate > maxDate) {
        throw new Error(`Appointment date cannot be more than ${MAX_ADVANCE_BOOKING_DAYS} days in advance`);
      }

      return true;
    }),

  body('time_slot')
    .trim()
    .notEmpty().withMessage('Time slot is required')
    .isIn(TIME_SLOTS).withMessage(`Time slot must be one of: ${TIME_SLOTS.join(', ')}`)
    .custom((value, { req }) => {
      if (!isValidDateString(req.body.appointment_date)) {
        return true;
      }

      const appointmentStartAt = buildAppointmentStartAt(req.body.appointment_date, value);

      if (appointmentStartAt <= new Date()) {
        throw new Error('Appointment time must be in the future');
      }

      return true;
    }),

  body('contact_phone')
    .optional()
    .customSanitizer(normalizePhone)
    .matches(/^(0)[0-9]{9,10}$/).withMessage('Contact phone must be a valid Vietnamese phone number'),

  body('note')
    .optional()
    .trim()
    .isString().withMessage('Note must be a string')
    .isLength({ max: 500 }).withMessage('Note must not exceed 500 characters')
];

/**
 * Validation rules for customer appointment list
 */
const listCustomerAppointmentsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be an integer greater than 0')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be an integer between 1 and 100')
    .toInt(),

  query('status')
    .optional()
    .trim()
    .customSanitizer(value => typeof value === 'string' ? value.toUpperCase() : value)
    .isIn(APPOINTMENT_STATUSES).withMessage(`Status must be one of: ${APPOINTMENT_STATUSES.join(', ')}`),

  query('from_date')
    .optional()
    .trim()
    .custom(value => {
      if (!isValidDateString(value)) {
        throw new Error('From date must be a valid date in YYYY-MM-DD format');
      }
      return true;
    }),

  query('to_date')
    .optional()
    .trim()
    .custom((value, { req }) => {
      if (!isValidDateString(value)) {
        throw new Error('To date must be a valid date in YYYY-MM-DD format');
      }

      if (req.query.from_date && isValidDateString(req.query.from_date) && value < req.query.from_date) {
        throw new Error('To date must be greater than or equal to from date');
      }

      return true;
    })
];

/**
 * Validation rules for appointment id param
 */
const appointmentIdValidation = [
  param('id')
    .notEmpty().withMessage('Appointment ID is required')
    .isMongoId().withMessage('Appointment ID must be a valid MongoDB ObjectId')
];

/**
 * Validation rules for customer appointment cancel
 */
const cancelAppointmentValidation = [
  body('cancel_reason')
    .optional()
    .trim()
    .isString().withMessage('Cancel reason must be a string')
    .isLength({ min: 3, max: 300 }).withMessage('Cancel reason must be between 3-300 characters')
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
  createAppointmentValidation,
  listCustomerAppointmentsValidation,
  appointmentIdValidation,
  cancelAppointmentValidation,
  validateAllowedBodyFields,
  validateAllowedQueryFields,
  validate
};
