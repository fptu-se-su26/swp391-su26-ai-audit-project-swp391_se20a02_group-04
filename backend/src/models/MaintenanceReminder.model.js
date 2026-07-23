const mongoose = require('mongoose');

const maintenanceReminderSchema = new mongoose.Schema({
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appointment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  service_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  service_name: {
    type: String,
    trim: true,
    required: true
  },
  due_date: {
    type: String,
    required: true,
    match: [/^\d{4}-\d{2}-\d{2}$/, 'due_date must use YYYY-MM-DD']
  },
  reminder_days: {
    type: Number,
    min: 0,
    default: 0
  },
  reminder_mileage: {
    type: Number,
    min: 0,
    default: 0
  },
  vehicle_snapshot: {
    brand: String,
    model: String,
    license_plate: String,
    odometer: Number
  },
  status: {
    type: String,
    enum: ['PENDING', 'SENT', 'FAILED', 'SKIPPED'],
    default: 'PENDING',
    uppercase: true
  },
  channel: {
    type: String,
    enum: ['EMAIL', 'IN_APP', 'BOTH', 'NONE'],
    default: 'BOTH'
  },
  email_sent: {
    type: Boolean,
    default: false
  },
  notification_sent: {
    type: Boolean,
    default: false
  },
  sent_at: {
    type: Date,
    default: null
  },
  error_message: {
    type: String,
    trim: true,
    default: null
  },
  triggered_by: {
    type: String,
    enum: ['CRON', 'MANUAL'],
    default: 'CRON'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

maintenanceReminderSchema.index({ appointment_id: 1 }, { unique: true });
maintenanceReminderSchema.index({ customer_id: 1, due_date: -1 });
maintenanceReminderSchema.index({ status: 1, due_date: 1 });
maintenanceReminderSchema.index({ service_id: 1, due_date: -1 });

module.exports = mongoose.model('MaintenanceReminder', maintenanceReminderSchema, 'maintenance_reminders');
