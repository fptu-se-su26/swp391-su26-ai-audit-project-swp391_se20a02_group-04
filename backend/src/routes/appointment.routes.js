const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointment.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  appointmentIdValidation,
  cancelAppointmentValidation,
  createAppointmentValidation,
  listCustomerAppointmentsValidation,
  validate,
  validateAllowedBodyFields,
  validateAllowedQueryFields
} = require('../middleware/validator.middleware');

const createAppointmentFields = [
  'service_type',
  'service_package',
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

router.use(authenticate, authorize('CUSTOMER'));

/**
 * @route   POST /api/appointments
 * @desc    Create appointment as customer
 * @access  Private - CUSTOMER
 */
router.post(
  '/',
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

module.exports = router;
