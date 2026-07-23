const {
  processDueMaintenanceReminders,
  findDueMaintenanceCandidates,
  listMaintenanceReminders,
  toLocalDateString
} = require('../services/maintenanceReminder.service');

/**
 * GET /api/admin/reminders
 * List reminder send history
 */
const listReminders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const status = req.query.status || '';

    const data = await listMaintenanceReminders({ status, page, limit });

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/reminders/due
 * Preview customers currently due (dry-run candidates)
 */
const listDueReminders = async (req, res, next) => {
  try {
    const lookbackDays = Number(req.query.lookback_days || process.env.REMINDER_LOOKBACK_DAYS || 7);
    const today = toLocalDateString();
    const candidates = await findDueMaintenanceCandidates({ today, lookbackDays });

    res.status(200).json({
      success: true,
      data: {
        today,
        lookback_days: lookbackDays,
        due_count: candidates.length,
        items: candidates.map((item) => ({
          appointment_id: item.appointment._id,
          appointment_code: item.appointment.appointment_code,
          customer: {
            id: item.customer._id,
            full_name: item.customer.full_name,
            email: item.customer.email,
            phone: item.customer.phone
          },
          service_name: item.service.service_name,
          service_id: item.service._id,
          completed_date: item.completedDate,
          due_date: item.dueDate,
          reminder_days: item.reminderDays,
          reminder_mileage: item.reminderMileage,
          vehicle: item.vehicle
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/reminders/run
 * Manually trigger reminder job
 * body: { dry_run?: boolean, lookback_days?: number }
 */
const runReminders = async (req, res, next) => {
  try {
    const dryRun = Boolean(req.body?.dry_run);
    const lookbackDays = Number(
      req.body?.lookback_days || process.env.REMINDER_LOOKBACK_DAYS || 7
    );

    const result = await processDueMaintenanceReminders({
      triggeredBy: 'MANUAL',
      lookbackDays,
      dryRun
    });

    res.status(200).json({
      success: true,
      message: dryRun
        ? `Preview: ${result.due_count} khách đến hạn nhắc`
        : `Đã xử lý: gửi ${result.sent}, lỗi ${result.failed}, bỏ qua ${result.skipped}`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listReminders,
  listDueReminders,
  runReminders
};
