const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const appointmentController = require('../controllers/appointment.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  appointmentIdValidation,
  cancelAppointmentValidation,
  createAppointmentValidation,
  listCustomerAppointmentsValidation,
  reviewAppointmentValidation,
  validate,
  validateAllowedBodyFields,
  validateAllowedQueryFields
} = require('../middleware/validator.middleware');

const createAppointmentFields = [
  'service_type',
  'service_id',
  'service_package',
  'additional_service_type',
  'additional_service_id',
  'additional_service_package',
  'repair_issue',
  'issue_description',
  'vehicle_brand',
  'vehicle_model',
  'license_plate',
  'odometer',
  'appointment_date',
  'time_slot',
  'contact_phone',
  'note'
];

const normalizeCreateAppointmentBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    if (req.body.serviceId && !req.body.service_id) {
      req.body.service_id = req.body.serviceId;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'serviceId')) {
      delete req.body.serviceId;
    }
  }
  next();
};

/**
 * @route   GET /api/appointments/reviews
 * @desc    Public list of customer service reviews
 * @access  Public
 */
router.get('/reviews', appointmentController.getPublicReviews);

router.use(authenticate, authorize('CUSTOMER'));

/**
 * @route   POST /api/appointments
 * @desc    Create appointment as customer
 * @access  Private - CUSTOMER
 */
router.post(
  '/',
  normalizeCreateAppointmentBody,
  validateAllowedBodyFields(createAppointmentFields),
  createAppointmentValidation,
  validate,
  appointmentController.createAppointment
);

/**
 * @route   GET /api/appointments/my
 * @desc    Get current customer's appointments
 * @access  Private - CUSTOMER
 */
router.get(
  '/my',
  validateAllowedQueryFields(['page', 'limit', 'status', 'from_date', 'to_date']),
  listCustomerAppointmentsValidation,
  validate,
  appointmentController.getMyAppointments
);

/**
 * @route   GET /api/appointments/:id
 * @desc    Get current customer's appointment detail
 * @access  Private - CUSTOMER
 */
router.get(
  '/:id',
  appointmentIdValidation,
  validate,
  appointmentController.getMyAppointmentById
);

/**
 * @route   PATCH /api/appointments/:id/cancel
 * @desc    Cancel current customer's appointment
 * @access  Private - CUSTOMER
 */
router.patch(
  '/:id/cancel',
  validateAllowedBodyFields(['cancel_reason']),
  appointmentIdValidation,
  cancelAppointmentValidation,
  validate,
  appointmentController.cancelMyAppointment
);

/**
 * @route   POST /api/appointments/:id/review
 * @desc    Review a completed appointment
 * @access  Private - CUSTOMER
 */
router.post(
  '/:id/review',
  validateAllowedBodyFields(['rating', 'comment']),
  appointmentIdValidation,
  reviewAppointmentValidation,
  validate,
  appointmentController.reviewMyAppointment
);

/**
 * @route   PATCH /api/appointments/:id/parts-hold/consent
 * @desc    Customer agrees or declines waiting for missing parts
 * @access  Private - CUSTOMER
 */
router.patch(
  '/:id/parts-hold/consent',
  validateAllowedBodyFields(['decision', 'note']),
  appointmentIdValidation,
  body('decision').isIn(['APPROVED', 'DECLINED']).withMessage('decision must be APPROVED or DECLINED'),
  body('note').optional().trim().isLength({ max: 500 }),
  validate,
  appointmentController.respondPartsHoldConsent
);

module.exports = router;
