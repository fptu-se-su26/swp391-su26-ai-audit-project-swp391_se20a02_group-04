const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer is required']
  },
  staff_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  service_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service is required']
  },
  appointment_date: {
    type: Date,
    required: [true, 'Appointment date is required']
  },
  start_time: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
  },
  end_time: {
    type: String,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
  },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
    default: 'PENDING'
  },
  vehicle_info: {
    brand: {
      type: String,
      trim: true
    },
    model: {
      type: String,
      trim: true
    },
    year: {
      type: Number
    },
    license_plate: {
      type: String,
      trim: true,
      uppercase: true
    }
  },
  customer_notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  staff_notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Staff notes cannot exceed 1000 characters']
  },
  cancellation_reason: {
    type: String,
    trim: true
  },
  cancelled_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelled_at: {
    type: Date
  },
  completed_at: {
    type: Date
  },
  estimated_duration: {
    type: Number, // in minutes
    default: 60
  },
  actual_duration: {
    type: Number // in minutes
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes for performance
appointmentSchema.index({ customer_id: 1 });
appointmentSchema.index({ staff_id: 1 });
appointmentSchema.index({ appointment_date: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ appointment_date: 1, status: 1 });

// Virtual for full appointment datetime
appointmentSchema.virtual('full_datetime').get(function() {
  if (!this.appointment_date || !this.start_time) return null;
  const [hours, minutes] = this.start_time.split(':');
  const date = new Date(this.appointment_date);
  date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return date;
});

// Method to check if appointment can be cancelled
appointmentSchema.methods.canBeCancelled = function() {
  return ['PENDING', 'CONFIRMED'].includes(this.status);
};

// Method to check if appointment can be modified
appointmentSchema.methods.canBeModified = function() {
  return ['PENDING', 'CONFIRMED'].includes(this.status);
};

const Appointment = mongoose.model('Appointment', appointmentSchema, 'appointments');

module.exports = Appointment;
