const Appointment = require('../models/Appointment.model');
const Service = require('../models/Service.model');
const User = require('../models/User.model');
const Notification = require('../models/Notification.model');
const MaintenanceReminder = require('../models/MaintenanceReminder.model');
const { sendMaintenanceReminderEmail } = require('../utils/email.util');

function toLocalDateString(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function addDaysToDateString(dateStr, days) {
  const date = new Date(`${dateStr}T12:00:00`);
  date.setDate(date.getDate() + Number(days || 0));
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function getCompletedDate(appointment) {
  if (appointment.completed_at) {
    return toLocalDateString(new Date(appointment.completed_at));
  }
  return String(appointment.appointment_date || '').slice(0, 10);
}

function buildVehicleSnapshot(appointment) {
  const vehicle = appointment.vehicle || appointment.vehicle_info || {};
  return {
    brand: vehicle.brand || '',
    model: vehicle.model || '',
    license_plate: vehicle.license_plate || '',
    odometer: typeof vehicle.odometer === 'number' ? vehicle.odometer : null
  };
}

/**
 * Find completed appointments that are due for maintenance reminder.
 * Uses Service.reminder_days from the linked service catalog.
 */
async function findDueMaintenanceCandidates({ today = toLocalDateString(), lookbackDays = 7 } = {}) {
  const services = await Service.find({
    is_active: true,
    reminder_enabled: true,
    reminder_days: { $gt: 0 }
  }).select('service_name reminder_days reminder_mileage category');

  if (!services.length) return [];

  const serviceMap = new Map(services.map((service) => [String(service._id), service]));
  const serviceIds = services.map((service) => service._id);
  const maxReminderDays = Math.max(...services.map((service) => Number(service.reminder_days) || 0));
  const oldestCompletion = addDaysToDateString(today, -(maxReminderDays + lookbackDays + 1));

  const appointments = await Appointment.find({
    status: 'COMPLETED',
    service_id: { $in: serviceIds },
    $or: [
      { completed_at: { $gte: new Date(`${oldestCompletion}T00:00:00.000Z`) } },
      {
        completed_at: null,
        appointment_date: { $gte: oldestCompletion }
      }
    ]
  })
    .populate('customer_id', 'full_name email phone is_active')
    .populate('service_id', 'service_name reminder_days reminder_mileage reminder_enabled')
    .sort({ completed_at: -1, appointment_date: -1 });

  const alreadySent = await MaintenanceReminder.find({
    appointment_id: { $in: appointments.map((row) => row._id) },
    status: 'SENT'
  }).select('appointment_id');
  const sentSet = new Set(alreadySent.map((row) => String(row.appointment_id)));

  // Keep only the latest completed appointment per customer+service
  const latestByCustomerService = new Map();
  for (const appointment of appointments) {
    const customerId = appointment.customer_id?._id || appointment.customer_id;
    const serviceId = appointment.service_id?._id || appointment.service_id;
    if (!customerId || !serviceId) continue;
    const key = `${customerId}:${serviceId}`;
    if (!latestByCustomerService.has(key)) {
      latestByCustomerService.set(key, appointment);
    }
  }

  const lookbackStart = addDaysToDateString(today, -lookbackDays);
  const candidates = [];

  for (const appointment of latestByCustomerService.values()) {
    const serviceId = String(appointment.service_id?._id || appointment.service_id);
    const service = serviceMap.get(serviceId) || appointment.service_id;
    if (!service || sentSet.has(String(appointment._id))) continue;

    const customer = appointment.customer_id;
    if (!customer || customer.is_active === false || !customer.email) continue;

    const completedDate = getCompletedDate(appointment);
    if (!completedDate) continue;

    const reminderDays = Number(service.reminder_days || 0);
    const dueDate = addDaysToDateString(completedDate, reminderDays);
    if (dueDate > today || dueDate < lookbackStart) continue;

    candidates.push({
      appointment,
      customer,
      service,
      completedDate,
      dueDate,
      reminderDays,
      reminderMileage: Number(service.reminder_mileage || 0),
      vehicle: buildVehicleSnapshot(appointment)
    });
  }

  return candidates;
}

async function sendOneReminder(candidate, { triggeredBy = 'CRON' } = {}) {
  const {
    appointment,
    customer,
    service,
    dueDate,
    reminderDays,
    reminderMileage,
    vehicle
  } = candidate;

  const existing = await MaintenanceReminder.findOne({ appointment_id: appointment._id });
  if (existing?.status === 'SENT') {
    return { skipped: true, reason: 'already_sent', reminder: existing };
  }

  const serviceName = service.service_name || appointment.service?.name || 'dịch vụ bảo dưỡng';
  const bookingUrl = `${(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')}/booking`;
  const title = 'Nhắc bảo dưỡng định kỳ';
  const message = [
    `Đã khoảng ${reminderDays} ngày kể từ lần ${serviceName}.`,
    vehicle.license_plate ? `Xe ${[vehicle.brand, vehicle.model].filter(Boolean).join(' ')} · ${vehicle.license_plate}.` : '',
    reminderMileage ? `Khuyến nghị kiểm tra sau khoảng ${reminderMileage.toLocaleString('vi-VN')} km.` : '',
    'Hãy đặt lịch để garage kiểm tra và bảo dưỡng kịp thời.'
  ].filter(Boolean).join(' ');

  let emailSent = false;
  let notificationSent = false;
  let errorMessage = null;

  try {
    emailSent = await sendMaintenanceReminderEmail(customer.email, customer.full_name, {
      service_name: serviceName,
      reminder_days: reminderDays,
      reminder_mileage: reminderMileage,
      due_date: dueDate,
      vehicle,
      booking_url: bookingUrl,
      completed_date: candidate.completedDate
    });
  } catch (error) {
    errorMessage = error.message || 'Failed to send reminder email';
  }

  try {
    await Notification.create({
      user_id: customer._id,
      appointment_id: appointment._id,
      type: 'SYSTEM',
      title,
      message,
      metadata: {
        kind: 'MAINTENANCE_REMINDER',
        service_id: service._id,
        due_date: dueDate,
        reminder_days: reminderDays,
        reminder_mileage: reminderMileage,
        booking_url: bookingUrl
      }
    });
    notificationSent = true;
  } catch (error) {
    errorMessage = [errorMessage, error.message].filter(Boolean).join(' | ');
  }

  const status = emailSent || notificationSent ? 'SENT' : 'FAILED';
  const channel = emailSent && notificationSent ? 'BOTH' : emailSent ? 'EMAIL' : notificationSent ? 'IN_APP' : 'NONE';

  const payload = {
    customer_id: customer._id,
    appointment_id: appointment._id,
    service_id: service._id,
    service_name: serviceName,
    due_date: dueDate,
    reminder_days: reminderDays,
    reminder_mileage: reminderMileage,
    vehicle_snapshot: vehicle,
    status,
    channel,
    email_sent: emailSent,
    notification_sent: notificationSent,
    sent_at: status === 'SENT' ? new Date() : null,
    error_message: errorMessage,
    triggered_by: triggeredBy
  };

  let reminder;
  if (existing) {
    Object.assign(existing, payload);
    reminder = await existing.save();
  } else {
    reminder = await MaintenanceReminder.create(payload);
  }

  return { skipped: false, reminder, emailSent, notificationSent };
}

async function processDueMaintenanceReminders({
  triggeredBy = 'CRON',
  lookbackDays = Number(process.env.REMINDER_LOOKBACK_DAYS || 7),
  dryRun = false
} = {}) {
  const today = toLocalDateString();
  const candidates = await findDueMaintenanceCandidates({ today, lookbackDays });

  if (dryRun) {
    return {
      today,
      lookbackDays,
      due_count: candidates.length,
      sent: 0,
      failed: 0,
      skipped: 0,
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
    };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const results = [];

  for (const candidate of candidates) {
    try {
      const result = await sendOneReminder(candidate, { triggeredBy });
      if (result.skipped) {
        skipped += 1;
      } else if (result.reminder?.status === 'SENT') {
        sent += 1;
      } else {
        failed += 1;
      }
      results.push(result);
    } catch (error) {
      failed += 1;
      results.push({ error: error.message, appointment_id: candidate.appointment._id });
    }
  }

  return {
    today,
    lookbackDays,
    due_count: candidates.length,
    sent,
    failed,
    skipped,
    results
  };
}

async function listMaintenanceReminders({ status = '', page = 1, limit = 20 } = {}) {
  const query = {};
  if (status) query.status = String(status).toUpperCase();

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    MaintenanceReminder.find(query)
      .populate('customer_id', 'full_name email phone')
      .populate('service_id', 'service_name category')
      .populate('appointment_id', 'appointment_code completed_at appointment_date')
      .sort({ due_date: -1, created_at: -1 })
      .skip(skip)
      .limit(limit),
    MaintenanceReminder.countDocuments(query)
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1
    }
  };
}

module.exports = {
  toLocalDateString,
  findDueMaintenanceCandidates,
  processDueMaintenanceReminders,
  listMaintenanceReminders
};
