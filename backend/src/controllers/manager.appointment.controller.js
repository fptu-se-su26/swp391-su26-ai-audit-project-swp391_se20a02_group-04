const adminAppointmentController = require('./admin.appointment.controller');

/**
 * Manager Appointment Controller
 * Delegates core appointment management database operations to the shared controllers,
 * keeping the codebase DRY while cleanly separating routing entry points.
 */
module.exports = {
  getAllAppointments: adminAppointmentController.getAllAppointments,
  getAppointmentById: adminAppointmentController.getAppointmentById,
  updateAppointment: adminAppointmentController.updateAppointment,
  updateAppointmentStatus: adminAppointmentController.updateAppointmentStatus,
  cancelAppointment: adminAppointmentController.cancelAppointment,
  assignStaff: adminAppointmentController.assignStaff,
  assignAppointmentHandler: adminAppointmentController.assignAppointmentHandler,
  startAppointmentHandler: adminAppointmentController.startAppointmentHandler,
  completeAppointmentHandler: adminAppointmentController.completeAppointmentHandler,
  getTechnicians: adminAppointmentController.getTechnicians,
  getTechnicianAvailability: adminAppointmentController.getTechnicianAvailability,
  getRepairBays: adminAppointmentController.getRepairBays,
  createRepairBay: adminAppointmentController.createRepairBay,
  updateRepairBay: adminAppointmentController.updateRepairBay,
  deleteRepairBay: adminAppointmentController.deleteRepairBay,
  getRepairBayAvailability: adminAppointmentController.getRepairBayAvailability,
  getAppointmentStatistics: adminAppointmentController.getAppointmentStatistics,
  getAppointmentCalendar: adminAppointmentController.getAppointmentCalendar,
  recordPartsHoldContactResult: adminAppointmentController.recordPartsHoldContactResult,
  notifyPartsHoldCustomer: adminAppointmentController.notifyPartsHoldCustomer,
  markPartsReady: adminAppointmentController.markPartsReady
};
